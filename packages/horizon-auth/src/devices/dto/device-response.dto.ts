export class DeviceResponseDto {
  id: string;
  deviceName?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  lastActiveAt: Date;
  current: boolean;
}
