import { Controller, Get } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('.well-known')
export class JwksController {
    @Get('jwks.json')
    getJwks() {
        const publicKeyPem = fs.readFileSync(path.join(process.cwd(), 'certs', 'public.pem'));
        const publicKey = createPublicKey(publicKeyPem);
        const jwk = publicKey.export({ format: 'jwk' });

        return {
            keys: [
                {
                    ...jwk,
                    kid: 'horizon-auth-key-1',
                    use: 'sig',
                    alg: 'RS256',
                },
            ],
        };
    }
}
