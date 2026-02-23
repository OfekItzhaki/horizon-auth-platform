import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PRISMA_CLIENT_TOKEN } from '../common/constants';

@Injectable()
export class TwoFactorService {
  constructor(@Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient) {}

  /**
   * Generate TOTP secret and QR code for 2FA setup
   */
  async generateTotpSecret(
    userId: string,
    issuer: string = 'HorizonAuth',
  ): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate TOTP secret
    const secret = await generateSecret();

    // Create otpauth URL
    const otpauthUrl = generateURI({
      issuer,
      label: user.email,
      secret,
    });

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Store the secret (not yet enabled)
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        totpSecret: secret,
        enabled: false,
      },
      update: {
        totpSecret: secret,
        enabled: false,
      },
    });

    return { secret, qrCode };
  }

  /**
   * Verify TOTP code during setup
   */
  async verifyTotpSetup(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return false;
    }

    const result = await verify({
      token: code,
      secret: twoFactorAuth.totpSecret,
    });

    return result.valid;
  }

  /**
   * Enable 2FA and generate backup codes
   */
  async enableTwoFactor(userId: string): Promise<{ backupCodes: string[] }> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new Error('2FA setup not initiated');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes before storing
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, 10),
        used: false,
      })),
    );

    // Enable 2FA and store backup codes in transaction
    await this.prisma.$transaction([
      this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          enabled: true,
          enabledAt: new Date(),
        },
      }),
      this.prisma.backupCode.createMany({
        data: hashedCodes,
      }),
    ]);

    return { backupCodes };
  }

  /**
   * Disable 2FA and cleanup
   */
  async disableTwoFactor(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.twoFactorAuth.delete({
        where: { userId },
      }),
      this.prisma.backupCode.deleteMany({
        where: { userId },
      }),
    ]);
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTotpCode(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId, enabled: true },
    });

    if (!twoFactorAuth) {
      return false;
    }

    const result = await verify({
      token: code,
      secret: twoFactorAuth.totpSecret,
    });

    return result.valid;
  }

  /**
   * Verify backup code during login
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCodes = await this.prisma.backupCode.findMany({
      where: { userId, used: false },
    });

    for (const backupCode of backupCodes) {
      const isValid = await bcrypt.compare(code, backupCode.codeHash);
      if (isValid) {
        // Mark as used
        await this.prisma.backupCode.update({
          where: { id: backupCode.id },
          data: {
            used: true,
            usedAt: new Date(),
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId, enabled: true },
    });

    if (!twoFactorAuth) {
      throw new Error('2FA not enabled');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes before storing
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, 10),
        used: false,
      })),
    );

    // Delete old codes and create new ones in transaction
    await this.prisma.$transaction([
      this.prisma.backupCode.deleteMany({
        where: { userId },
      }),
      this.prisma.backupCode.createMany({
        data: hashedCodes,
      }),
    ]);

    return backupCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId, enabled: true },
    });

    return !!twoFactorAuth;
  }

  /**
   * Generate 10 backup codes (8 alphanumeric characters each)
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars

    for (let i = 0; i < 10; i++) {
      let code = '';
      const bytes = crypto.randomBytes(8);

      for (let j = 0; j < 8; j++) {
        code += chars[bytes[j] % chars.length];
      }

      // Format as XXXX-XXXX for readability
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
  }
}
