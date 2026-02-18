# SSO Mode Fix - Version 0.2.1

## Problem

Version 0.2.0 had SSO mode configuration but it didn't work properly. The AuthModule was importing UsersModule, RedisModule, and PrismaModule unconditionally, even in SSO mode, causing the application to fail when these dependencies weren't available.

## Solution

### 1. Created Separate JWT Strategy for SSO Mode

**New File:** `src/auth/strategies/jwt-sso.strategy.ts`

- Validates JWT tokens using only the public key
- No database or Redis dependencies
- Returns user information directly from the token payload

### 2. Made AuthModule Dynamic

**Updated:** `src/auth/auth.module.ts`

The AuthModule now has two factory methods:

- `forSsoMode()`: Minimal setup for token verification only
  - Imports: PassportModule, JwtModule
  - Providers: JwtSsoStrategy, JwtAuthGuard, RolesGuard, Reflector
  - No database, Redis, or user management

- `forFullMode()`: Complete auth service with all features
  - Imports: PassportModule, JwtModule, ThrottlerModule, UsersModule, RedisModule, PrismaModule
  - Controllers: AuthController, JwksController
  - Providers: AuthService, PasswordService, TokenService, JwtStrategy, JwtAuthGuard, RolesGuard, Reflector
  - Full authentication functionality

### 3. Updated HorizonAuthModule

**Updated:** `src/lib/horizon-auth.module.ts`

- Calls `AuthModule.forSsoMode()` when `ssoMode: true`
- Calls `AuthModule.forFullMode()` when `ssoMode: false` (default)

## Usage

### SSO Mode (Amateur Projects)

```typescript
HorizonAuthModule.forRoot({
  ssoMode: true,
  authServiceUrl: 'https://auth.ofeklabs.com',
  jwt: {
    publicKey: readFileSync('./certs/public.pem', 'utf8'),
  },
  cookie: {
    domain: '.ofeklabs.com',
    secure: true,
  },
})
```

**Requirements:**
- ✅ Only public key needed
- ✅ No database required
- ✅ No Redis required
- ✅ Verifies tokens from auth service

### Full Mode (Auth Service or Embedded)

```typescript
HorizonAuthModule.forRoot({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: 6379,
  },
  jwt: {
    privateKey: readFileSync('./certs/private.pem', 'utf8'),
    publicKey: readFileSync('./certs/public.pem', 'utf8'),
  },
  cookie: {
    domain: '.ofeklabs.com',
    secure: true,
  },
})
```

**Requirements:**
- ✅ Both private and public keys
- ✅ Database connection
- ✅ Redis connection
- ✅ Full auth service functionality

## Testing

Tested locally with:
1. Backend in SSO mode (port 3001)
2. JWT token verification using only public key
3. Protected routes with JWT authentication
4. Public routes without authentication

All tests passed successfully! ✅

## Migration from 0.2.0 to 0.2.1

No breaking changes! If you're using full mode, everything works the same. If you're using SSO mode, it now actually works! 🎉

## What's Next

- Publish to NPM as version 0.2.1
- Update documentation
- Test in production environment
