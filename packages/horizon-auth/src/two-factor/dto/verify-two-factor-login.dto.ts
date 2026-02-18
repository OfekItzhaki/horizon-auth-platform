import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorLoginDto {
  @IsString()
  @Length(6, 9) // TOTP (6 digits) or backup code (9 chars with dash)
  code: string;
}
