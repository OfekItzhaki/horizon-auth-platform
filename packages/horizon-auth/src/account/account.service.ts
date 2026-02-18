import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, reason?: string): Promise<void> {
    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    // Deactivate account
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deactivationReason: reason,
      },
    });
  }

  /**
   * Reactivate user account
   */
  async reactivateAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        deactivationReason: null,
      },
    });
  }

  /**
   * Reactivate account by email (validates user exists and is deactivated)
   */
  async reactivateAccountByEmail(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    await this.reactivateAccount(user.id);
    return user.id;
  }

  /**
   * Delete user account with cascade deletion
   */
  async deleteAccount(userId: string): Promise<void> {
    // Prisma will handle cascade deletion based on schema
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Check if account is active
   */
  async isAccountActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    return user?.isActive ?? false;
  }
}
