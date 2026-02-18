# Test SSO Mode Locally - Complete Guide

## What We're Testing

Your backend (port 3001) will verify JWT tokens using only the public key - no database or Redis needed for auth.

## Quick Test

### 1. Start Your Backend

```bash
cd backend
npm run start:dev
```

Backend runs on port 3001 in SSO mode.

### 2. Test Public Route

```bash
curl http://localhost:3001/v1/test-sso/public
```

Expected:
```json
{
  "message": "This is a public route - no auth required",
  "timestamp": "..."
}
```

### 3. Test Protected Route with JWT Token

First, generate a test token:

```bash
node test-sso-simple.js
```

This will output a JWT token. Copy it and test the protected route:

```bash
# PowerShell
$token = "YOUR_TOKEN_HERE"
curl -UseBasicParsing http://localhost:3001/v1/test-sso/protected -Headers @{"Authorization"="Bearer $token"} | ConvertFrom-Json

# Bash/Linux
curl http://localhost:3001/v1/test-sso/protected \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected:
```json
{
  "message": "This is a protected route - auth required!",
  "user": {
    "id": "123",
    "email": "test@example.com",
    "roles": ["user"]
  },
  "timestamp": "..."
}
```

## What SSO Mode Means

- ✅ No database connection required for auth
- ✅ No Redis connection required
- ✅ Only public key needed
- ✅ Can verify tokens from any auth service
- ✅ Perfect for hobby projects that share authentication

## Check It Works

If your backend starts without errors and both routes work, SSO mode is configured correctly!

The backend is now ready to verify tokens from `auth.ofeklabs.com` once you deploy it.

## Three Modes of Operation

### 1. Local Development (Current Setup)
- Backend has its own auth (AuthModule, UsersModule, PrismaModule)
- Also includes HorizonAuth in SSO mode for testing
- Use for developing and testing locally

### 2. SSO Mode (Hobby Projects)
- Backend only has HorizonAuth in SSO mode
- No database or Redis for auth
- Verifies tokens from central auth service
- Perfect for amateur projects

### 3. Full Mode (Production Projects)
- Backend has HorizonAuth in full mode
- Includes database and Redis
- Complete auth service embedded
- Use for professional projects that need full control

## Switching Between Modes

### To Use SSO Mode Only (Hobby Projects)

Comment out your local modules in `backend/src/app.module.ts`:

```typescript
// Temporarily disabled for SSO mode
// PrismaModule,
// AuthModule,
// UsersModule,
```

### To Use Full Mode (Production Projects)

Change HorizonAuth configuration:

```typescript
HorizonAuthModule.forRoot({
  // Remove ssoMode: true
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
})
```

### To Use Local Development (Current)

Keep both! HorizonAuth in SSO mode + your local modules.

## Next Steps

1. Deploy auth service to `auth.ofeklabs.com`
2. Deploy this backend to `api.ofeklabs.com` or `project1.ofeklabs.com`
3. Both will share authentication via cookies
4. Test end-to-end authentication flow



