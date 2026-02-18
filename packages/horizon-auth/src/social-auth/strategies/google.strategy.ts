import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SocialAuthService } from '../social-auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly socialAuthService: SocialAuthService,
    clientID: string,
    clientSecret: string,
    callbackURL: string,
  ) {
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const socialProfile = {
        provider: 'google' as const,
        providerId: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        profileData: profile,
      };

      const user = await this.socialAuthService.authenticateWithGoogle(socialProfile);
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
