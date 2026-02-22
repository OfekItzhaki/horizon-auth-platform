import { Module, forwardRef } from '@nestjs/common';
import { PushTokenService } from './push-token.service';
import { DeviceModule } from '../devices/device.module';

@Module({
  imports: [forwardRef(() => DeviceModule)],
  providers: [PushTokenService],
  exports: [PushTokenService],
})
export class PushTokenModule {}
