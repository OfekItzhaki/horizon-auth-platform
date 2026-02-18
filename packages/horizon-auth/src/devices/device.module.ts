import { Module, forwardRef } from '@nestjs/common';
import { DeviceService } from './device.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PushTokenModule } from '../push-tokens/push-token.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PushTokenModule)],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
