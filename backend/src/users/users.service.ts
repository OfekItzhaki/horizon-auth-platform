import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type SanitizedUser = Omit<User, 'passwordHash' | 'emailVerificationOtp'>;

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    private sanitizeUser<
        T extends {
            passwordHash?: string | null;
            emailVerificationOtp?: string | null;
        },
    >(user: T | null): Omit<T, 'passwordHash' | 'emailVerificationOtp'> | null {
        if (!user) {
            return null;
        }
        const { passwordHash, emailVerificationOtp, ...rest } = user;
        return rest;
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            this.logger.log(`Finding user by email: ${email}`);
            const user = await this.prisma.user.findFirst({
                where: {
                    email,
                    deletedAt: null,
                },
            });
            return user;
        } catch (error: unknown) {
            this.logger.error(`Error finding user by email=${email}`);
            throw error;
        }
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {
                id,
                deletedAt: null,
            },
        });
    }

    async getUser(
        id: string,
        requestingUserId: string,
    ): Promise<SanitizedUser> {
        if (id !== requestingUserId) {
            throw new ForbiddenException('You can only access your own profile');
        }

        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const result = this.sanitizeUser(user);
        if (!result) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return result as SanitizedUser;
    }

    async initUser(email: string): Promise<User> {
        const existingUser = await this.findByEmail(email);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        if (existingUser) {
            if (existingUser.emailVerified) {
                throw new BadRequestException('Email is already registered and verified');
            }

            return this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    emailVerificationOtp: otp,
                    emailVerificationExpiresAt: expiresAt,
                    emailVerificationSentAt: new Date(),
                    emailVerificationAttempts: 0,
                },
            });
        }

        const user = await this.prisma.user.create({
            data: {
                email,
                emailVerificationOtp: otp,
                emailVerificationExpiresAt: expiresAt,
                emailVerificationSentAt: new Date(),
                emailVerificationAttempts: 0,
                name: email.split('@')[0],
            },
        });

        return user;
    }

    async sendOtp(email: string, otp: string, name?: string) {
        await this.emailService.sendVerificationEmail(email, otp, name);
    }

    async generatePasswordResetOtp(email: string) {
        const user = await this.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetOtp: otp,
                passwordResetExpiresAt: expiresAt,
            },
        });

        await this.emailService.sendVerificationEmail(email, otp, user.name || undefined);

        return { message: 'Password reset OTP sent' };
    }

    async verifyPasswordResetOtp(email: string, otp: string) {
        const user = await this.findByEmail(email);
        if (!user || user.passwordResetOtp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }

        const now = new Date();
        if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < now) {
            throw new BadRequestException('OTP expired');
        }

        return user;
    }

    async setPassword(userId: string, passwordHash: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                emailVerified: true,
                emailVerificationOtp: null,
                emailVerificationExpiresAt: null,
            },
        });
    }

    async verifyEmail(token: string): Promise<User> {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationOtp: token,
                emailVerificationExpiresAt: { gt: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        return this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationOtp: null,
                emailVerificationExpiresAt: null,
            },
        });
    }

    async createUser(data: CreateUserDto): Promise<SanitizedUser> {
        const existing = await this.findByEmail(data.email);
        if (existing) {
            throw new BadRequestException('User already exists');
        }

        const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name || data.email.split('@')[0],
                passwordHash,
                emailVerified: false,
            },
        });

        return this.sanitizeUser(user) as SanitizedUser;
    }

    async updateUser(
        id: string,
        data: UpdateUserDto,
        requestingUserId: string,
    ): Promise<SanitizedUser> {
        await this.getUser(id, requestingUserId);

        const updateData: Prisma.UserUpdateInput = {};
        if (data.email !== undefined) updateData.email = data.email;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
        if (data.password !== undefined) {
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        if (data.notificationFrequency !== undefined) {
            updateData.notificationFrequency = data.notificationFrequency;
        }

        const user = await this.prisma.user.update({
            where: { id },
            data: updateData,
        });

        return this.sanitizeUser(user) as SanitizedUser;
    }

    async deleteUser(id: string, requestingUserId: string): Promise<SanitizedUser> {
        await this.getUser(id, requestingUserId);

        const user = await this.prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return this.sanitizeUser(user) as SanitizedUser;
    }
}
