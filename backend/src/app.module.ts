import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSsoController } from './test-sso.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        
        // SSO Mode - verify tokens from auth service
        HorizonAuthModule.forRoot({
            ssoMode: true,
            authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
            jwt: {
                publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
            },
            cookie: {
                domain: process.env.COOKIE_DOMAIN || '.localhost',
                secure: process.env.NODE_ENV === 'production',
            },
        }),
        
        // Your existing modules (for local development)
        PrismaModule,
        AuthModule,
        UsersModule,
    ],
    controllers: [TestSsoController],
    providers: [],
})
export class AppModule { }
