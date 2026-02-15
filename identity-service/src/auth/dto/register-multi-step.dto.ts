import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterStartDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    captchaToken?: string;
}

export class RegisterVerifyDto {
    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}

export class RegisterFinishDto {
    @IsString()
    registrationToken: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    @MinLength(8)
    passwordConfirm: string;
}
