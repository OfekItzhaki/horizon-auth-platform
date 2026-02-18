import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

@Injectable()
export class OAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    async createAuthorizationCode(
        userId: string,
        clientId: string,
        redirectUri: string,
        codeChallenge: string,
        codeChallengeMethod: string = 'S256',
    ) {
        const code = uuidv4();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Code valid for 5 minutes

        return this.prisma.authorizationCode.create({
            data: {
                code,
                userId,
                clientId,
                redirectUri,
                codeChallenge,
                codeChallengeMethod,
                expiresAt,
            },
        });
    }

    async exchangeCode(
        code: string,
        codeVerifier: string,
        clientId: string,
        redirectUri: string,
    ) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            throw new BadRequestException('Invalid client_id');
        }

        if (!client.allowedRedirectUris.includes(redirectUri)) {
            throw new BadRequestException('Invalid redirect_uri');
        }

        const authCode = await this.prisma.authorizationCode.findUnique({
            where: { code },
            include: { user: true },
        });

        if (!authCode) {
            throw new BadRequestException('Invalid authorization code');
        }

        if (authCode.usedAt) {
            // Potential replay attack
            throw new BadRequestException('Authorization code already used');
        }

        if (authCode.expiresAt < new Date()) {
            throw new BadRequestException('Authorization code expired');
        }

        if (authCode.clientId !== clientId) {
            throw new BadRequestException('Invalid client_id');
        }

        if (authCode.redirectUri !== redirectUri) {
            throw new BadRequestException('Invalid redirect_uri');
        }

        // Verify PKCE
        if (authCode.codeChallengeMethod === 'S256') {
            const hash = createHash('sha256').update(codeVerifier).digest('base64url');
            // base64url encoding is needed. Node's digest('base64') is standard base64.
            // Helper for base64url:
            const base64UrlHash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            // Actually, Node's crypto might not support 'base64url' encoding directly in all versions, 
            // ensuring we match the standard. 
            // Standard: S256 = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))

            // Let's re-implement strictly.
            const apiHash = createHash('sha256').update(codeVerifier).digest('base64')
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            if (apiHash !== authCode.codeChallenge) {
                throw new BadRequestException('Invalid code_verifier');
            }
        } else {
            // Plain
            if (codeVerifier !== authCode.codeChallenge) {
                throw new BadRequestException('Invalid code_verifier');
            }
        }

        // Mark code as used
        await this.prisma.authorizationCode.update({
            where: { id: authCode.id },
            data: { usedAt: new Date() },
        });

        // Login user
        return this.authService.createAuthSession(authCode.user);
    }
}
