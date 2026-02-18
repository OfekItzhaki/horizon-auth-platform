import {
  Body,
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard, CurrentUser, CurrentUserPayload } from './jwt-utils';
import { LoginDto } from './dto/login.dto';
import { RegisterStartDto, RegisterVerifyDto, RegisterFinishDto } from './dto/register-multi-step.dto';
import { ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const userValidationResult = await this.authService.login(loginDto.email, loginDto.password);
    if (loginDto.captchaToken) await this.authService.verifyTurnstile(loginDto.captchaToken);

    this.setRefreshTokenCookie(response, userValidationResult.refreshToken);
    const { refreshToken, ...rest } = userValidationResult;
    return rest;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    const result = await this.authService.refreshAccessToken(refreshToken);
    this.setRefreshTokenCookie(response, result.refreshToken);
    const { refreshToken: _rt, ...rest } = result;
    return rest;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentUserPayload, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(user.userId);
    response.clearCookie('refresh_token', { httpOnly: true, path: '/auth/refresh' });
    return { message: 'Logged out' };
  }

  private setRefreshTokenCookie(response: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax', // 'none' for cross-domain if secure
      domain: isProd ? '.ofeklabs.dev' : undefined,
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('register/start')
  async registerStart(@Body() dto: RegisterStartDto) {
    if (dto.captchaToken) await this.authService.verifyTurnstile(dto.captchaToken);
    return this.authService.registerStart(dto.email);
  }

  @Post('register/verify')
  registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto.email, dto.otp);
  }

  @Post('register/finish')
  async registerFinish(@Body() dto: RegisterFinishDto, @Res({ passthrough: true }) response: Response) {
    if (dto.password !== dto.passwordConfirm) throw new BadRequestException('Passwords mismatch');
    const result = await this.authService.registerFinish(dto.registrationToken, dto.password);
    this.setRefreshTokenCookie(response, result.refreshToken);
    const { refreshToken, ...rest } = result;
    return rest;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    if (dto.captchaToken) await this.authService.verifyTurnstile(dto.captchaToken);
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password/verify')
  async verifyReset(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto.email, dto.otp);
  }

  @Post('reset-password/finish')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirm) throw new BadRequestException('Passwords mismatch');
    return this.authService.resetPassword(dto.email, dto.token, dto.password);
  }
}
