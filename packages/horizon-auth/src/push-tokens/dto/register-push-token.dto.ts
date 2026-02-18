import { IsString, IsEnum, IsOptional } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsEnum(['FCM', 'APNS'])
  tokenType: 'FCM' | 'APNS';

  @IsOptional()
  @IsString()
  deviceId?: string;
}
