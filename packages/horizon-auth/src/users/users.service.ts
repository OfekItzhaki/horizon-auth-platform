import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';

export type SafeUser = Omit<User, 'passwordHash' | 'emailVerifyToken' | 'resetToken' | 'resetTokenExpiry'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by email
   * @param email - User email
   * @returns User or null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { refreshTokens: true },
    });
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User or null
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { refreshTokens: true },
    });
  }

  /**
   * Create a new user
   * @param email - User email
   * @param passwordHash - Hashed password
   * @param tenantId - Optional tenant ID
   * @returns Created user
   */
  async create(
    email: string,
    passwordHash: string,
    tenantId?: string,
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerifyToken: randomUUID(),
        tenantId: tenantId || 'default',
        roles: ['user'],
      },
    });
  }

  /**
   * Update user
   * @param id - User ID
   * @param data - Update data
   * @returns Updated user
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Verify user email
   * @param token - Email verification token
   * @returns Updated user
   */
  async verifyEmail(token: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });
  }

  /**
   * Generate password reset token
   * @param email - User email
   * @returns Reset token
   */
  async generateResetToken(email: string): Promise<string> {
    const user = await this.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      throw new NotFoundException('If the email exists, a reset link will be sent');
    }

    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    return resetToken;
  }

  /**
   * Reset password with token
   * @param token - Reset token
   * @param newPasswordHash - New password hash
   * @returns Updated user
   */
  async resetPassword(token: string, newPasswordHash: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  /**
   * Convert User to SafeUser (remove sensitive fields)
   * @param user - User object
   * @returns SafeUser object
   */
  toSafeUser(user: User): SafeUser {
    const { passwordHash, emailVerifyToken, resetToken, resetTokenExpiry, ...safeUser } = user;
    return safeUser;
  }
}
