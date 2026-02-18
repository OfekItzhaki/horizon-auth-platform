import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

/**
 * JWT Strategy for SSO Mode
 * Only validates token signature, doesn't check database or Redis
 */
@Injectable()
export class JwtSsoStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject('HORIZON_AUTH_CONFIG') private readonly config: any) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.publicKey,
      algorithms: ['RS256'],
      issuer: config.jwt.issuer || 'horizon-auth',
      audience: config.jwt.audience || 'horizon-api',
    });
  }

  async validate(payload: any) {
    // In SSO mode, we trust the token from the auth service
    // Return the payload as the user object
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      ...payload,
    };
  }
}
