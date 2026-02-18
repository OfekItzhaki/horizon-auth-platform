import { IsEmail, IsNotEmpty, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStartDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Cloudflare Turnstile token',
    required: false,
  })
  @IsString()
  @IsOptional()
  captchaToken?: string;
}

export class RegisterVerifyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class RegisterFinishDto {
  @ApiProperty({ description: 'The token received from the verify step' })
  @IsString()
  @IsNotEmpty()
  registrationToken: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @Length(6, 50)
  password: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @Length(6, 50)
  passwordConfirm: string;
}
