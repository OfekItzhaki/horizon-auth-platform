# Environment Variable Configuration Guide

Horizon Auth can be configured entirely through environment variables - no code changes needed! This makes it perfect for both embedded authentication and SSO deployments.

## Quick Start

### Embedded Mode (Each App Has Own Auth)

```env
# .env
AUTH_MODE=full
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.myapp.com
NODE_ENV=production

# Enable features
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=MyApp
```

### SSO Mode (Centralized Auth Service)

**Auth Service (auth.yourdomain.com):**
```env
AUTH_MODE=full
DATABASE_URL=postgresql://user:password@host:5432/auth_db
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.yourdomain.com
NODE_ENV=production

# Enable all features
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=YourCompany
```

**Your Projects (project1.yourdomain.com, project2.yourdomain.com):**
```env
AUTH_MODE=sso
AUTH_SERVICE_URL=https://auth.yourdomain.com
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.yourdomain.com
NODE_ENV=production
```

## Usage in Code

### Zero Configuration (ENV Only)

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot(), // 👈 No config needed! Uses ENV variables
  ],
})
export class AppModule {}
```

### With Optional Overrides

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      // ENV variables are loaded automatically
      // You can override specific values here
      jwt: {
        accessTokenExpiry: '30m', // Override default 15m
      },
    }),
  ],
})
export class AppModule {}
```

## Environment Variables Reference

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_MODE` | No | `full` | `full` for embedded auth, `sso` for token verification only |
| `NODE_ENV` | No | `development` | `production`, `development`, or `test` |

### Database (Full Mode Only)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | - | PostgreSQL connection string |

*Required when `AUTH_MODE=full`

### Redis (Full Mode Only)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | Yes* | - | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | - | Redis password (if required) |
| `REDIS_DB` | No | `0` | Redis database number |

*Required when `AUTH_MODE=full`

### JWT Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_PRIVATE_KEY` | Yes* | - | RSA private key in PEM format (with `\n` for newlines) |
| `JWT_PUBLIC_KEY` | Yes | - | RSA public key in PEM format (with `\n` for newlines) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token expiration (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token expiration (e.g., `7d`, `30d`) |
| `JWT_ISSUER` | No | `horizon-auth` | JWT issuer claim |
| `JWT_AUDIENCE` | No | `horizon-api` | JWT audience claim |
| `JWT_KID` | No | `horizon-auth-key-1` | Key ID for JWKS |

*`JWT_PRIVATE_KEY` required when `AUTH_MODE=full`, optional when `AUTH_MODE=sso`

### Cookie Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COOKIE_DOMAIN` | Recommended | - | Cookie domain (e.g., `.yourdomain.com` for SSO) |
| `COOKIE_SECURE` | No | `true` in prod | Set to `true` for HTTPS only |
| `COOKIE_SAME_SITE` | No | `lax` | `strict`, `lax`, or `none` |

### SSO Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_SERVICE_URL` | Yes* | - | URL of the auth service (e.g., `https://auth.yourdomain.com`) |

*Required when `AUTH_MODE=sso`

### Multi-Tenant Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MULTI_TENANT` | No | `false` | Enable multi-tenancy |
| `TENANT_EXTRACTOR` | No | `header` | `header` or `subdomain` |
| `DEFAULT_TENANT_ID` | No | `default` | Default tenant ID |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_LOGIN` | No | `5/60` | Login rate limit (format: `limit/seconds`) |
| `RATE_LIMIT_REGISTER` | No | `3/60` | Register rate limit |
| `RATE_LIMIT_PASSWORD_RESET` | No | `3/3600` | Password reset rate limit |

### Email Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | - | `resend`, `sendgrid`, or `custom` |
| `EMAIL_API_KEY` | No | - | Email provider API key |
| `EMAIL_FROM` | No | `noreply@example.com` | From email address |

### Enhanced Features

#### Two-Factor Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_2FA` | No | `false` | Enable 2FA feature |
| `TWO_FACTOR_ISSUER` | No | `APP_NAME` | Issuer name shown in authenticator apps |
| `APP_NAME` | No | `MyApp` | Application name (used for 2FA issuer) |

#### Device Management

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_DEVICE_MGMT` | No | `false` | Enable device tracking |
| `MAX_DEVICES` | No | `10` | Maximum devices per user |

#### Push Notifications

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_PUSH` | No | `false` | Enable push notification tokens |

#### Account Management

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_ACCOUNT_MGMT` | No | `false` | Enable account deactivation/deletion |
| `ALLOW_REACTIVATION` | No | `true` | Allow users to reactivate accounts |

#### Social Login

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | `APP_URL/auth/google/callback` | Google OAuth callback URL |
| `FACEBOOK_APP_ID` | No | - | Facebook app ID |
| `FACEBOOK_APP_SECRET` | No | - | Facebook app secret |
| `FACEBOOK_CALLBACK_URL` | No | `APP_URL/auth/facebook/callback` | Facebook OAuth callback URL |
| `APP_URL` | No | - | Base URL of your application |

### Global Guards

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APPLY_JWT_GUARD_GLOBALLY` | No | `false` | Apply JWT guard to all routes by default |

## Complete Examples

### Example 1: Simple Embedded Auth

```env
# Minimal configuration for embedded auth
AUTH_MODE=full
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
REDIS_HOST=localhost
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"
```

### Example 2: Full-Featured Auth Service

```env
# Complete auth service with all features
AUTH_MODE=full
NODE_ENV=production

# Database & Redis
DATABASE_URL=postgresql://user:pass@db.example.com:5432/auth
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secret

# JWT
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"
JWT_ACCESS_EXPIRY=30m
JWT_REFRESH_EXPIRY=30d

# Cookies (for SSO)
COOKIE_DOMAIN=.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

# Rate Limiting
RATE_LIMIT_LOGIN=10/60
RATE_LIMIT_REGISTER=5/60
RATE_LIMIT_PASSWORD_RESET=3/3600

# Email
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_123456789
EMAIL_FROM=noreply@example.com

# Enhanced Features
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=MyCompany
MAX_DEVICES=15

# Social Login
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123
FACEBOOK_APP_ID=123456789
FACEBOOK_APP_SECRET=abc123def456
APP_URL=https://auth.example.com
```

### Example 3: SSO Client Project

```env
# Minimal SSO client configuration
AUTH_MODE=sso
AUTH_SERVICE_URL=https://auth.example.com
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.example.com
```

### Example 4: Local Development

```env
# Local development with all features
AUTH_MODE=full
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.localhost
COOKIE_SECURE=false

# Enable all features for testing
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=DevApp
```

## Tips & Best Practices

### 1. JWT Keys in ENV

For multiline keys, use `\n` for newlines:

```bash
# Generate keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Convert to ENV format (one line with \n)
JWT_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' private.pem)"
JWT_PUBLIC_KEY="$(awk '{printf "%s\\n", $0}' public.pem)"
```

### 2. Cookie Domain for SSO

Use a dot prefix to share cookies across subdomains:

```env
# ✅ Correct - works on all subdomains
COOKIE_DOMAIN=.yourdomain.com

# ❌ Wrong - only works on exact domain
COOKIE_DOMAIN=yourdomain.com
```

### 3. Security in Production

```env
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

### 4. Feature Flags

Enable only the features you need:

```env
# Minimal setup
ENABLE_2FA=false
ENABLE_DEVICE_MGMT=false
ENABLE_PUSH=false
ENABLE_ACCOUNT_MGMT=false

# Full setup
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
```

## Troubleshooting

### "JWT_PRIVATE_KEY is required when AUTH_MODE=full"

Make sure you've set `JWT_PRIVATE_KEY` in your `.env` file when using full mode.

### "AUTH_SERVICE_URL is required when AUTH_MODE=sso"

Set `AUTH_SERVICE_URL` to point to your auth service when using SSO mode.

### "JWT keys must be in PEM format"

Ensure your keys include the `-----BEGIN` and `-----END` markers and use `\n` for newlines.

### Keys not loading correctly

Check that your `.env` file is being loaded. You may need to install `dotenv`:

```bash
npm install dotenv
```

And load it in your `main.ts`:

```typescript
import 'dotenv/config';
```

## Migration from Code Config

If you're currently using code-based configuration, you can gradually migrate to ENV:

**Before:**
```typescript
HorizonAuthModule.forRoot({
  database: { url: 'postgresql://...' },
  redis: { host: 'localhost', port: 6379 },
  // ... more config
})
```

**After:**
```typescript
// Just set ENV variables and use:
HorizonAuthModule.forRoot()
```

**During Migration (hybrid):**
```typescript
// ENV variables are loaded automatically
// Code config overrides ENV
HorizonAuthModule.forRoot({
  jwt: {
    accessTokenExpiry: '30m', // Override ENV value
  },
})
```

---

**Need Help?** Check the [PRODUCTION-INTEGRATION-GUIDE.md](./PRODUCTION-INTEGRATION-GUIDE.md) for deployment instructions.
