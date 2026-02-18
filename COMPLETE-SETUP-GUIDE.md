# Complete Setup Guide - Horizon Auth Platform

## Overview

The Horizon Auth Platform now supports three distinct modes of operation, giving you flexibility for different project types.

## The Three Modes

### 1. 🔧 Local Development Mode
**What:** Backend with both local auth modules AND HorizonAuth in SSO mode
**When:** Developing and testing locally
**Why:** Test SSO functionality while maintaining local auth for development

```typescript
// backend/src/app.module.ts
@Module({
  imports: [
    // HorizonAuth in SSO mode
    HorizonAuthModule.forRoot({
      ssoMode: true,
      authServiceUrl: 'http://localhost:3000',
      jwt: { publicKey: readFileSync('./certs/public.pem', 'utf8') },
    }),
    
    // Your local modules
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
})
```

**Features:**
- ✅ Test SSO token verification
- ✅ Develop local auth features
- ✅ No external dependencies
- ✅ Full control

---

### 2. 🎨 SSO Mode (Hobby Projects)
**What:** Backend with ONLY HorizonAuth in SSO mode
**When:** Deploying hobby/amateur projects
**Why:** Share authentication across multiple projects without managing databases

```typescript
// backend/src/app.module.ts
@Module({
  imports: [
    HorizonAuthModule.forRoot({
      ssoMode: true,
      authServiceUrl: 'https://auth.ofeklabs.com',
      jwt: { publicKey: process.env.JWT_PUBLIC_KEY },
      cookie: {
        domain: '.ofeklabs.com',
        secure: true,
      },
    }),
    // No local auth modules needed!
  ],
})
```

**Features:**
- ✅ No database required
- ✅ No Redis required
- ✅ Only public key needed
- ✅ Shared auth across *.ofeklabs.com
- ✅ Perfect for side projects

**Setup:**
1. Deploy central auth service to `auth.ofeklabs.com`
2. Deploy your project to `project1.ofeklabs.com`
3. Share the public key
4. Done! Authentication works across both

---

### 3. 🏢 Full Mode (Production Projects)
**What:** Backend with HorizonAuth in full mode (embedded auth service)
**When:** Professional/production projects
**Why:** Full control, no external dependencies, complete feature set

```typescript
// backend/src/app.module.ts
@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY,
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: true,
      },
    }),
  ],
})
```

**Features:**
- ✅ Complete auth service embedded
- ✅ Full control over data
- ✅ No external auth dependencies
- ✅ All features available
- ✅ Production-ready

---

## Decision Tree

```
Do you need authentication?
│
├─ Yes, for local development
│  └─ Use: Local Development Mode
│     - Keep both local modules and HorizonAuth SSO
│
├─ Yes, for a hobby project
│  └─ Use: SSO Mode
│     - Remove local auth modules
│     - Point to central auth service
│     - No database/Redis needed
│
└─ Yes, for a production project
   └─ Use: Full Mode
      - Remove local auth modules
      - Configure database and Redis
      - Embed complete auth service
```

## Current Setup

Your current backend is in **Local Development Mode**:
- HorizonAuth in SSO mode (testing)
- Local AuthModule, UsersModule, PrismaModule (development)

## Switching Modes

### To SSO Mode (Hobby Projects)

1. Comment out local modules in `backend/src/app.module.ts`:
```typescript
// PrismaModule,
// AuthModule,
// UsersModule,
```

2. Update auth service URL:
```typescript
authServiceUrl: 'https://auth.ofeklabs.com',
```

3. Deploy!

### To Full Mode (Production)

1. Remove local modules from imports

2. Change HorizonAuth config:
```typescript
HorizonAuthModule.forRoot({
  // Remove ssoMode: true
  database: { url: process.env.DATABASE_URL },
  redis: { host: process.env.REDIS_HOST, port: 6379 },
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
})
```

3. Set up database and Redis

4. Deploy!

## Package Version

Current: `@ofeklabs/horizon-auth@0.2.1`

Install:
```bash
npm install @ofeklabs/horizon-auth@latest
```

## Testing

### Test SSO Mode Locally

```bash
# Start backend
cd backend
npm run start:dev

# Test public route
curl http://localhost:3001/v1/test-sso/public

# Generate test token
node test-sso-simple.js

# Test protected route
curl http://localhost:3001/v1/test-sso/protected \
  -H "Authorization: Bearer YOUR_TOKEN"
```

See `TEST-SSO-LOCALLY.md` for complete testing guide.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
├─────────────────────────────────────────────────────────────┤
│  Backend (localhost:3001)                                    │
│  ├─ HorizonAuth (SSO mode) ← Testing                        │
│  ├─ Local AuthModule       ← Development                    │
│  ├─ Local UsersModule                                        │
│  └─ Local PrismaModule                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SSO Mode (Hobby)                          │
├─────────────────────────────────────────────────────────────┤
│  Auth Service (auth.ofeklabs.com)                           │
│  └─ HorizonAuth (Full mode)                                 │
│                                                              │
│  Project 1 (project1.ofeklabs.com)                          │
│  └─ HorizonAuth (SSO mode) ← Verifies tokens                │
│                                                              │
│  Project 2 (project2.ofeklabs.com)                          │
│  └─ HorizonAuth (SSO mode) ← Verifies tokens                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Full Mode (Production)                    │
├─────────────────────────────────────────────────────────────┤
│  Backend (api.yourcompany.com)                              │
│  └─ HorizonAuth (Full mode)                                 │
│     ├─ Database                                              │
│     ├─ Redis                                                 │
│     └─ Complete auth service                                │
└─────────────────────────────────────────────────────────────┘
```

## Summary

✅ **Local Development:** Test everything locally
✅ **SSO Mode:** Share auth across hobby projects
✅ **Full Mode:** Complete control for production

Choose the mode that fits your project needs!
