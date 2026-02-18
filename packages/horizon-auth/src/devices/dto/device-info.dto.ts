import { IsOptional, IsString } from 'class-validator';

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceName?: string;
}
