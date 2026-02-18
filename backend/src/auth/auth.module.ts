import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwksController } from './jwks.controller';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        UsersModule,
        PrismaModule,
        PassportModule,
        JwtModule.registerAsync({
            useFactory: () => {
                const fs = require('fs');
                const path = require('path');
                const privateKey = fs.readFileSync(path.join(process.cwd(), 'certs', 'private.pem'));
                const publicKey = fs.readFileSync(path.join(process.cwd(), 'certs', 'public.pem'));
                return {
                    privateKey,
                    publicKey,
                    signOptions: {
                        expiresIn: '15m',
                        algorithm: 'RS256',
                        keyid: 'horizon-auth-key-1'
                    },
                };
            },
        }),
    ],
    controllers: [AuthController, JwksController, OAuthController],
    providers: [AuthService, JwtStrategy, OAuthService],
    exports: [AuthService, OAuthService],
})
export class AuthModule { }
