import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { createPublicKey } from 'crypto';

@Controller('.well-known')
export class JwksController {
  constructor(@Inject('HORIZON_AUTH_CONFIG') private readonly config: any) {}

  /**
   * JWKS endpoint for public key distribution
   * GET /.well-known/jwks.json
   */
  @Public()
  @Get('jwks.json')
  getJwks() {
    // Parse the RSA public key
    const publicKey = createPublicKey(this.config.jwt.publicKey);
    const jwk = publicKey.export({ format: 'jwk' });

    // Format according to RFC 7517
    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          kid: this.config.jwt.kid || 'horizon-auth-key-1',
          n: jwk.n,
          e: jwk.e,
        },
      ],
    };
  }
}
