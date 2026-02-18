import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { SocialAuthService } from '../social-auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
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
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();

      const socialProfile = {
        provider: 'facebook' as const,
        providerId: profile.id,
        email: email || '',
        displayName,
        profileData: profile,
      };

      const user = await this.socialAuthService.authenticateWithFacebook(socialProfile);
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
