# Horizon Auth Platform

Centralized authentication system for all Horizon services.

## Overview

This repository contains two main components:
1.  **`identity-service/`**: The core authentication server (NestJS). It manages users, issues JWT tokens, and handles registration/login flows.
2.  **`packages/auth-sdk/`**: The client SDK (NPM package). Install this in any other service to easily protect routes and verify tokens issued by the Identity Service.

## Getting Started (Identity Service)

1.  Navigate to `identity-service/`
2.  Install dependencies: `npm install`
3.  Set up your `.env` (JWT_SECRET, DATABASE_URL)
4.  Run Prisma migrations: `npx prisma migrate dev`
5.  Start the server: `npm run start:dev`

## Using the SDK in other projects

### 1. Installation
Until the package is published to a registry, you can link it locally:
```bash
# In packages/auth-sdk
npm link

# In your other project (e.g., todo-backend)
npm link @horizon/auth-sdk
```

### 2. Integration (NestJS)
```typescript
import { AuthModule } from '@horizon/auth-sdk';

@Module({
  imports: [
    AuthModule.forRoot({
      authServiceUrl: 'https://auth.horizon.com',
      jwtSecret: process.env.JWT_SECRET,
    }),
  ],
})
export class AppModule {}
```

## Refactoring your old project

To switch your old project (like `todo-backend`) to use this system:
1.  Delete the local `src/auth` and `src/users` directories.
2.  Install the `@horizon/auth-sdk`.
3.  Replace local Guards with `HorizonAuthGuard` from the SDK.
