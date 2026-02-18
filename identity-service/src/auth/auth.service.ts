import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { createHash } from 'crypto';

interface JwtPayload {
  sub: string;
  email: string;
  purpose?: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.createAuthSession(user);
  }

  private async createAuthSession(user: any) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: createHash('sha256').update(token).digest('hex'),
        userId,
        expiresAt,
      },
    });

    return this.jwtService.sign(
      { jti: token, sub: userId },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      },
    );
  }

  async refreshAccessToken(token: string) {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    });

    const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const tokenHash = createHash('sha256').update(payload.jti).digest('hex');
    if (tokenHash !== refreshTokenRecord.token) {
      throw new UnauthorizedException('Token mismatch');
    }

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(payload.sub!);
    if (!user) throw new UnauthorizedException('User not found');

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.createAuthSession(safeUser);
  }

  async registerStart(email: string) {
    const user = await this.usersService.initUser(email);
    await this.usersService.sendOtp(user.email, user.emailVerificationOtp!, user.name || undefined);
    return { message: 'OTP sent' };
  }

  async registerVerify(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    return {
      registrationToken: this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: 'registration' },
        { expiresIn: '15m' },
      ),
    };
  }

  async registerFinish(token: string, password: string) {
    const payload = this.jwtService.verify<{ sub: string; purpose: string }>(token);
    if (payload.purpose !== 'registration') throw new BadRequestException('Invalid token');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.setPassword(payload.sub, passwordHash);
    return this.login(user.email, password);
  }

  async forgotPassword(email: string) {
    return this.usersService.generatePasswordResetOtp(email);
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.usersService.verifyPasswordResetOtp(email, otp);
    return {
      resetToken: this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: 'password_reset' },
        { expiresIn: '15m' },
      ),
    };
  }

  async resetPassword(email: string, token: string, password: string) {
    const payload = this.jwtService.verify<{ sub: string; purpose: string; email: string }>(token);
    if (payload.purpose !== 'password_reset' || payload.email !== email) {
      throw new BadRequestException('Invalid token');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash, passwordResetOtp: null, passwordResetExpiresAt: null },
    });
    return { message: 'Password reset successful' };
  }

  async verifyTurnstile(token: string) {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) return;

    try {
      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token);
      const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', params.toString());
      if (!response.data.success) throw new ForbiddenException('CAPTCHA verification failed');
    } catch (error) {
      throw new ForbiddenException('CAPTCHA verification failed');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
