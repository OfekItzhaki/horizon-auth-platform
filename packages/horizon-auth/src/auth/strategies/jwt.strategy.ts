import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('HORIZON_AUTH_CONFIG') private readonly config: any,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {
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
    // Check if token is blacklisted (for access tokens with JTI)
    if (payload.jti) {
      const isBlacklisted = await this.redisService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Fetch user from database
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user object (will be attached to request.user)
    return this.usersService.toSafeUser(user);
  }
}
