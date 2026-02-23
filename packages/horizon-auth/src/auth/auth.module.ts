import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwksController } from './jwks.controller';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtSsoStrategy } from './strategies/jwt-sso.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';

import { TwoFactorModule } from '../two-factor/two-factor.module';
import { DeviceModule } from '../devices/device.module';
import { PushTokenModule } from '../push-tokens/push-token.module';
import { AccountModule } from '../account/account.module';
import { SocialAuthModule } from '../social-auth/social-auth.module';
import { HorizonAuthConfig } from '../lib/horizon-auth-config.interface';

@Module({})
export class AuthModule {
  /**
   * Configure AuthModule for SSO mode (token verification only)
   */
  static forSsoMode(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule,
        JwtModule.register({}),
      ],
      providers: [
        Reflector,
        JwtSsoStrategy, // Use SSO strategy (no database/redis dependencies)
        JwtAuthGuard,
        RolesGuard,
      ],
      exports: [JwtAuthGuard, RolesGuard, Reflector],
    };
  }

  /**
   * Configure AuthModule for full mode (auth service with all features)
   */
  static forFullMode(config?: HorizonAuthConfig): DynamicModule {
    const imports: any[] = [
      PassportModule,
      JwtModule.register({}),
      ThrottlerModule.forRoot([
        {
          ttl: 60000, // 60 seconds
          limit: 10, // Default limit
        },
      ]),
      UsersModule,
      RedisModule,
      TwoFactorModule, // Always import - AuthService optionally uses it
    ];

    // Conditionally add feature modules based on configuration
    const features = config?.features;

    if (features?.deviceManagement?.enabled) {
      imports.push(DeviceModule);
    }

    if (features?.pushNotifications?.enabled) {
      imports.push(PushTokenModule);
    }

    if (features?.accountManagement?.enabled) {
      imports.push(AccountModule);
    }

    if (features?.socialLogin?.google || features?.socialLogin?.facebook) {
      imports.push(SocialAuthModule);
    }

    return {
      module: AuthModule,
      imports,
      controllers: [AuthController, JwksController],
      providers: [
        Reflector,
        AuthService,
        PasswordService,
        TokenService,
        EmailService,
        JwtStrategy, // Use full strategy (with database/redis)
        JwtAuthGuard,
        RolesGuard,
      ],
      exports: [AuthService, JwtAuthGuard, RolesGuard, Reflector],
    };
  }
}
