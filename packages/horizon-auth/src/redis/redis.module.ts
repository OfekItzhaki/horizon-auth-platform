import { Module, DynamicModule, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRoot(config: any): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'HORIZON_AUTH_CONFIG',
          useValue: config,
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}
