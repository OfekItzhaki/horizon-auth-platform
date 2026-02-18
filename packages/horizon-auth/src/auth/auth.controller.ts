import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password);

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
