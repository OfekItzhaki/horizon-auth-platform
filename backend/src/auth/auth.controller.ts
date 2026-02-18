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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';
import { ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import {
    RegisterStartDto,
    RegisterVerifyDto,
    RegisterFinishDto,
} from './dto/register-multi-step.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Successful login' })
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
        const [userValidationResult] = await Promise.all([
            this.authService.login(loginDto.email, loginDto.password),
            loginDto.captchaToken
                ? this.authService.verifyTurnstile(loginDto.captchaToken)
                : Promise.resolve(),
        ]);

        this.setRefreshTokenCookie(response, userValidationResult.refreshToken);
        return userValidationResult;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const refreshToken = request.cookies['refresh_token'];
        if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

        const result = await this.authService.refreshAccessToken(refreshToken);
        this.setRefreshTokenCookie(response, result.refreshToken);
        return result;
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @CurrentUser() user: CurrentUserPayload,
        @Res({ passthrough: true }) response: Response,
    ) {
        await this.authService.logout(user.userId);
        response.clearCookie('refresh_token', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/auth/refresh',
        });
        return { message: 'Logged out' };
    }

    private setRefreshTokenCookie(response: Response, token: string) {
        response.cookie('refresh_token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/auth/refresh',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    @Post('verify-email/:token')
    async verifyEmail(@Param('token') token: string) {
        return this.usersService.verifyEmail(token);
    }

    @Post('register/start')
    async registerStart(@Body() dto: RegisterStartDto) {
        const [result] = await Promise.all([
            this.authService.registerStart(dto.email),
            dto.captchaToken
                ? this.authService.verifyTurnstile(dto.captchaToken)
                : Promise.resolve(),
        ]);
        return result;
    }

    @Post('resend-verification')
    async resendVerification(@Body() dto: ResendVerificationDto) {
        return this.authService.resendVerification(dto.email);
    }

    @Post('register/verify')
    registerVerify(@Body() dto: RegisterVerifyDto) {
        return this.authService.registerVerify(dto.email, dto.otp);
    }

    @Post('register/finish')
    async registerFinish(
        @Body() dto: RegisterFinishDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        if (dto.password !== dto.passwordConfirm) {
            throw new BadRequestException('Passwords do not match');
        }
        const result = await this.authService.registerFinish(dto.registrationToken, dto.password);
        this.setRefreshTokenCookie(response, result.refreshToken);
        return result;
    }

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        const [result] = await Promise.all([
            this.authService.forgotPassword(dto.email),
            dto.captchaToken
                ? this.authService.verifyTurnstile(dto.captchaToken)
                : Promise.resolve(),
        ]);
        return result;
    }

    @Post('reset-password/verify')
    async verifyReset(@Body() dto: VerifyResetOtpDto) {
        return this.authService.verifyResetOtp(dto.email, dto.otp);
    }

    @Post('reset-password/finish')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        if (dto.password !== dto.passwordConfirm) {
            throw new BadRequestException('Passwords do not match');
        }
        return this.authService.resetPassword(dto.email, dto.token, dto.password);
    }
}
