# Quick Integration Guide - 5 Minutes

Get Horizon Auth Enhanced Features running in your production project in 5 minutes.

## 1. Install Package

```bash
npm install @ofeklabs/horizon-auth@latest
```

## 2. Setup Database & Redis

```bash
# Apply migrations
npx prisma migrate deploy --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma

# Generate Prisma client
npx prisma generate --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma
```

## 3. Generate JWT Keys

```bash
mkdir -p certs
openssl genrsa -out certs/private.pem 2048
openssl rsa -in certs/private.pem -pubout -out certs/public.pem
chmod 600 certs/private.pem
```

## 4. Configure Environment

Create `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_HOST=localhost
REDIS_PORT=6379
COOKIE_DOMAIN=.yourdomain.com
NODE_ENV=production
```

## 5. Update app.module.ts

```typescript
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: { url: process.env.DATABASE_URL },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      jwt: {
        privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.NODE_ENV === 'production',
      },
      features: {
        twoFactor: { enabled: true, issuer: 'YourApp' },
        deviceManagement: { enabled: true, maxDevicesPerUser: 10 },
        pushNotifications: { enabled: true },
        accountManagement: { enabled: true, allowReactivation: true },
      },
    }),
  ],
})
export class AppModule {}
```

## 6. Start Your App

```bash
npm run start:prod
```

## 7. Test It

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","fullName":"Test User"}'

# Enable 2FA
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Available Endpoints

All endpoints at `/auth`:

**Authentication:**
- `POST /register` - Register user
- `POST /login` - Login
- `POST /logout` - Logout
- `GET /profile` - Get profile

**2FA:**
- `POST /2fa/enable` - Enable 2FA
- `POST /2fa/verify` - Verify setup
- `POST /2fa/verify-login` - Verify during login
- `POST /2fa/disable` - Disable 2FA

**Devices:**
- `GET /devices` - List devices
- `POST /devices/:id/revoke` - Revoke device

**Account:**
- `POST /account/deactivate` - Deactivate
- `POST /account/reactivate` - Reactivate
- `DELETE /account` - Delete

**Push Tokens:**
- `POST /push-tokens` - Register token
- `DELETE /push-tokens/:id` - Revoke token

## Optional: Social Login

Add to `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

Add to config:
```typescript
features: {
  socialLogin: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: 'https://yourdomain.com/auth/google/callback',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      callbackUrl: 'https://yourdomain.com/auth/facebook/callback',
    },
  },
}
```

## Need More Details?

See `PRODUCTION-INTEGRATION-GUIDE.md` for comprehensive setup instructions.
