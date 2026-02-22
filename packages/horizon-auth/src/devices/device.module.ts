import { Module, forwardRef } from '@nestjs/common';
import { DeviceService } from './device.service';
import { PushTokenModule } from '../push-tokens/push-token.module';

@Module({
  imports: [forwardRef(() => PushTokenModule)],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
