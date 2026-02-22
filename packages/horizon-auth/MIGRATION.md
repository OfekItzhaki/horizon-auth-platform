# Migration Guide: HorizonAuth v2.x to v3.x

## Overview

HorizonAuth v3.x removes the internal PrismaModule to eliminate global module conflicts. Applications must now provide their own `@Global()` PrismaModule that exports a PrismaService.

## Breaking Changes

### 1. PrismaModule is No Longer Bundled

**Before (v2.x):**
```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL, // HorizonAuth created its own PrismaModule
      },
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

**After (v3.x):**
```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { PrismaModule } from './prisma/prisma.module'; // Your own PrismaModule

@Module({
  imports: [
    PrismaModule, // Import your PrismaModule BEFORE HorizonAuthModule
    HorizonAuthModule.forRoot({
      // database.url is deprecated - removed
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

### 2. Configuration Changes

The `database` configuration option is deprecated and no longer used:

```typescript
// ❌ DEPRECATED - Remove this
database: {
  url: process.env.DATABASE_URL,
}

// ✅ Instead, configure your own PrismaModule
```

## Migration Steps

### Step 1: Create Your Own PrismaModule

If you don't already have a PrismaModule in your application, create one:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // IMPORTANT: Must be marked as @Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // IMPORTANT: Must export PrismaService
})
export class PrismaModule {}
```

### Step 2: Update Your App Module

Import your PrismaModule BEFORE HorizonAuthModule:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Import BEFORE HorizonAuthModule
    HorizonAuthModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY,
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
      // Remove database.url configuration
    }),
  ],
})
export class AppModule {}
```

### Step 3: Remove Database Configuration

Remove the `database` configuration from your HorizonAuthModule.forRoot() call:

```typescript
// ❌ Remove this
HorizonAuthModule.forRoot({
  database: {
    url: process.env.DATABASE_URL,
  },
  // ... other config
})

// ✅ Use this
HorizonAuthModule.forRoot({
  // database config removed
  redis: { host: 'localhost', port: 6379 },
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
})
```

### Step 4: Verify Your Prisma Schema

Ensure your Prisma schema includes all required tables for HorizonAuth:

```prisma
// prisma/schema.prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String?
  firstName         String?
  lastName          String?
  isActive          Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations for HorizonAuth features
  devices           Device[]
  pushTokens        PushToken[]
  twoFactorSettings TwoFactorSettings?
}

model Device {
  id           String   @id @default(cuid())
  userId       String
  deviceId     String
  deviceName   String?
  deviceType   String?
  lastUsedAt   DateTime @default(now())
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, deviceId])
}

model PushToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model TwoFactorSettings {
  id        String   @id @default(cuid())
  userId    String   @unique
  secret    String
  enabled   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Step 5: Run Migrations

Generate and run Prisma migrations:

```bash
npx prisma migrate dev --name add-horizon-auth-tables
```

## SSO Mode (No Changes Required)

If you're using HorizonAuth in SSO mode (token verification only), no changes are required:

```typescript
// SSO mode - no PrismaModule needed
HorizonAuthModule.forRoot({
  ssoMode: true,
  authServiceUrl: 'https://auth.example.com',
  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
})
```

## Troubleshooting

### Error: "Cannot resolve dependency PrismaService"

**Cause:** Your PrismaModule is not marked as `@Global()` or doesn't export PrismaService.

**Solution:**
```typescript
@Global() // Add this decorator
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Add this export
})
export class PrismaModule {}
```

### Error: "Multiple providers for PrismaService"

**Cause:** You may have multiple PrismaModules or the old HorizonAuth version still installed.

**Solution:**
1. Ensure you've upgraded to HorizonAuth v3.x
2. Remove any duplicate PrismaModule imports
3. Verify only one `@Global()` PrismaModule exists in your application

### Authentication Endpoints Return 500 Errors

**Cause:** PrismaModule is not imported before HorizonAuthModule.

**Solution:**
```typescript
@Module({
  imports: [
    PrismaModule, // Must come BEFORE HorizonAuthModule
    HorizonAuthModule.forRoot({ /* ... */ }),
  ],
})
export class AppModule {}
```

## Benefits of This Change

1. **No Module Conflicts:** Eliminates global module conflicts when your application has its own PrismaModule
2. **Single Database Connection:** Uses your application's existing Prisma connection instead of creating a separate one
3. **Better Control:** You have full control over Prisma configuration, middleware, and extensions
4. **Cleaner Architecture:** Follows NestJS best practices for library modules

## Need Help?

If you encounter issues during migration, please:
1. Check that your PrismaModule is marked as `@Global()` and exports PrismaService
2. Verify PrismaModule is imported before HorizonAuthModule
3. Ensure you've removed the `database` configuration from HorizonAuthModule.forRoot()
4. Open an issue on GitHub with your configuration and error messages
