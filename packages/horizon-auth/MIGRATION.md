# Migration Guide: HorizonAuth

## v1.0.4 - Critical TypeScript Compilation Fix

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
