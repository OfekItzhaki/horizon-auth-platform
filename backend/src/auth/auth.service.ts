import {
    Injectable,
    Logger,
    UnauthorizedException,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
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
        try {
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
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            this.logger.error(`Error in validateUser: ${error}`);
            throw error;
        }
    }

    async login(email: string, password: string) {
        const user = await this.validateUser(email, password);
        return this.createAuthSession(user);
    }

    async createAuthSession(user: any, parentTokenId?: string) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = await this.generateRefreshToken(user.id, parentTokenId);

        return {
            accessToken,
            refreshToken,
            user,
        };
    }

    async generateRefreshToken(userId: string, parentTokenId?: string): Promise<string> {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.refreshToken.create({
            data: {
                token: createHash('sha256').update(token).digest('hex'),
                userId,
                expiresAt,
                parentTokenId,
            },
        });

        return this.jwtService.sign(
            { jti: token, sub: userId },
            {
                expiresIn: '7d',
            },
        );
    }

    async refreshAccessToken(token: string) {
        try {
            const payload = this.jwtService.verify<JwtPayload>(token);

            if (!payload.sub || !payload.jti) {
                throw new UnauthorizedException('Invalid payload structure');
            }

            const userId = payload.sub;
            const jti = payload.jti;
            const tokenHash = createHash('sha256').update(jti).digest('hex');

            const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
                where: {
                    userId,
                    token: tokenHash,
                },
            });

            if (!refreshTokenRecord) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Reuse Detection: If token is already revoked, it might be a stolen token
            if (refreshTokenRecord.revokedAt) {
                this.logger.warn(`Potential refresh token reuse detected for user ${userId}. Revoking all tokens.`);
                await this.logout(userId);
                throw new UnauthorizedException('Refresh token already used or revoked');
            }

            if (refreshTokenRecord.expiresAt < new Date()) {
                throw new UnauthorizedException('Refresh token expired');
            }

            // Revoke current token
            await this.prisma.refreshToken.update({
                where: { id: refreshTokenRecord.id },
                data: { revokedAt: new Date() },
            });

            const user = await this.usersService.findById(userId);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Create new session, passing the current token's ID as parent
            return this.createAuthSession(user, refreshTokenRecord.id);
        } catch (e: unknown) {
            if (e instanceof UnauthorizedException) throw e;
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    async logout(userId: string) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    async registerStart(email: string) {
        const user = await this.usersService.initUser(email);
        await this.usersService.sendOtp(
            user.email,
            user.emailVerificationOtp!,
            user.name || undefined,
        );
        return { message: 'OTP sent' };
    }

    async resendVerification(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (user.emailVerified) {
            throw new BadRequestException('Email already verified');
        }

        // Re-run initUser logic to refresh OTP and expiry
        const updatedUser = await this.usersService.initUser(email);
        await this.usersService.sendOtp(
            updatedUser.email,
            updatedUser.emailVerificationOtp!,
            updatedUser.name || undefined,
        );
        return { message: 'Verification email resent' };
    }

    async registerVerify(email: string, otp: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user || user.emailVerificationOtp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }
        const now = new Date();
        if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < now) {
            throw new BadRequestException('OTP expired');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            purpose: 'registration',
        };
        return {
            registrationToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
        };
    }

    async registerFinish(token: string, password: string) {
        try {
            const payload = this.jwtService.verify<{
                sub: string;
                purpose: string;
                email: string;
            }>(token);
            if (payload.purpose !== 'registration') {
                throw new BadRequestException('Invalid token');
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await this.usersService.setPassword(payload.sub, passwordHash);

            return this.login(user.email, password);
        } catch (e: unknown) {
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException('Invalid or expired registration token');
        }
    }

    async forgotPassword(email: string) {
        return this.usersService.generatePasswordResetOtp(email);
    }

    async verifyResetOtp(email: string, otp: string) {
        const user = await this.usersService.verifyPasswordResetOtp(email, otp);

        const payload = {
            sub: user.id,
            email: user.email,
            purpose: 'password_reset',
        };

        return {
            resetToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
        };
    }

    async resetPassword(email: string, token: string, password: string) {
        try {
            const payload = this.jwtService.verify<{
                sub: string;
                purpose: string;
                email: string;
            }>(token);

            if (payload.purpose !== 'password_reset' || payload.email !== email) {
                throw new BadRequestException('Invalid token');
            }

            const passwordHash = await bcrypt.hash(password, 10);
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: {
                    passwordHash,
                    passwordResetOtp: null,
                    passwordResetExpiresAt: null,
                },
            });

            return { message: 'Password reset successful' };
        } catch (e: unknown) {
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException('Invalid or expired reset token');
        }
    }

    async verifyTurnstile(token: string) {
        const secretKey = process.env.TURNSTILE_SECRET_KEY;
        if (!secretKey) return;

        try {
            const params = new URLSearchParams();
            params.append('secret', secretKey);
            params.append('response', token);

            const response = await axios.post(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 5000,
                },
            );

            const data = response.data as { success: boolean };
            if (!data.success) {
                throw new ForbiddenException('CAPTCHA verification failed');
            }
        } catch (error) {
            throw new ForbiddenException('CAPTCHA verification failed');
        }
    }
}
