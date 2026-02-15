import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    captchaToken?: string;
}

export class VerifyResetOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}

export class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    token: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    @MinLength(8)
    passwordConfirm: string;
}
