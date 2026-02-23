import { Injectable, UnauthorizedException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { UsersService, SafeUser } from '../users/users.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { RedisService } from '../redis/redis.service';
import { PrismaClient } from '@prisma/client';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { DeviceService } from '../devices/device.service';
import { EmailService } from './services/email.service';
import { AccountDeactivatedException } from '../common/exceptions';
import { PRISMA_CLIENT_TOKEN } from '../common/constants';

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorRequiredResult {
  requiresTwoFactor: true;
  userId: string;
}

@Injectable()
export class AuthService {
  private readonly prisma: PrismaClient;

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    @Inject(PRISMA_CLIENT_TOKEN) prisma: PrismaClient,
    @Optional() private readonly twoFactorService?: TwoFactorService,
    @Optional() private readonly deviceService?: DeviceService,
    @Optional() private readonly emailService?: EmailService,
  ) {
    this.prisma = prisma;
    console.log('🔍 AuthService constructor - prisma type:', prisma?.constructor?.name);
    console.log('🔍 AuthService constructor - prisma defined:', !!prisma);
    console.log('🔍 AuthService constructor - this.prisma defined:', !!this.prisma);
    if (!this.prisma) {
      throw new Error(
        `PRISMA_CLIENT_TOKEN injection failed in AuthService. ` +
        `Token value: "${PRISMA_CLIENT_TOKEN}". ` +
        `Please ensure your application's PrismaModule is @Global() and provides PRISMA_CLIENT_TOKEN before HorizonAuthModule.`
      );
    }
  }

  /**
   * Register a new user
   * @param email - User email
   * @param password - User password
   * @param fullName - Optional full name
   * @param tenantId - Optional tenant ID
   * @returns Created user and tokens
   */
  async register(
    email: string,
    password: string,
    fullName?: string,
    tenantId?: string,
  ): Promise<AuthResult> {
    // Validate email format (done by DTO)
    // Validate password length (done by DTO)

    // Hash password with Argon2id
    const passwordHash = await this.passwordService.hash(password);

    // Create user
    const user = await this.usersService.create(email, passwordHash, tenantId);

    // Update full name if provided
    if (fullName) {
      await this.usersService.update(user.id, { fullName });
    }

    // Send email verification email if EmailService is available
    if (this.emailService && user.emailVerifyToken) {
      await this.emailService.sendEmailVerificationEmail(email, user.emailVerifyToken);
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });

    const { token: refreshToken, jti } = this.tokenService.generateRefreshTokenJWT(user.id);
    const hashedToken = this.tokenService.hashToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: this.usersService.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate user with email and password
   * @param email - User email
   * @param password - User password
   * @param deviceInfo - Optional device information (userAgent, ip, deviceName)
   * @returns User and tokens, or 2FA required response
   */
  async login(
    email: string,
    password: string,
    deviceInfo?: { userAgent?: string; ip?: string; deviceName?: string },
  ): Promise<AuthResult | TwoFactorRequiredResult> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AccountDeactivatedException(user.deactivationReason || undefined);
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled (only if TwoFactorService is available)
    const has2FA = this.twoFactorService 
      ? await this.twoFactorService.isTwoFactorEnabled(user.id)
      : false;
    if (has2FA) {
      // Return intermediate response requiring 2FA
      return {
        requiresTwoFactor: true,
        userId: user.id,
      };
    }

    // Track device if device management is enabled
    let deviceId: string | undefined;
    if (this.deviceService && deviceInfo) {
      const device = await this.deviceService.createOrUpdateDevice(user.id, {
        userAgent: deviceInfo.userAgent || '',
        ip: deviceInfo.ip,
        deviceName: deviceInfo.deviceName,
      });
      deviceId = device.id;
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });

    const { token: refreshToken, jti } = this.tokenService.generateRefreshTokenJWT(user.id);
    const hashedToken = this.tokenService.hashToken(refreshToken);

    // Store refresh token in database with device association
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt,
        deviceId, // Associate with device if available
      },
    });

    return {
      user: this.usersService.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify 2FA code and complete login
   * @param userId - User ID from initial login
   * @param code - TOTP code or backup code
   * @param deviceInfo - Optional device information (userAgent, ip, deviceName)
   * @returns User and tokens
   */
  async verifyTwoFactorLogin(
    userId: string,
    code: string,
    deviceInfo?: { userAgent?: string; ip?: string; deviceName?: string },
  ): Promise<AuthResult> {
    // Check if TwoFactorService is available
    if (!this.twoFactorService) {
      throw new UnauthorizedException('Two-factor authentication is not enabled');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    // Try TOTP first (6 digits)
    let isValid = false;
    if (code.length === 6) {
      isValid = await this.twoFactorService.verifyTotpCode(userId, code);
    }

    // Try backup code if TOTP failed (8-9 chars with optional dash)
    if (!isValid && code.length >= 8) {
      isValid = await this.twoFactorService.verifyBackupCode(userId, code);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Track device if device management is enabled
    let deviceId: string | undefined;
    if (this.deviceService && deviceInfo) {
      const device = await this.deviceService.createOrUpdateDevice(userId, {
        userAgent: deviceInfo.userAgent || '',
        ip: deviceInfo.ip,
        deviceName: deviceInfo.deviceName,
      });
      deviceId = device.id;
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });

    const { token: refreshToken, jti } = this.tokenService.generateRefreshTokenJWT(user.id);
    const hashedToken = this.tokenService.hashToken(refreshToken);

    // Store refresh token in database with device association
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt,
        deviceId, // Associate with device if available
      },
    });

    return {
      user: this.usersService.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token JWT
   * @returns New token pair
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    // Verify refresh token JWT
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    // Check if token is blacklisted
    const isBlacklisted = await this.redisService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Hash the token and check database
    const hashedToken = this.tokenService.hashToken(refreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { hashedToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      // Token reuse detected - revoke all user tokens
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Token reuse detected. All tokens have been revoked.');
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Mark old token as revoked
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    // Blacklist old token
    const ttl = this.tokenService.calculateTTL(tokenRecord.expiresAt);
    await this.redisService.blacklist(payload.jti, ttl);

    // Generate new tokens
    const user = tokenRecord.user;
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });

    const { token: newRefreshToken, jti: newJti } = this.tokenService.generateRefreshTokenJWT(user.id);
    const newHashedToken = this.tokenService.hashToken(newRefreshToken);

    // Store new refresh token with parent tracking
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        hashedToken: newHashedToken,
        userId: user.id,
        expiresAt: newExpiresAt,
        parentTokenId: tokenRecord.id,
        deviceId: tokenRecord.deviceId, // Preserve device association
      },
    });

    // Update device lastActiveAt if device management is enabled
    if (this.deviceService && tokenRecord.deviceId) {
      await this.deviceService.updateLastActive(tokenRecord.deviceId);
    }

    return {
      user: this.usersService.toSafeUser(user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user and revoke all tokens
   * @param userId - User ID
   */
  async logout(userId: string): Promise<void> {
    await this.revokeAllUserTokens(userId);
  }

  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    // Find all non-revoked tokens
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
      },
    });

    // Mark all as revoked in database
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    // Add all to Redis blacklist
    for (const token of tokens) {
      const ttl = this.tokenService.calculateTTL(token.expiresAt);
      if (ttl > 0) {
        // We need to extract JTI from the token, but we only have the hash
        // For now, we'll use the token ID as a proxy
        await this.redisService.blacklist(token.id, ttl);
      }
    }
  }

  /**
   * Initiate password reset flow
   * @param email - User email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const resetToken = await this.usersService.generateResetToken(email);
    
    // Send email if EmailService is available, otherwise log to console
    if (this.emailService) {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } else {
      // Fallback to console logging for backward compatibility
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }
  }

  /**
   * Complete password reset with magic link token
   * @param token - Reset token from email
   * @param newPassword - New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password length
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hash(newPassword);

    // Update password
    const user = await this.usersService.resetPassword(token, passwordHash);

    // Revoke all refresh tokens
    await this.revokeAllUserTokens(user.id);
  }

  /**
   * Verify email with token
   * @param token - Verification token
   */
  async verifyEmail(token: string): Promise<void> {
    await this.usersService.verifyEmail(token);
  }
}
