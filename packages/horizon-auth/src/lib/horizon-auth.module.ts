import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HorizonAuthConfig } from './horizon-auth-config.interface';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * HorizonAuthModule - Authentication and authorization module for Horizon applications
 * 
 * IMPORTANT: Applications using this module in full mode (non-SSO) MUST provide their own
 * @Global() PrismaModule that exports a PrismaService. The HorizonAuth services will inject
 * the application's PrismaService for all database operations.
 * 
 * Example setup in your application:
 * ```typescript
 * // app.module.ts
 * import { Module } from '@nestjs/common';
 * import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
 * import { PrismaModule } from './prisma/prisma.module'; // Your PrismaModule
 * 
 * @Module({
 *   imports: [
 *     PrismaModule, // Must be imported BEFORE HorizonAuthModule
 *     HorizonAuthModule.forRoot({
 *       redis: { host: 'localhost', port: 6379 },
 *       jwt: {
 *         privateKey: process.env.JWT_PRIVATE_KEY,
 *         publicKey: process.env.JWT_PUBLIC_KEY,
 *       },
 *       // Note: database.url is deprecated - use your own PrismaModule
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * 
 * // prisma/prisma.module.ts
 * import { Module, Global } from '@nestjs/common';
 * import { PrismaService } from './prisma.service';
 * 
 * @Global() // MUST be marked as Global
 * @Module({
 *   providers: [PrismaService],
 *   exports: [PrismaService], // MUST export PrismaService
 * })
 * export class PrismaModule {}
 * ```
 * 
 * For SSO mode (token verification only), no PrismaModule is required:
 * ```typescript
 * HorizonAuthModule.forRoot({
 *   ssoMode: true,
 *   authServiceUrl: 'https://auth.example.com',
 *   jwt: {
 *     publicKey: process.env.JWT_PUBLIC_KEY,
 *   },
 * })
 * ```
 */
@Global()
@Module({})
export class HorizonAuthModule {
  /**
   * Configure the HorizonAuth module with the provided configuration
   * 
   * @param config - Configuration options
   * @returns Dynamic module
   * 
   * @remarks
   * In full mode (non-SSO), your application MUST provide a @Global() PrismaModule
   * that exports PrismaService. HorizonAuth will inject this service for all
   * database operations. The database.url configuration option is deprecated.
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

    // SSO Mode - only import JWT verification modules
    if (finalConfig.ssoMode) {
      return {
        module: HorizonAuthModule,
        imports: [
          AuthModule.forSsoMode(), // Only JWT strategy and guards, no database/redis
        ],
        providers,
        exports: ['HORIZON_AUTH_CONFIG', AuthModule],
      };
    }

    // Full Mode - import all modules (auth service)
    // NOTE: Application must provide its own @Global() PrismaModule
    // The PrismaService will be injected from the application's module
    return {
      module: HorizonAuthModule,
      imports: [
        RedisModule.forRoot(finalConfig),
        AuthModule.forFullMode(finalConfig), // Pass config for conditional feature registration
        UsersModule,
      ],
      providers,
      exports: ['HORIZON_AUTH_CONFIG', AuthModule],
    };
  }

  /**
   * Configure the HorizonAuth module asynchronously
   * 
   * @param options - Async configuration options
   * @returns Dynamic module
   * 
   * @remarks
   * In full mode (non-SSO), your application MUST provide a @Global() PrismaModule
   * that exports PrismaService. HorizonAuth will inject this service for all
   * database operations. The database.url configuration option is deprecated.
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

    // Note: forRootAsync doesn't know the config at module definition time,
    // so we import both AuthModule variants and let runtime config decide
    return {
      module: HorizonAuthModule,
      imports: [AuthModule.forFullMode(), UsersModule],
      providers,
      exports: ['HORIZON_AUTH_CONFIG', AuthModule],
    };
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   */
  private static validateConfig(config: HorizonAuthConfig): void {
    // SSO Mode validation
    if (config.ssoMode) {
      // In SSO mode, only public key is required
      if (!config.jwt?.publicKey) {
        throw new Error('HorizonAuth (SSO Mode): jwt.publicKey is required');
      }

      if (!config.authServiceUrl) {
        throw new Error('HorizonAuth (SSO Mode): authServiceUrl is required');
      }

      // Validate public key format
      if (!config.jwt.publicKey.includes('BEGIN')) {
        throw new Error('HorizonAuth: JWT public key must be in PEM format');
      }

      return; // Skip other validations for SSO mode
    }

    // Full mode validation (auth service)
    // NOTE: database.url is no longer required here - application provides PrismaModule
    if (!config.redis?.host || !config.redis?.port) {
      throw new Error('HorizonAuth: redis.host and redis.port are required (or enable ssoMode)');
    }

    if (!config.jwt?.privateKey || !config.jwt?.publicKey) {
      throw new Error('HorizonAuth: jwt.privateKey and jwt.publicKey are required (or enable ssoMode with only publicKey)');
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
      ssoMode: config.ssoMode || false,
      jwt: {
        ...config.jwt,
        accessTokenExpiry: config.jwt.accessTokenExpiry || '15m',
        refreshTokenExpiry: config.jwt.refreshTokenExpiry || '7d',
        issuer: config.jwt.issuer || 'horizon-auth',
        audience: config.jwt.audience || 'horizon-api',
        kid: config.jwt.kid || 'horizon-auth-key-1',
      },
      cookie: {
        domain: config.cookie?.domain || config.security?.cookieDomain,
        secure: config.cookie?.secure ?? config.security?.cookieSecure ?? (process.env.NODE_ENV === 'production'),
        sameSite: config.cookie?.sameSite || 'lax',
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
