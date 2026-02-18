import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorSetupDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
