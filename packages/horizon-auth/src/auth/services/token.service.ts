import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { AccessTokenPayload, TokenPair, RefreshTokenPayload } from '../interfaces/token.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('HORIZON_AUTH_CONFIG') private readonly config: any,
  ) {}

  /**
   * Generate an RS256-signed access token
   * @param payload - Token payload (user ID, email, roles, tenant)
   * @returns Signed JWT string
   */
  generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const accessTokenExpiry = this.config.jwt.accessTokenExpiry || '15m';
    
    return this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles,
      },
      {
        algorithm: 'RS256',
        privateKey: this.config.jwt.privateKey,
        expiresIn: accessTokenExpiry,
        issuer: this.config.jwt.issuer || 'horizon-auth',
        audience: this.config.jwt.audience || 'horizon-api',
      },
    );
  }

  /**
   * Verify and decode an access token
   * @param token - JWT string
   * @returns Decoded payload
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey: this.config.jwt.publicKey,
        issuer: this.config.jwt.issuer || 'horizon-auth',
        audience: this.config.jwt.audience || 'horizon-api',
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Generate a refresh token JWT
   * @param userId - User ID
   * @returns Refresh token JWT string
   */
  generateRefreshTokenJWT(userId: string): { token: string; jti: string } {
    const jti = randomUUID();
    const refreshTokenExpiry = this.config.jwt.refreshTokenExpiry || '7d';

    const token = this.jwtService.sign(
      {
        sub: userId,
        jti,
      },
      {
        algorithm: 'RS256',
        privateKey: this.config.jwt.privateKey,
        expiresIn: refreshTokenExpiry,
      },
    );

    return { token, jti };
  }

  /**
   * Verify a refresh token JWT
   * @param token - Refresh token JWT string
   * @returns Decoded payload with jti
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey: this.config.jwt.publicKey,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Hash a token using SHA-256
   * Used for storing refresh tokens securely in database
   * @param token - Token to hash
   * @returns SHA-256 hash
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculate TTL in seconds from expiration date
   * @param expiresAt - Expiration date
   * @returns TTL in seconds
   */
  calculateTTL(expiresAt: Date): number {
    const now = new Date();
    const ttl = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    return Math.max(ttl, 0);
  }
}
