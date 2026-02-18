import { Module } from '@nestjs/common';
import { SocialAuthService } from './social-auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TokenService } from '../auth/services/token.service';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [SocialAuthService, TokenService],
  exports: [SocialAuthService],
})
export class SocialAuthModule {}
