import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TokenService } from '../auth/services/token.service';
import { SocialAccountAlreadyLinkedException } from '../common/exceptions';

export interface SocialProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  displayName?: string;
  profileData?: any;
}

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticate user with Google OAuth2
   * @param code - Authorization code from Google
   * @returns User and tokens
   */
  async authenticateWithGoogle(profile: SocialProfile): Promise<AuthResponse> {
    return this.authenticateWithSocialProvider(profile);
  }

  /**
   * Authenticate user with Facebook OAuth2
   * @param code - Authorization code from Facebook
   * @returns User and tokens
   */
  async authenticateWithFacebook(profile: SocialProfile): Promise<AuthResponse> {
    return this.authenticateWithSocialProvider(profile);
  }

  /**
   * Generic social authentication handler
   * @param profile - Social profile information
   * @returns User and tokens
   */
  private async authenticateWithSocialProvider(profile: SocialProfile): Promise<AuthResponse> {
    // Try to find existing social account
    let user = await this.findUserBySocialAccount(profile.provider, profile.providerId);

    if (user) {
      // User exists with this social account - login
      return this.generateAuthResponse(user);
    }

    // Check if user exists with this email
    const existingUser = await this.usersService.findByEmail(profile.email);

    if (existingUser) {
      // Link social account to existing user
      await this.linkSocialAccount(existingUser.id, profile.provider, profile);
      return this.generateAuthResponse(existingUser);
    }

    // Create new user from social profile
    user = await this.createUserFromSocialProfile(profile);
    return this.generateAuthResponse(user);
  }

  /**
   * Link a social account to an existing user
   * @param userId - User ID
   * @param provider - Social provider name
   * @param profile - Social profile information
   */
  async linkSocialAccount(
    userId: string,
    provider: string,
    profile: SocialProfile,
  ): Promise<void> {
    // Check if this social account is already linked to another user
    const existingLink = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existingLink && existingLink.userId !== userId) {
      throw new SocialAccountAlreadyLinkedException(provider);
    }

    if (existingLink) {
      // Already linked to this user, just update profile data
      await this.prisma.socialAccount.update({
        where: { id: existingLink.id },
        data: {
          email: profile.email,
          displayName: profile.displayName,
          profileData: profile.profileData,
        },
      });
      return;
    }

    // Create new social account link
    await this.prisma.socialAccount.create({
      data: {
        userId,
        provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        profileData: profile.profileData,
      },
    });
  }

  /**
   * Find user by social account
   * @param provider - Social provider name
   * @param providerId - Provider's user ID
   * @returns User or null
   */
  async findUserBySocialAccount(provider: string, providerId: string) {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: true,
      },
    });

    return socialAccount?.user || null;
  }

  /**
   * Create a new user from social profile
   * @param profile - Social profile information
   * @returns Created user
   */
  private async createUserFromSocialProfile(profile: SocialProfile) {
    // Create user without password (social login only)
    const user = await this.usersService.create(profile.email, null);

    // Update full name if available
    if (profile.displayName) {
      await this.usersService.update(user.id, { fullName: profile.displayName });
    }

    // Link social account
    await this.linkSocialAccount(user.id, profile.provider, profile);

    return user;
  }

  /**
   * Generate authentication response with tokens
   * @param user - User object
   * @returns Auth response with tokens
   */
  private async generateAuthResponse(user: any): Promise<AuthResponse> {
    // Generate access token
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });

    // Generate refresh token
    const { token: refreshToken } = this.tokenService.generateRefreshTokenJWT(user.id);
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
}
