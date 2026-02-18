# @ofeklabs/horizon-auth

Production-ready NestJS authentication module with 2026 security standards. One package, two modes: embedded auth or SSO - configured entirely through ENV variables.

## 🎯 Use Cases

### 1. Embedded Auth
Each application has its own isolated authentication. Perfect for standalone apps.

```
myapp.com (App + Auth)
```

### 2. Portfolio SSO (Recommended)
Deploy one auth service, use it across all your projects. Users sign in once and access everything.

```
auth.yourdomain.com (Auth Service)
    ↓ Shared Authentication
    ├── project1.yourdomain.com
    ├── project2.yourdomain.com
    └── project3.yourdomain.com
```

**Same package, different ENV variables!** No code changes needed.

## Features

- 🔐 **Modern Security**: Argon2id password hashing, RS256 JWT signing
- 🔄 **Refresh Token Rotation**: Automatic token rotation with reuse detection
- 🚫 **Redis Blacklisting**: Revoked token management with TTL
- 🏢 **Multi-Tenant Support**: Built-in tenant isolation
- 🌍 **Cross-Language**: JWKS endpoint for polyglot microservices
- ⚡ **Rate Limiting**: Built-in protection against brute force attacks
- 🎯 **Type-Safe**: Full TypeScript support
- 📦 **Zero Config**: Sensible defaults, fully customizable

### 🆕 Enterprise Features (v0.3.0)

- 🔒 **Two-Factor Authentication**: TOTP-based 2FA with QR codes and backup codes
- 📱 **Device Management**: Track, list, and revoke user devices
- 🔔 **Push Notifications**: Register and manage push tokens (FCM/APNS)
- 👤 **Account Management**: Deactivate, reactivate, and delete accounts
- 🌐 **Social Login**: Google and Facebook OAuth integration

## 🚀 Quick Start

### Installation

```bash
npm install @ofeklabs/horizon-auth @prisma/client ioredis passport passport-jwt
npm install -D prisma
```

### Generate RSA Keys

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

---

## Configuration Options

### Option 1: Environment Variables Only (Recommended ⭐)

**Zero code configuration** - just set ENV variables and you're done!

#### Embedded Mode (Standalone App)

```env
# .env
AUTH_MODE=full
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Optional: Enable features
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=MyApp
```

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

#### SSO Mode (Multiple Projects, One Auth)

**Auth Service (auth.yourdomain.com):**
```env
AUTH_MODE=full
DATABASE_URL=postgresql://user:password@host:5432/auth_db
REDIS_HOST=redis.yourdomain.com
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.yourdomain.com
NODE_ENV=production
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
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

```typescript
// app.module.ts (same for all projects)
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot(), // 👈 Automatically uses SSO mode from ENV
  ],
})
export class AppModule {}
```

**That's it!** Deploy your auth service once, then use the same package in all your projects with different ENV variables. No code changes needed!

**📚 See [ENV-CONFIGURATION.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/ENV-CONFIGURATION.md) for complete ENV reference.**

**📖 See [DEPLOYMENT-EXAMPLES.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/DEPLOYMENT-EXAMPLES.md) for real-world deployment scenarios.**

---

### Option 2: Code Configuration (Advanced)

If you prefer code-based configuration or need dynamic config:

### Option 2: Code Configuration (Advanced)

If you prefer code-based configuration or need dynamic config:

#### Embedded Mode

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY,
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
      features: {
        twoFactor: {
          enabled: true,
          issuer: 'YourApp',
        },
        deviceManagement: {
          enabled: true,
        },
      },
    }),
  ],
})
export class AppModule {}
```

#### SSO Mode

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
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
    }),
  ],
})
export class AppModule {}
```

**Note:** ENV variables are still loaded automatically. Code config overrides ENV values.

---

## 🗄️ Database Setup

```bash
# Start PostgreSQL and Redis (using Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d -p 6379:6379 redis:7-alpine

# Run Prisma migrations
npx prisma migrate dev
```

---

## 🎨 Use in Your Application

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  Public,
  CurrentUser,
  JwtAuthGuard,
  Roles,
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

---

## 📡 API Endpoints

The package automatically provides these endpoints:

### Core Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/profile` - Get current user profile
- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/complete` - Complete password reset
- `POST /auth/verify-email` - Verify email address

### Enterprise Features (v0.3.0+)

**Two-Factor Authentication:**
- `POST /auth/2fa/enable` - Enable 2FA and get QR code
- `POST /auth/2fa/verify` - Verify 2FA setup
- `POST /auth/2fa/verify-login` - Complete login with 2FA
- `POST /auth/2fa/disable` - Disable 2FA
- `POST /auth/2fa/backup-codes/regenerate` - Regenerate backup codes

**Device Management:**
- `GET /auth/devices` - List user's active devices
- `POST /auth/devices/:deviceId/revoke` - Revoke specific device

**Push Notifications:**
- `POST /auth/push-tokens` - Register push notification token
- `DELETE /auth/push-tokens/:tokenId` - Revoke push token

**Account Management:**
- `POST /auth/account/deactivate` - Deactivate account
- `POST /auth/account/reactivate` - Reactivate account
- `DELETE /auth/account` - Permanently delete account

**Social Login:**
- `POST /auth/social/google` - Google OAuth callback
- `POST /auth/social/facebook` - Facebook OAuth callback

### Cross-Language Support

- `GET /.well-known/jwks.json` - Public keys for JWT verification

---

## 🎯 How SSO Mode Works

When you deploy in SSO mode, here's what happens:

1. **Auth Service (auth.yourdomain.com):**
   - Runs in `AUTH_MODE=full`
   - Has database and Redis
   - Handles login, registration, 2FA, etc.
   - Issues JWT tokens
   - Sets cookies for `.yourdomain.com`

2. **Your Projects (project1.yourdomain.com, project2.yourdomain.com):**
   - Run in `AUTH_MODE=sso`
   - No database or Redis needed
   - Only verify JWT tokens using public key
   - Read cookies from `.yourdomain.com`
   - Users are automatically authenticated!

3. **User Experience:**
   - User visits `project1.yourdomain.com`
   - Not logged in → Your frontend redirects to `auth.yourdomain.com/login`
   - User logs in at auth service
   - Cookie set for `.yourdomain.com`
   - Redirect back to `project1.yourdomain.com`
   - User is now logged in!
   - User visits `project2.yourdomain.com` → Already logged in! (same cookie)

**Important:** This package is API-only. You need to build your own login/register UI that calls the auth endpoints.

---

## 🔧 Configuration Reference

## 🔧 Configuration Reference

### Complete Configuration Interface

```typescript
interface HorizonAuthConfig {
  // Mode Selection
  ssoMode?: boolean; // false = full auth service, true = token verification only
  authServiceUrl?: string; // Required when ssoMode=true
  
  // Database (required when ssoMode=false)
  database?: {
    url: string;
  };
  
  // Redis (required when ssoMode=false)
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // JWT (always required)
  jwt: {
    privateKey?: string; // Required when ssoMode=false
    publicKey: string; // Always required
    accessTokenExpiry?: string; // Default: '15m'
    refreshTokenExpiry?: string; // Default: '7d'
    issuer?: string; // Default: 'horizon-auth'
    audience?: string; // Default: 'horizon-api'
    kid?: string; // Default: 'horizon-auth-key-1'
  };
  
  // Cookie Configuration
  cookie?: {
    domain?: string; // e.g., '.yourdomain.com' for SSO
    secure?: boolean; // Default: true in production
    sameSite?: 'strict' | 'lax' | 'none'; // Default: 'lax'
  };
  
  // Multi-Tenant Support
  multiTenant?: {
    enabled: boolean;
    tenantIdExtractor?: 'header' | 'subdomain' | 'custom';
    defaultTenantId?: string;
  };
  
  // Rate Limiting
  rateLimit?: {
    login?: { limit: number; ttl: number };
    register?: { limit: number; ttl: number };
    passwordReset?: { limit: number; ttl: number };
  };
  
  // Email Configuration
  email?: {
    provider: 'resend' | 'sendgrid' | 'custom';
    apiKey?: string;
    from?: string;
  };
  
  // Global Guards
  guards?: {
    applyJwtGuardGlobally?: boolean;
  };
  
  // Enterprise Features
  features?: {
    twoFactor?: {
      enabled: boolean;
      issuer?: string; // Shows in authenticator apps
    };
    deviceManagement?: {
      enabled: boolean;
      maxDevicesPerUser?: number;
    };
    pushNotifications?: {
      enabled: boolean;
    };
    accountManagement?: {
      enabled: boolean;
      allowReactivation?: boolean;
    };
    socialLogin?: {
      google?: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
      };
      facebook?: {
        appId: string;
        appSecret: string;
        callbackUrl: string;
      };
    };
  };
}
```

**💡 Tip:** Use ENV variables instead of code config for maximum flexibility!

---

## 🎭 Decorators

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

## Enterprise Features Usage

### Two-Factor Authentication

```typescript
// Enable 2FA for a user
const setup = await fetch('/auth/2fa/enable', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { secret, qrCode } = await setup.json();

// Display QR code to user (qrCode is a data URL)
// User scans with Google Authenticator or Authy

// Verify setup with code from authenticator
await fetch('/auth/2fa/verify', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code: '123456' }),
});

// Login with 2FA
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

if (loginResponse.requiresTwoFactor) {
  // Prompt user for 2FA code
  await fetch('/auth/2fa/verify-login', {
    method: 'POST',
    body: JSON.stringify({
      userId: loginResponse.userId,
      code: '123456', // or backup code
    }),
  });
}
```

### Device Management

```typescript
// List user's devices (automatically tracked on login)
const devices = await fetch('/auth/devices', {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

// Revoke a specific device
await fetch(`/auth/devices/${deviceId}/revoke`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

### Push Notifications

```typescript
// Register push token (requires device from login)
await fetch('/auth/push-tokens', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken, // From Firebase Cloud Messaging
    tokenType: 'FCM', // or 'APNS' for iOS
    deviceId: deviceId, // From device list
  }),
});
```

### Account Management

```typescript
// Deactivate account
await fetch('/auth/account/deactivate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reason: 'Taking a break',
  }),
});

// Reactivate account (no auth required)
await fetch('/auth/account/reactivate', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

// Permanently delete account
await fetch('/auth/account', {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

---

## 🌐 Cross-Language Token Verification
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

### "Device ID required for push tokens"
- Push tokens require a valid deviceId
- Devices are created automatically on login (not registration)
- Login first, then get device list, then register push token

### "Feature disabled" error
- The feature you're trying to use is not enabled in configuration
- Enable it in `HorizonAuthModule.forRoot({ features: { ... } })`

## Testing Status

**✅ Fully Tested:**
- User registration and login
- JWT token generation and validation
- Refresh token rotation
- 2FA setup (QR code generation)
- Account deactivation/reactivation
- Login protection for deactivated accounts

**⚠️ Requires Manual Testing:**
- 2FA login flow (requires actual authenticator app)
- Device tracking (automatic on login)
- Push token registration (requires valid device)
- Social login (requires OAuth credentials from Google/Facebook)
- Backup codes usage during login

## 🌐 Cross-Platform Support

**Works with ANY backend language!** Your auth service issues JWT tokens that can be verified by:
- ✅ NestJS (use package in SSO mode)
- ✅ .NET / C# (JWT Bearer Auth)
- ✅ Python (PyJWT)
- ✅ Go (golang-jwt)
- ✅ Java / Spring Boot (OAuth2 Resource Server)
- ✅ PHP (Firebase JWT)
- ✅ Any language with JWT support!

**📖 See [CROSS-PLATFORM-INTEGRATION.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/CROSS-PLATFORM-INTEGRATION.md) for complete integration guides with code examples.**

---

## 🌐 Cross-Language Token Verification

Your other services (in any language) can verify tokens using the JWKS endpoint:

### C# Example

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

var jwks = await httpClient.GetStringAsync("https://auth.yourdomain.com/.well-known/jwks.json");
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
jwks_url = "https://auth.yourdomain.com/.well-known/jwks.json"
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

---

## 🐛 Troubleshooting

### "AUTH_SERVICE_URL is required when AUTH_MODE=sso"
Set `AUTH_SERVICE_URL` in your ENV file when using SSO mode.

### "JWT_PRIVATE_KEY is required when AUTH_MODE=full"
Make sure you've set `JWT_PRIVATE_KEY` when running in full mode (auth service).

### "Invalid or expired access token"
- Check that your JWT keys are correctly configured
- Verify token hasn't expired (default 15 minutes)
- Ensure token isn't blacklisted in Redis

### "Redis connection error"
- Verify Redis is running: `docker ps` or check your cloud Redis service
- Check Redis connection settings in ENV
- Test connection: `redis-cli ping`

### "Token reuse detected"
- This is a security feature - someone tried to reuse a revoked refresh token
- All user tokens have been revoked for security
- User needs to login again

### "Device ID required for push tokens"
- Push tokens require a valid deviceId
- Devices are created automatically on login (not registration)
- Login first, then get device list, then register push token

### "Feature disabled" error
- The feature you're trying to use is not enabled
- Enable it via ENV: `ENABLE_2FA=true`, `ENABLE_DEVICE_MGMT=true`, etc.

### Cookies not working across subdomains
- Make sure `COOKIE_DOMAIN` starts with a dot: `.yourdomain.com`
- Verify `COOKIE_SECURE=true` in production (requires HTTPS)
- Check that all apps use the same cookie domain

---

## 📚 Documentation

- **[ENV-CONFIGURATION.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/ENV-CONFIGURATION.md)** - Complete environment variable reference
- **[DEPLOYMENT-EXAMPLES.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/DEPLOYMENT-EXAMPLES.md)** - Real-world deployment scenarios
- **[CROSS-PLATFORM-INTEGRATION.md](https://github.com/OfekItzhaki/horizon-auth-platform/blob/main/CROSS-PLATFORM-INTEGRATION.md)** - Integration with .NET, Python, Go, Java, PHP
- **[GitHub Repository](https://github.com/OfekItzhaki/horizon-auth-platform)** - Source code and issues

---

## 🧪 Testing Status

**✅ Fully Tested:**
- User registration and login
- JWT token generation and validation
- Refresh token rotation
- 2FA setup (QR code generation)
- Account deactivation/reactivation
- Login protection for deactivated accounts
- SSO mode token verification

**⚠️ Requires Manual Testing:**
- 2FA login flow (requires actual authenticator app)
- Device tracking (automatic on login)
- Push token registration (requires valid device)
- Social login (requires OAuth credentials from Google/Facebook)
- Backup codes usage during login

---

## 📦 What's New

### v0.4.1 (Latest)
- 📝 **Cross-platform integration guide** - Complete examples for .NET, Python, Go, Java, PHP
- 📝 Enhanced README with cross-platform support section
- 🌐 JWKS endpoint documentation for polyglot architectures

### v0.4.0
- ✨ **ENV-based configuration** - Zero code changes needed!
- ✨ **Flexible deployment** - Same package for embedded and SSO modes
- 📝 Complete ENV variable documentation
- 📝 Real-world deployment examples
- 🔧 Improved configuration merging

### v0.3.0
- ✨ Two-Factor Authentication (TOTP)
- ✨ Device Management
- ✨ Push Notifications
- ✨ Account Management
- ✨ Social Login (Google, Facebook)

### v0.2.1
- 🐛 Fixed SSO mode JWT strategy
- 🔧 Dynamic module configuration

---

## 📄 License

MIT

---

## 🤝 Support

- **Issues:** [GitHub Issues](https://github.com/OfekItzhaki/horizon-auth-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/OfekItzhaki/horizon-auth-platform/discussions)

---

## 👨‍💻 Author

Created by **Ofek Itzhaki**

---

**⭐ If this package helps you, consider giving it a star on GitHub!**
