import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HorizonAuthConfig } from './horizon-auth-config.interface';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Global()
@Module({})
export class HorizonAuthModule {
  /**
   * Configure the HorizonAuth module with the provided configuration
   * @param config - Configuration options
   * @returns Dynamic module
   */
  static forRoot(config: HorizonAuthConfig): DynamicModule {
    // Validate configuration
    this.validateConfig(config);

    // Set defaults
    const finalConfig = this.applyDefaults(config);

    const providers: Provider[] = [
      {
        provide: 'HORIZON_AUTH_CONFIG',
        useValue: finalConfig,
      },
    ];

    // Apply global JWT guard if configured
    if (finalConfig.guards?.applyJwtGuardGlobally) {
      providers.push({
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      });
    }

    return {
      module: HorizonAuthModule,
      imports: [
        PrismaModule.forRoot(finalConfig),
        RedisModule.forRoot(finalConfig),
        AuthModule,
        UsersModule,
      ],
      providers,
      exports: ['HORIZON_AUTH_CONFIG', AuthModule],
    };
  }

  /**
   * Configure the HorizonAuth module asynchronously
   * @param options - Async configuration options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<HorizonAuthConfig> | HorizonAuthConfig;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'HORIZON_AUTH_CONFIG',
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          this.validateConfig(config);
          return this.applyDefaults(config);
        },
        inject: options.inject || [],
      },
    ];

    return {
      module: HorizonAuthModule,
      imports: [AuthModule, UsersModule],
      providers,
      exports: ['HORIZON_AUTH_CONFIG', AuthModule],
    };
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   */
  private static validateConfig(config: HorizonAuthConfig): void {
    // Validate required fields
    if (!config.database?.url) {
      throw new Error('HorizonAuth: database.url is required');
    }

    if (!config.redis?.host || !config.redis?.port) {
      throw new Error('HorizonAuth: redis.host and redis.port are required');
    }

    if (!config.jwt?.privateKey || !config.jwt?.publicKey) {
      throw new Error('HorizonAuth: jwt.privateKey and jwt.publicKey are required');
    }

    // Validate JWT keys format (should be PEM format)
    if (!config.jwt.privateKey.includes('BEGIN') || !config.jwt.publicKey.includes('BEGIN')) {
      throw new Error('HorizonAuth: JWT keys must be in PEM format');
    }
  }

  /**
   * Apply default values to configuration
   * @param config - Configuration
   * @returns Configuration with defaults
   */
  private static applyDefaults(config: HorizonAuthConfig): HorizonAuthConfig {
    return {
      ...config,
      jwt: {
        ...config.jwt,
        accessTokenExpiry: config.jwt.accessTokenExpiry || '15m',
        refreshTokenExpiry: config.jwt.refreshTokenExpiry || '7d',
        issuer: config.jwt.issuer || 'horizon-auth',
        audience: config.jwt.audience || 'horizon-api',
        kid: config.jwt.kid || 'horizon-auth-key-1',
      },
      multiTenant: {
        enabled: config.multiTenant?.enabled || false,
        tenantIdExtractor: config.multiTenant?.tenantIdExtractor || 'header',
        defaultTenantId: config.multiTenant?.defaultTenantId || 'default',
        ...config.multiTenant,
      },
      rateLimit: {
        login: config.rateLimit?.login || { limit: 5, ttl: 60 },
        register: config.rateLimit?.register || { limit: 3, ttl: 60 },
        passwordReset: config.rateLimit?.passwordReset || { limit: 3, ttl: 3600 },
      },
      security: {
        bcryptMigration: config.security?.bcryptMigration || false,
        cookieSecure: config.security?.cookieSecure ?? (process.env.NODE_ENV === 'production'),
        ...config.security,
      },
      guards: {
        applyJwtGuardGlobally: config.guards?.applyJwtGuardGlobally || false,
      },
    };
  }
}
