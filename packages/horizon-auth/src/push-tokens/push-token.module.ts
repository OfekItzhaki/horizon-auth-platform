import { Module, forwardRef } from '@nestjs/common';
import { PushTokenService } from './push-token.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceModule } from '../devices/device.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DeviceModule)],
  providers: [PushTokenService],
  exports: [PushTokenService],
})
export class PushTokenModule {}
