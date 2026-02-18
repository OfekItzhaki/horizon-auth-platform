import { Module, DynamicModule, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({})
export class PrismaModule {
  static forRoot(config: any): DynamicModule {
    return {
      module: PrismaModule,
      providers: [
        {
          provide: 'HORIZON_AUTH_CONFIG',
          useValue: config,
        },
        PrismaService,
      ],
      exports: [PrismaService],
    };
  }
}
