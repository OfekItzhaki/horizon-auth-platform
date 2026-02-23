import { Global, Module } from '@nestjs/common';
import { PRISMA_CLIENT_TOKEN } from '@ofeklabs/horizon-auth';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    // Provide PrismaClient using the string token from horizon-auth
    // This avoids minification issues with class-based injection tokens
    {
      provide: PRISMA_CLIENT_TOKEN,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, PRISMA_CLIENT_TOKEN],
})
export class PrismaModule {}
