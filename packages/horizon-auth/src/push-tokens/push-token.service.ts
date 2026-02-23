import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';
import { PRISMA_CLIENT_TOKEN } from '../common/constants';

export interface PushTokenData {
  userId: string;
  deviceId: string;
  token: string;
  tokenType: 'FCM' | 'APNS';
}

@Injectable()
export class PushTokenService {
  constructor(@Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient) {
    if (!this.prisma) {
      throw new Error(
        `PRISMA_CLIENT_TOKEN injection failed in PushTokenService. ` +
        `Token value: "${PRISMA_CLIENT_TOKEN}". ` +
        `Please ensure your application's PrismaModule is @Global() and provides PRISMA_CLIENT_TOKEN before HorizonAuthModule.`
      );
    }
  }

  /**
   * Register a push notification token
   * @param data - Push token data
   * @returns Created push token
   */
  async registerPushToken(data: PushTokenData) {
    // Check if token already exists
    const existingToken = await this.prisma.pushToken.findUnique({
      where: { token: data.token },
    });

    if (existingToken) {
      // Update existing token
      return this.prisma.pushToken.update({
        where: { id: existingToken.id },
        data: {
          userId: data.userId,
          deviceId: data.deviceId,
          tokenType: data.tokenType,
          active: true,
        },
      });
    }

    // Check if device already has a token of this type
    const deviceToken = await this.prisma.pushToken.findFirst({
      where: {
        deviceId: data.deviceId,
        tokenType: data.tokenType,
        active: true,
      },
    });

    if (deviceToken) {
      // Deactivate old token for this device
      await this.prisma.pushToken.update({
        where: { id: deviceToken.id },
        data: { active: false },
      });
    }

    // Create new token
    return this.prisma.pushToken.create({
      data: {
        userId: data.userId,
        deviceId: data.deviceId,
        token: data.token,
        tokenType: data.tokenType,
        active: true,
      },
    });
  }

  /**
   * Update an existing push token
   * @param tokenId - Token ID
   * @param newToken - New token value
   * @returns Updated push token
   */
  async updatePushToken(tokenId: string, newToken: string) {
    const existingToken = await this.prisma.pushToken.findUnique({
      where: { id: tokenId },
    });

    if (!existingToken) {
      throw new NotFoundException('Push token not found');
    }

    return this.prisma.pushToken.update({
      where: { id: tokenId },
      data: {
        token: newToken,
        active: true,
      },
    });
  }

  /**
   * Revoke a push notification token
   * @param tokenId - Token ID
   */
  async revokePushToken(tokenId: string): Promise<void> {
    await this.prisma.pushToken.update({
      where: { id: tokenId },
      data: { active: false },
    });
  }

  /**
   * Get all active push tokens for a user
   * @param userId - User ID
   * @returns List of active push tokens with device info
   */
  async getUserPushTokens(userId: string) {
    return this.prisma.pushToken.findMany({
      where: {
        userId,
        active: true,
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            os: true,
            browser: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Revoke all push tokens for a specific device
   * Called when a device is revoked
   * @param deviceId - Device ID
   */
  async revokeDevicePushTokens(deviceId: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: {
        deviceId,
        active: true,
      },
      data: {
        active: false,
      },
    });
  }

  /**
   * Get active push tokens for sending notifications
   * @param userId - User ID
   * @returns List of active token strings
   */
  async getActiveTokensForUser(userId: string): Promise<string[]> {
    const tokens = await this.prisma.pushToken.findMany({
      where: {
        userId,
        active: true,
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t) => t.token);
  }
}
