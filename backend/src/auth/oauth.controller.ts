import { Body, Controller, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';

export class OAuthAuthorizeDto {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod?: string;
}

export class OAuthTokenDto {
    grantType: string;
    code: string;
    codeVerifier: string;
    clientId: string;
    redirectUri: string;
}

@Controller('auth/oauth')
export class OAuthController {
    constructor(private readonly oauthService: OAuthService) { }

    @UseGuards(JwtAuthGuard)
    @Post('authorize')
    async authorize(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: OAuthAuthorizeDto,
    ) {
        if (!dto.clientId || !dto.redirectUri || !dto.codeChallenge) {
            throw new BadRequestException('Missing required fields');
        }

        const authCode = await this.oauthService.createAuthorizationCode(
            user.userId,
            dto.clientId,
            dto.redirectUri,
            dto.codeChallenge,
            dto.codeChallengeMethod || 'S256',
        );

        return {
            code: authCode.code,
            redirectUri: dto.redirectUri,
            state: 'TODO_IMPLEMENT_STATE', // Ideally pass through state
        };
    }

    @Post('token')
    async token(@Body() dto: OAuthTokenDto) {
        if (dto.grantType !== 'authorization_code') {
            throw new BadRequestException('Unsupported grant_type');
        }

        return this.oauthService.exchangeCode(
            dto.code,
            dto.codeVerifier,
            dto.clientId,
            dto.redirectUri,
        );
    }
}
