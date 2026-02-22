import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSsoController } from './test-sso.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        
        // Import PrismaModule BEFORE HorizonAuthModule
        PrismaModule,
        
        // Full Mode - Auth service with all enhanced features
        HorizonAuthModule.forRoot({
            // database.url is deprecated - removed
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            jwt: {
                privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
                publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
            },
            cookie: {
                domain: process.env.COOKIE_DOMAIN || '.localhost',
                secure: process.env.NODE_ENV === 'production',
            },
            // Enable all enhanced authentication features
            features: {
                // Two-Factor Authentication
                twoFactor: {
                    enabled: true,
                    issuer: 'HorizonAuth',
                },
                
                // Device Management
                deviceManagement: {
                    enabled: true,
                    maxDevicesPerUser: 10,
                },
                
                // Push Notifications
                pushNotifications: {
                    enabled: true,
                },
                
                // Account Management
                accountManagement: {
                    enabled: true,
                    allowReactivation: true,
                },
                
                // Social Login (optional - requires OAuth credentials)
                // Uncomment and add credentials when ready to test
                // socialLogin: {
                //     google: {
                //         clientId: process.env.GOOGLE_CLIENT_ID || '',
                //         clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
                //         callbackUrl: 'http://localhost:3000/auth/google/callback',
                //     },
                //     facebook: {
                //         appId: process.env.FACEBOOK_APP_ID || '',
                //         appSecret: process.env.FACEBOOK_APP_SECRET || '',
                //         callbackUrl: 'http://localhost:3000/auth/facebook/callback',
                //     },
                // },
            },
        }),
    ],
    controllers: [TestSsoController],
    providers: [],
})
export class AppModule { }
