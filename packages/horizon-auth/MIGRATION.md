# Migration Guide: HorizonAuth

## v1.0.5 - Diagnostic Logging (Temporary)

### Overview

HorizonAuth v1.0.5 adds extensive logging to diagnose runtime issues. This is a temporary diagnostic version.

**IMPORTANT DISCOVERY**: If you see logs showing `this.prisma` is defined but get errors like "Cannot read properties of undefined (reading 'findUnique')", the issue is that your Prisma schema is missing the required models!

### Required Prisma Schema

The @ofeklabs/horizon-auth package requires specific Prisma models in your application's schema. You MUST add these models to your `schema.prisma`:

#### Required Models:
1. **User** - Core user model with authentication fields
2. **RefreshToken** - JWT refresh token storage
3. **SocialAccount** - OAuth social login accounts (if using social login feature)
4. **Device** - Device management (if using device management feature)
5. **PushToken** - Push notification tokens (if using push notifications feature)
6. **TwoFactorAuth** - 2FA TOTP secrets (if using 2FA feature)
7. **BackupCode** - 2FA backup codes (if using 2FA feature)

### Migration Steps

#### Step 1: Copy the Schema

Copy the complete schema from `node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma` to your application's `prisma/schema.prisma`.

**IMPORTANT**: Merge the models into your existing schema - don't replace your entire schema!

```prisma
// Your existing datasource and generator
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ADD these models from @ofeklabs/horizon-auth
model User {
  id                 String          @id @default(cuid())
  email              String          @unique
  fullName           String?
  passwordHash       String?
  emailVerified      Boolean         @default(false)
  emailVerifyToken   String?         @unique
  resetToken         String?         @unique
  resetTokenExpiry   DateTime?
  tenantId           String          @default("default")
  roles              String[]        @default(["user"])
  isActive           Boolean         @default(true)
  deactivationReason String?
  refreshTokens      RefreshToken[]
  socialAccounts     SocialAccount[]
  devices            Device[]
  pushTokens         PushToken[]
  twoFactorAuth      TwoFactorAuth?
  backupCodes        BackupCode[]
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@index([email])
  @@index([tenantId])
  @@index([isActive])
  @@map("users")
}

model RefreshToken {
  id            String    @id @default(cuid())
  hashedToken   String    @unique
  userId        String
  deviceId      String?
  expiresAt     DateTime
  parentTokenId String?
  revoked       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  device        Device?   @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([deviceId])
  @@index([hashedToken])
  @@map("refresh_tokens")
}

// ... (copy remaining models from the package schema)
```

#### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

#### Step 3: Create and Run Migration

```bash
npx prisma migrate dev --name add-horizon-auth-models
```

#### Step 4: Update to v1.0.5

```bash
npm install @ofeklabs/horizon-auth@1.0.5
```

### Troubleshooting

#### Error: "Cannot read properties of undefined (reading 'findUnique')"

**Cause**: Your Prisma schema is missing the User model or other required models.

**Solution**: Follow Step 1 above to add all required models to your schema.

#### Error: "Invalid `prisma.user.findUnique()` invocation"

**Cause**: Prisma Client wasn't regenerated after adding the models.

**Solution**: Run `npx prisma generate` and restart your application.

---

## v1.0.4 - TypeScript Compilation Fix

### Overview

HorizonAuth v1.0.4 fixes a critical runtime issue where `this.prisma` becomes undefined when methods are called, even though constructor injection succeeds. This was caused by TypeScript's `useDefineForClassFields` behavior with ES2021 target.

### The Problem

With TypeScript's default `useDefineForClassFields: true` (implicit with ES2021 target):
1. Constructor parameter injection works correctly (`this.prisma` is defined)
2. Constructor validation passes
3. TypeScript then uses `Object.defineProperty()` to define class fields AFTER the constructor
4. This overwrites the injected value with `undefined`
5. Runtime methods fail with "Cannot read properties of undefined"

### The Fix

Set `useDefineForClassFields: false` in `tsconfig.json` to use legacy class field behavior compatible with NestJS dependency injection.

### Migration Steps

**No code changes required!** Simply update to v1.0.4:

```bash
npm install @ofeklabs/horizon-auth@1.0.4
```

This version includes the corrected TypeScript compilation settings.

### Symptoms This Fixes

- ✅ Constructor validation passes (no errors during startup)
- ❌ Runtime errors: `Cannot read properties of undefined (reading 'findUnique')`
- ❌ `this.prisma` is undefined inside service methods
- ❌ Error occurs only when methods are called, not during construction

---

## v1.0.2 - String-Based Injection Token

### Overview

HorizonAuth v1.0.2 fixes a critical Prisma dependency injection issue by using a string-based injection token (`PRISMA_CLIENT_TOKEN`) instead of class-based injection. This eliminates minification issues that caused "Cannot resolve dependencies" errors.

## Breaking Changes

### PrismaClient Injection Token Changed

**Before (v1.0.0 - v1.0.1):**
```typescript
// Your PrismaModule provided PrismaClient directly
import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PrismaClient, // ❌ Class-based token (minification issues)
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, PrismaClient],
})
export class PrismaModule {}
```

**After (v1.0.2):**
```typescript
// Your PrismaModule must use PRISMA_CLIENT_TOKEN
import { Global, Module } from '@nestjs/common';
import { PRISMA_CLIENT_TOKEN } from '@ofeklabs/horizon-auth'; // ✅ Import the token
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PRISMA_CLIENT_TOKEN, // ✅ String-based token (no minification issues)
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, PRISMA_CLIENT_TOKEN],
})
export class PrismaModule {}
```

## Migration Steps

### Step 1: Update @ofeklabs/horizon-auth

```bash
npm install @ofeklabs/horizon-auth@1.0.2
```

### Step 2: Update Your PrismaModule

Import `PRISMA_CLIENT_TOKEN` from `@ofeklabs/horizon-auth` and use it as the injection token:

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PRISMA_CLIENT_TOKEN } from '@ofeklabs/horizon-auth';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PRISMA_CLIENT_TOKEN,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, PRISMA_CLIENT_TOKEN],
})
export class PrismaModule {}
```

### Step 3: Verify Your App Module

Ensure PrismaModule is imported BEFORE HorizonAuthModule:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Must be imported BEFORE HorizonAuthModule
    HorizonAuthModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY,
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
    }),
  ],
})
export class AppModule {}
```

### Step 4: Test Your Application

Start your application and verify:
1. No "Cannot resolve dependencies" errors
2. Auth endpoints work correctly (register, login, password reset)
3. Database operations succeed

## What This Fixes

### The Problem (v1.0.0 - v1.0.1)

When TypeScript compiled and minified the package, class names like `PrismaClient` were shortened to single letters (e.g., `t`). NestJS uses constructor parameter names to match providers, so it couldn't find the provider:

```
Error: Nest can't resolve dependencies of the UsersService (?). 
Please make sure that the argument t at index [0] is available...
```

Even with `@Inject(PrismaClient)` decorators, the minification caused issues because the class reference itself was being minified.

### The Solution (v1.0.2)

Using a string-based injection token (`PRISMA_CLIENT_TOKEN = 'PRISMA_CLIENT'`) eliminates minification issues:
- Strings are never minified
- NestJS can reliably match the token across module boundaries
- Works consistently in development and production builds

## Troubleshooting

### Error: "Module '@ofeklabs/horizon-auth' has no exported member 'PRISMA_CLIENT_TOKEN'"

**Cause:** You're still using v1.0.1 or earlier.

**Solution:** Update to v1.0.2:
```bash
npm install @ofeklabs/horizon-auth@1.0.2
```

### Error: "Cannot resolve dependencies of the UsersService"

**Cause:** Your PrismaModule is not providing `PRISMA_CLIENT_TOKEN`.

**Solution:** Update your PrismaModule to use `PRISMA_CLIENT_TOKEN` as shown in Step 2 above.

### Error: "PrismaModule is not marked as @Global()"

**Cause:** Your PrismaModule is missing the `@Global()` decorator.

**Solution:**
```typescript
@Global() // Add this decorator
@Module({
  providers: [PrismaService, { provide: PRISMA_CLIENT_TOKEN, useExisting: PrismaService }],
  exports: [PrismaService, PRISMA_CLIENT_TOKEN],
})
export class PrismaModule {}
```

## Benefits of This Change

1. **Eliminates Minification Issues:** String tokens are never minified, ensuring reliable dependency injection
2. **Production-Ready:** Works consistently across development and production builds
3. **Better Error Messages:** NestJS can provide clearer error messages with string tokens
4. **Industry Standard:** String-based injection tokens are a NestJS best practice for libraries

## Need Help?

If you encounter issues during migration:
1. Verify you've updated to v1.0.2: `npm list @ofeklabs/horizon-auth`
2. Check that your PrismaModule uses `PRISMA_CLIENT_TOKEN`
3. Ensure PrismaModule is `@Global()` and exports `PRISMA_CLIENT_TOKEN`
4. Verify PrismaModule is imported before HorizonAuthModule
5. Open an issue on GitHub with your configuration and error messages
