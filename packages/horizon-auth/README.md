# @ofeklabs/horizon-auth

Production-ready NestJS authentication module with 2026 security standards. Deploy once, use everywhere.

## Use Cases

### 1. Portfolio SSO (Recommended)
Deploy one auth service, use it across all your projects. Users sign in once and access everything.

```
auth.yourdomain.com (Auth Service)
    ↓ Shared Authentication
    ├── project1.yourdomain.com
    ├── project2.yourdomain.com
    └── project3.yourdomain.com
```

### 2. Embedded Auth
Each application has its own isolated authentication.

## Features

- 🔐 **Modern Security**: Argon2id password hashing, RS256 JWT signing
- 🔄 **Refresh Token Rotation**: Automatic token rotation with reuse detection
- 🚫 **Redis Blacklisting**: Revoked token management with TTL
- 🏢 **Multi-Tenant Support**: Built-in tenant isolation
- 🌍 **Cross-Language**: JWKS endpoint for polyglot microservices
- ⚡ **Rate Limiting**: Built-in protection against brute force attacks
- 🎯 **Type-Safe**: Full TypeScript support
- 📦 **Zero Config**: Sensible defaults, fully customizable

## Quick Start

### Portfolio SSO Setup (Recommended)

Deploy one auth service, use it across all your projects.

#### 1. Deploy Auth Service (One Time)

```bash
# Clone and deploy packages/horizon-auth to auth.yourdomain.com
npm install
npm run build
npm run start:prod
```

**Environment Variables**:
```env
DATABASE_URL=postgresql://...
REDIS_HOST=your-redis-host
JWT_PRIVATE_KEY=<your-private-key>
JWT_PUBLIC_KEY=<your-public-key>
COOKIE_DOMAIN=.yourdomain.com
NODE_ENV=production
```

#### 2. Use in Your Projects

For each project:

```bash
npm install @ofeklabs/horizon-auth
```

```typescript
// app.module.ts
HorizonAuthModule.forRoot({
  ssoMode: true,
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
  },
})
```

```env
# .env
AUTH_SERVICE_URL=https://auth.yourdomain.com
JWT_PUBLIC_KEY=<paste-public-key>
COOKIE_DOMAIN=.yourdomain.com
```

Deploy to:
- project1.yourdomain.com
- project2.yourdomain.com
- project3.yourdomain.com

Users sign in once, access all projects.

---

### Embedded Auth Setup (Alternative)

Each application has its own authentication.

### 1. Install

```bash
npm install @ofeklabs/horizon-auth @prisma/client ioredis passport passport-jwt
npm install -D prisma
```

### 2. Generate RSA Keys

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem
```

### 3. Configure Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      jwt: {
        // For production: use environment variables
        privateKey: process.env.JWT_PRIVATE_KEY || readFileSync(join(__dirname, '../certs/private.pem'), 'utf8'),
        publicKey: process.env.JWT_PUBLIC_KEY || readFileSync(join(__dirname, '../certs/public.pem'), 'utf8'),
      },
    }),
  ],
})
export class AppModule {}
```

### 4. Set Up Database

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run Prisma migrations
npx prisma migrate dev
```

### 5. Use in Controllers

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  Public,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  LoginDto,
  RegisterDto,
} from '@ofeklabs/horizon-auth';

@Controller()
export class AppController {
  // Public endpoint - no authentication required
  @Public()
  @Get()
  getHello() {
    return { message: 'Hello World' };
  }

  // Protected endpoint - requires JWT
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user) {
    return user;
  }

  // Role-based access control
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Get('admin')
  adminOnly() {
    return { message: 'Admin access granted' };
  }
}
```

## API Endpoints

The package automatically provides these endpoints:

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/profile` - Get current user profile

### Password Management

- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/complete` - Complete password reset
- `POST /auth/verify-email` - Verify email address

### Cross-Language Support

- `GET /.well-known/jwks.json` - Public keys for JWT verification

## Configuration Options

```typescript
interface HorizonAuthConfig {
  // Required
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  jwt: {
    privateKey: string; // RSA private key (PEM format)
    publicKey: string; // RSA public key (PEM format)
    accessTokenExpiry?: string; // Default: '15m'
    refreshTokenExpiry?: string; // Default: '7d'
    issuer?: string; // Default: 'horizon-auth'
    audience?: string; // Default: 'horizon-api'
  };

  // Optional
  multiTenant?: {
    enabled: boolean;
    tenantIdExtractor?: 'header' | 'subdomain' | 'custom';
    defaultTenantId?: string;
  };
  rateLimit?: {
    login?: { limit: number; ttl: number };
    register?: { limit: number; ttl: number };
    passwordReset?: { limit: number; ttl: number };
  };
  guards?: {
    applyJwtGuardGlobally?: boolean;
  };
}
```

## Decorators

### @Public()
Mark routes as publicly accessible (skip authentication)

```typescript
@Public()
@Get('public')
publicRoute() {
  return { message: 'No auth required' };
}
```

### @CurrentUser()
Inject authenticated user into controller

```typescript
@Get('me')
getMe(@CurrentUser() user) {
  return user;
}
```

### @Roles(...roles)
Require specific roles for access

```typescript
@Roles('admin', 'moderator')
@Get('admin')
adminRoute() {
  return { message: 'Admin only' };
}
```

### @CurrentTenant()
Get current tenant ID

```typescript
@Get('tenant-data')
getTenantData(@CurrentTenant() tenantId: string) {
  return { tenantId };
}
```

## Multi-Tenant Configuration

```typescript
HorizonAuthModule.forRoot({
  // ... other config
  multiTenant: {
    enabled: true,
    tenantIdExtractor: 'header', // or 'subdomain' or 'custom'
    defaultTenantId: 'default',
  },
});
```

## Dev SSO Mode

For local development with multiple microservices:

```yaml
# docker-compose.dev-sso.yml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - '3000:3000'
    environment:
      COOKIE_DOMAIN: '.localhost'
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
```

All `*.localhost:3000` apps will share the same authentication session.

## Cross-Language Token Verification

### C# Example

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

var jwks = await httpClient.GetStringAsync("http://auth-service/.well-known/jwks.json");
var keys = JsonConvert.DeserializeObject<JsonWebKeySet>(jwks);

var tokenHandler = new JwtSecurityTokenHandler();
var validationParameters = new TokenValidationParameters
{
    ValidateIssuerSigningKey = true,
    IssuerSigningKeys = keys.Keys,
    ValidateIssuer = true,
    ValidIssuer = "horizon-auth",
    ValidateAudience = true,
    ValidAudience = "horizon-api"
};

var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
```

### Python Example

```python
import jwt
import requests

# Fetch JWKS
jwks_url = "http://auth-service/.well-known/jwks.json"
jwks = requests.get(jwks_url).json()

# Verify token
token = "your-jwt-token"
decoded = jwt.decode(
    token,
    jwks,
    algorithms=["RS256"],
    issuer="horizon-auth",
    audience="horizon-api"
)
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store RSA keys securely** (environment variables, secrets manager)
3. **Enable rate limiting** to prevent brute force attacks
4. **Monitor security events** (failed logins, token reuse)
5. **Rotate JWT keys periodically**
6. **Use strong Redis passwords** in production

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/horizon_auth

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Keys (for production - use multiline env vars)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"

# Application
NODE_ENV=production
PORT=3000

# Optional: SSO Mode
AUTH_SERVICE_URL=https://auth.ofeklabs.dev
```

## Production Deployment

### Portfolio SSO Architecture (Recommended)

Perfect for portfolios, demo sites, or related projects.

**Benefits**:
- One login for all projects
- Consistent user experience
- No duplicate auth code
- Single point of maintenance
- Professional appearance

**Setup**:

1. Deploy auth service to `auth.yourdomain.com`
2. Install package in each project
3. Configure SSO mode with `AUTH_SERVICE_URL`
4. Deploy projects to subdomains

See [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) for complete guide.

### Deploy to Render

#### 1. Deploy Auth Service

Create a new Web Service on Render:

**Environment Variables**:
```env
DATABASE_URL=<your-postgres-url>
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
JWT_PRIVATE_KEY=<paste-private-key-with-\n>
JWT_PUBLIC_KEY=<paste-public-key-with-\n>
NODE_ENV=production
COOKIE_DOMAIN=.ofeklabs.dev
COOKIE_SECURE=true
```

**Build Command**: `npm install && npm run build`

**Start Command**: `npm run start:prod`

#### 2. Deploy Your Apps (SSO Mode)

For each app (tasks, CRM, analytics):

```typescript
// app.module.ts
HorizonAuthModule.forRoot({
  ssoMode: true,
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'https://auth.ofeklabs.dev',
  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || '.ofeklabs.dev',
    secure: process.env.NODE_ENV === 'production',
  },
})
```

**Environment Variables**:
```env
AUTH_SERVICE_URL=https://auth.ofeklabs.dev
JWT_PUBLIC_KEY=<paste-public-key-with-\n>
COOKIE_DOMAIN=.ofeklabs.dev
NODE_ENV=production
```

#### 3. Configure Custom Domains

On Render, add custom domains:
- Auth service: `auth.ofeklabs.dev`
- Tasks app: `tasks.ofeklabs.dev`
- CRM app: `crm.ofeklabs.dev`

All apps will share authentication via cookies! 🎉

### Deploy to AWS/Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

```bash
# Build and run
docker build -t horizon-auth .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="redis" \
  -e JWT_PRIVATE_KEY="$(cat certs/private.pem)" \
  -e JWT_PUBLIC_KEY="$(cat certs/public.pem)" \
  horizon-auth
```

### Environment Variable Best Practices

1. **Never commit keys to Git**
2. **Use secrets manager** (AWS Secrets Manager, Render Secrets)
3. **Rotate keys periodically**
4. **Use different keys** for dev/staging/production
5. **Store keys as multiline strings** with `\n` for newlines

## Troubleshooting

### "Invalid or expired access token"
- Check that your JWT keys are correctly configured
- Verify token hasn't expired (default 15 minutes)
- Ensure token isn't blacklisted

### "Redis connection error"
- Verify Redis is running: `docker ps`
- Check Redis connection settings
- Test connection: `redis-cli ping`

### "Token reuse detected"
- This is a security feature - someone tried to reuse a revoked refresh token
- All user tokens have been revoked for security
- User needs to login again

## Migration from Existing Auth

See [MIGRATION.md](./MIGRATION.md) for guides on:
- Migrating from bcrypt to Argon2id
- Migrating from HS256 to RS256
- Database schema migration

## License

MIT

## Support

- GitHub Issues: https://github.com/OfekItzhaki/horizon-auth-platform/issues
- Documentation: https://github.com/OfekItzhaki/horizon-auth-platform

## Credits

Created by Ofek Itzhaki
