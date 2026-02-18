import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Res,
  Req,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto, VerifyEmailDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../users/users.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { VerifyTwoFactorSetupDto } from '../two-factor/dto/verify-two-factor-setup.dto';
import { VerifyTwoFactorLoginDto } from '../two-factor/dto/verify-two-factor-login.dto';
import { AccountService } from '../account/account.service';
import { DeactivateAccountDto } from '../account/dto/deactivate-account.dto';
import { SocialAuthService } from '../social-auth/social-auth.service';
import { GoogleCallbackDto, FacebookCallbackDto } from '../social-auth/dto';
import { PushTokenService } from '../push-tokens/push-token.service';
import { RegisterPushTokenDto } from '../push-tokens/dto/register-push-token.dto';
import { DeviceService } from '../devices/device.service';
import { Optional } from '@nestjs/common';
import { FeatureDisabledException } from '../common/exceptions';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Optional() private readonly twoFactorService?: TwoFactorService,
    @Optional() private readonly accountService?: AccountService,
    @Optional() private readonly socialAuthService?: SocialAuthService,
    @Optional() private readonly pushTokenService?: PushTokenService,
    @Optional() private readonly deviceService?: DeviceService,
  ) {}

  /**
   * Register a new user
   * POST /auth/register
   * Rate limit: 3 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
      registerDto.tenantId,
    );

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Login with email and password
   * POST /auth/login
   * Rate limit: 5 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract device information from request
    const deviceInfo = {
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.socket.remoteAddress,
    };

    const result = await this.authService.login(loginDto.email, loginDto.password, deviceInfo);

    // Check if 2FA is required
    if ('requiresTwoFactor' in result) {
      return {
        requiresTwoFactor: true,
        userId: result.userId,
      };
    }

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const result = await this.authService.refresh(refreshToken);

    // Set new refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: SafeUser) {
    return user;
  }

  /**
   * Request password reset
   * POST /auth/password-reset/request
   * Rate limit: 3 requests per hour
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If the email exists, a reset link will be sent' };
  }

  /**
   * Complete password reset
   * POST /auth/password-reset/complete
   */
  @Public()
  @Post('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  /**
   * Verify email
   * POST /auth/verify-email
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  /**
   * Verify 2FA code and complete login
   * POST /auth/2fa/verify-login
   * Rate limit: 5 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorLogin(
    @Body() dto: { userId: string; code: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract device information from request
    const deviceInfo = {
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.socket.remoteAddress,
    };

    const result = await this.authService.verifyTwoFactorLogin(dto.userId, dto.code, deviceInfo);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Enable 2FA - Generate TOTP secret and QR code
   * POST /auth/2fa/enable
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(@CurrentUser() user: SafeUser) {
    if (!this.twoFactorService) {
      throw new FeatureDisabledException('Two-factor authentication');
    }
    const result = await this.twoFactorService!.generateTotpSecret(user.id);
    return result;
  }

  /**
   * Verify TOTP code during setup and enable 2FA
   * POST /auth/2fa/verify
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorSetup(
    @CurrentUser() user: SafeUser,
    @Body() dto: VerifyTwoFactorSetupDto,
  ) {
    if (!this.twoFactorService) {
      throw new FeatureDisabledException('Two-factor authentication');
    }
    const isValid = await this.twoFactorService!.verifyTotpSetup(user.id, dto.code);
    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    const result = await this.twoFactorService!.enableTwoFactor(user.id);
    return result;
  }

  /**
   * Disable 2FA
   * POST /auth/2fa/disable
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(@CurrentUser() user: SafeUser) {
    if (!this.twoFactorService) {
      throw new FeatureDisabledException('Two-factor authentication');
    }
    await this.twoFactorService!.disableTwoFactor(user.id);
    return { message: '2FA disabled successfully' };
  }

  /**
   * Regenerate backup codes
   * POST /auth/2fa/backup-codes/regenerate
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@CurrentUser() user: SafeUser) {
    if (!this.twoFactorService) {
      throw new FeatureDisabledException('Two-factor authentication');
    }
    const backupCodes = await this.twoFactorService!.regenerateBackupCodes(user.id);
    return { backupCodes };
  }

  /**
   * Google OAuth callback
   * POST /auth/social/google
   * Rate limit: 5 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body() dto: GoogleCallbackDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    // In a real implementation, you would exchange the code for tokens
    // and get the user profile from Google
    // For now, this is a placeholder that expects the frontend to handle OAuth
    throw new Error('Google OAuth not fully implemented - requires OAuth code exchange');
  }

  /**
   * Facebook OAuth callback
   * POST /auth/social/facebook
   * Rate limit: 5 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('social/facebook')
  @HttpCode(HttpStatus.OK)
  async facebookCallback(
    @Body() dto: FacebookCallbackDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    // In a real implementation, you would exchange the code for tokens
    // and get the user profile from Facebook
    // For now, this is a placeholder that expects the frontend to handle OAuth
    throw new Error('Facebook OAuth not fully implemented - requires OAuth code exchange');
  }

  /**
   * Register push notification token
   * POST /auth/push-tokens
   */
  @UseGuards(JwtAuthGuard)
  @Post('push-tokens')
  @HttpCode(HttpStatus.CREATED)
  async registerPushToken(
      @CurrentUser() user: SafeUser,
      @Body() dto: RegisterPushTokenDto,
    ) {
      if (!this.pushTokenService) {
        throw new FeatureDisabledException('Push notifications');
      }
      if (!dto.deviceId) {
        throw new Error('Device ID is required');
      }

      const pushToken = await this.pushTokenService!.registerPushToken({
        userId: user.id,
        token: dto.token,
        tokenType: dto.tokenType,
        deviceId: dto.deviceId,
      });
      return pushToken;
    }


  /**
   * Revoke push notification token
   * DELETE /auth/push-tokens/:tokenId
   */
  @UseGuards(JwtAuthGuard)
  @Delete('push-tokens/:tokenId')
  @HttpCode(HttpStatus.OK)
  async revokePushToken(
    @CurrentUser() user: SafeUser,
    @Param('tokenId') tokenId: string,
  ) {
    if (!this.pushTokenService) {
      throw new FeatureDisabledException('Push notifications');
    }
    await this.pushTokenService!.revokePushToken(tokenId);
    return { message: 'Push token revoked successfully' };
  }

  /**
   * Get user's active devices
   * GET /auth/devices
   */
  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async getDevices(@CurrentUser() user: SafeUser, @Req() request: Request) {
    if (!this.deviceService) {
      throw new FeatureDisabledException('Device management');
    }
    const devices = await this.deviceService!.getUserDevices(user.id);
    return devices;
  }

  /**
   * Revoke a specific device
   * DELETE /auth/devices/:deviceId
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('devices/:deviceId/revoke')
  async revokeDevice(
    @CurrentUser() user: SafeUser,
    @Param('deviceId') deviceId: string,
  ) {
    if (!this.deviceService) {
      throw new FeatureDisabledException('Device management');
    }
    await this.deviceService!.revokeDevice(user.id, deviceId);
    return { message: 'Device revoked successfully' };
  }

  /**
   * Deactivate user account
   * POST /auth/account/deactivate
   */
  @UseGuards(JwtAuthGuard)
  @Post('account/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(
    @CurrentUser() user: SafeUser,
    @Body() dto: DeactivateAccountDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!this.accountService) {
      throw new FeatureDisabledException('Account management');
    }
    await this.accountService!.deactivateAccount(user.id, dto.reason);

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Account deactivated successfully' };
  }

  /**
   * Reactivate user account
   * POST /auth/account/reactivate
   */
  @Public()
  @Post('account/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateAccount(@Body() dto: { email: string; password: string }) {
    if (!this.accountService) {
      throw new FeatureDisabledException('Account management');
    }
    
    // Reactivate account first
    await this.accountService!.reactivateAccountByEmail(dto.email);
    
    // Now login will work
    const result = await this.authService.login(dto.email, dto.password);

    return {
      message: 'Account reactivated successfully',
      ...result,
    };
  }

  /**
   * Delete user account permanently
   * DELETE /auth/account
   */
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!this.accountService) {
      throw new FeatureDisabledException('Account management');
    }
    await this.accountService!.deleteAccount(user.id);

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Account deleted successfully' };
  }

  /**
   * Helper method to set refresh token cookie
   */
  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}

