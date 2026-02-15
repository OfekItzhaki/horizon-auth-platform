import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  private sanitizeUser<T extends { passwordHash?: string | null; emailVerificationOtp?: string | null }>(user: T | null) {
    if (!user) return null;
    const { passwordHash, emailVerificationOtp, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async findUserById(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async createUser(data: any): Promise<User> {
    const { email, password, name } = data;
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('User already exists');

    return this.prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
      },
    });
  }

  async initUser(email: string): Promise<User> {
    const existingUser = await this.findByEmail(email);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    if (existingUser) {
      if (existingUser.emailVerified) throw new BadRequestException('Email already registered');
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerificationOtp: otp, emailVerificationExpiresAt: expiresAt },
      });
    }

    return this.prisma.user.create({
      data: {
        email,
        emailVerificationOtp: otp,
        emailVerificationExpiresAt: expiresAt,
        name: email.split('@')[0],
      },
    });
  }

  async sendOtp(email: string, otp: string, name?: string) {
    await this.emailService.sendVerificationEmail(email, otp, name);
  }

  async generatePasswordResetOtp(email: string) {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetOtp: otp, passwordResetExpiresAt: expiresAt },
    });

    await this.sendOtp(email, otp, user.name || undefined);
    return { message: 'OTP sent' };
  }

  async verifyPasswordResetOtp(email: string, otp: string) {
    const user = await this.findByEmail(email);
    if (!user || user.passwordResetOtp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
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

  async updateUser(id: string, data: UpdateUserDto): Promise<any> {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.name = data.name;
    if (data.profilePicture) updateData.profilePicture = data.profilePicture;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.notificationFrequency) updateData.notificationFrequency = data.notificationFrequency;
    if (data.trashRetentionDays) updateData.trashRetentionDays = data.trashRetentionDays;

    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    return this.sanitizeUser(user);
  }

  async searchUsers(email: string) {
    const users = await this.prisma.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
        deletedAt: null,
      },
      take: 10,
    });
    return users.map(u => this.sanitizeUser(u));
  }
}
