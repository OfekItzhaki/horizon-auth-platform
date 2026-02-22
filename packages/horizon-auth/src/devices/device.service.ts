import { Injectable, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { PushTokenService } from '../push-tokens/push-token.service';

export interface DeviceInfo {
  userAgent: string;
  deviceName?: string;
  ip?: string;
}

export interface DeviceResponse {
  id: string;
  deviceName?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  lastActiveAt: Date;
  current: boolean;
}

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaClient,
    @Optional() @Inject(forwardRef(() => PushTokenService)) private pushTokenService?: PushTokenService,
  ) {}

  /**
   * Generate a deterministic fingerprint from user agent
   * @param userAgent - User agent string
   * @param ip - Optional IP address for additional entropy
   * @returns SHA-256 hash of normalized user agent
   */
  generateFingerprint(userAgent: string, ip?: string): string {
    // Normalize user agent by removing version numbers for more stable fingerprints
    const normalized = userAgent.toLowerCase().trim();
    const data = ip ? `${normalized}:${ip}` : normalized;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Extract device information from user agent string
   * @param userAgent - User agent string
   * @returns Parsed device information
   */
  private extractDeviceInfo(userAgent: string) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: result.browser.name
        ? `${result.browser.name}${result.browser.version ? ' ' + result.browser.version : ''}`
        : undefined,
      os: result.os.name
        ? `${result.os.name}${result.os.version ? ' ' + result.os.version : ''}`
        : undefined,
      deviceType: result.device.type || 'desktop', // Default to desktop if not specified
    };
  }

  /**
   * Create or update a device record
   * @param userId - User ID
   * @param deviceInfo - Device information from request
   * @returns Created or updated device
   */
  async createOrUpdateDevice(userId: string, deviceInfo: DeviceInfo) {
    const fingerprint = this.generateFingerprint(deviceInfo.userAgent, deviceInfo.ip);
    const parsedInfo = this.extractDeviceInfo(deviceInfo.userAgent);

    // Try to find existing device by fingerprint
    const existingDevice = await this.prisma.device.findFirst({
      where: {
        userId,
        fingerprint,
      },
    });

    if (existingDevice) {
      // Update existing device
      return this.prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          deviceName: deviceInfo.deviceName || existingDevice.deviceName,
          lastActiveAt: new Date(),
        },
      });
    }

    // Create new device
    return this.prisma.device.create({
      data: {
        userId,
        deviceName: deviceInfo.deviceName,
        deviceType: parsedInfo.deviceType,
        os: parsedInfo.os,
        browser: parsedInfo.browser,
        fingerprint,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get all active devices for a user
   * @param userId - User ID
   * @param currentDeviceId - Optional current device ID to mark as current
   * @returns List of user's devices with active sessions
   */
  async getUserDevices(userId: string, currentDeviceId?: string): Promise<DeviceResponse[]> {
    // Get devices that have at least one non-revoked refresh token
    const devices = await this.prisma.device.findMany({
      where: {
        userId,
        refreshTokens: {
          some: {
            revoked: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName || undefined,
      deviceType: device.deviceType || undefined,
      os: device.os || undefined,
      browser: device.browser || undefined,
      lastActiveAt: device.lastActiveAt,
      current: device.id === currentDeviceId,
    }));
  }

  /**
   * Revoke a specific device and all its tokens
   * @param userId - User ID
   * @param deviceId - Device ID to revoke
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    // Verify device belongs to user
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // Revoke all refresh tokens for this device
    await this.prisma.refreshToken.updateMany({
      where: {
        deviceId,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    // Revoke push tokens if PushTokenService is available
    if (this.pushTokenService) {
      await this.pushTokenService.revokeDevicePushTokens(deviceId);
    }
  }

  /**
   * Update device last active timestamp
   * @param deviceId - Device ID
   */
  async updateLastActive(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get device by fingerprint
   * @param userId - User ID
   * @param fingerprint - Device fingerprint
   * @returns Device or null
   */
  async getDeviceByFingerprint(userId: string, fingerprint: string) {
    return this.prisma.device.findFirst({
      where: {
        userId,
        fingerprint,
      },
    });
  }
}
