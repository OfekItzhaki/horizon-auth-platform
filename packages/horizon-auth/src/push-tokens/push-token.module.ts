import { Module } from '@nestjs/common';
import { PushTokenService } from './push-token.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PushTokenService],
  exports: [PushTokenService],
})
export class PushTokenModule {}
