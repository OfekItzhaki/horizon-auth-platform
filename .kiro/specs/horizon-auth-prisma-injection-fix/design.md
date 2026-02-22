# Horizon Auth Prisma Injection Fix - Bugfix Design

## Overview

The @ofeklabs/horizon-auth package creates its own internal PrismaModule that conflicts with the application's PrismaModule when both are imported. This design document outlines a fix that removes the package's internal PrismaModule and instead accepts an external PrismaService injection from the consuming application. The fix ensures that horizon-auth services use the application's existing Prisma client connection, eliminating the global module conflict while preserving all existing functionality including SSO mode, Redis initialization, and authentication features.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when HorizonAuthModule.forRoot() is called in an application that has its own @Global() PrismaModule
- **Property (P)**: The desired behavior - horizon-auth services should successfully inject and use the application's PrismaService without conflicts
- **Preservation**: Existing functionality that must remain unchanged - SSO mode, Redis module, authentication features, database operations
- **PrismaModule**: The @Global() module in `packages/horizon-auth/src/prisma/prisma.module.ts` that creates a conflicting global provider
- **PrismaService**: The service in `packages/horizon-auth/src/prisma/prisma.service.ts` that extends PrismaClient and manages database connections
- **HorizonAuthModule**: The main module in `packages/horizon-auth/src/lib/horizon-auth.module.ts` that orchestrates package initialization
- **Global Module Conflict**: When two @Global() modules export providers with the same token, causing NestJS dependency injection to fail

## Bug Details

### Fault Condition

The bug manifests when an application imports HorizonAuthModule.forRoot() while also having its own PrismaModule marked as @Global(). Both modules export a PrismaService provider, causing NestJS to be unable to resolve which PrismaService to inject into horizon-auth services (AuthService, UsersService, TwoFactorService, AccountService, PushTokenService, DeviceService).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { appHasPrismaModule: boolean, horizonAuthMode: string }
  OUTPUT: boolean
  
  RETURN input.appHasPrismaModule = true
         AND input.horizonAuthMode = 'full'
         AND bothModulesAreGlobal()
         AND bothModulesExportPrismaService()
END FUNCTION
```

### Examples

- **Example 1**: Application imports PrismaModule globally, then imports HorizonAuthModule.forRoot(config) → POST /auth/login returns 500 error due to PrismaService injection failure
- **Example 2**: Application imports HorizonAuthModule.forRoot(config), then imports its own PrismaModule → POST /auth/password-reset returns 500 error due to dependency resolution conflict
- **Example 3**: Multiple horizon-auth services (AuthService, UsersService, TwoFactorService) all fail to inject PrismaService → All authentication endpoints return 500 errors
- **Edge Case**: Application uses HorizonAuthModule in SSO mode (ssoMode: true) → No bug occurs because PrismaModule is not imported in SSO mode

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- SSO mode must continue to skip database/Prisma initialization and only provide JWT verification
- RedisModule must continue to create its own Redis connection as configured
- Authentication features (2FA, device management, push tokens, account management) must continue to function correctly
- Database operations (queries, transactions) must continue to execute with the same logic
- Application's PrismaService must continue to use the application's DATABASE_URL and connection configuration

**Scope:**
All inputs that do NOT involve the full authentication mode with database access should be completely unaffected by this fix. This includes:
- SSO mode configuration and JWT verification
- Redis connection and caching operations
- Non-database authentication logic (JWT generation, token validation)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Global Module Conflict**: The horizon-auth PrismaModule is marked as @Global() and exports PrismaService, which conflicts with the application's own @Global() PrismaModule that also exports PrismaService
   - Both modules use the same provider token (PrismaService class)
   - NestJS cannot determine which provider to inject when services request PrismaService

2. **Architectural Design Issue**: The package creates its own Prisma client connection instead of accepting an external one
   - PrismaModule.forRoot(config) creates a new PrismaClient instance with config.database.url
   - This creates a separate database connection pool instead of reusing the application's connection

3. **Tight Coupling**: All horizon-auth services directly inject PrismaService from the package's internal module
   - AuthService, UsersService, TwoFactorService, AccountService, PushTokenService, DeviceService all have `constructor(private readonly prisma: PrismaService)`
   - No mechanism exists to inject an external PrismaService

4. **Module Import Order**: HorizonAuthModule.forRoot() imports PrismaModule.forRoot(config) unconditionally in full mode
   - The import happens before the application can provide its own PrismaService
   - No configuration option exists to skip PrismaModule import

## Correctness Properties

Property 1: Fault Condition - External PrismaService Injection

_For any_ application configuration where the app has its own PrismaModule and calls HorizonAuthModule.forRoot() in full mode, the fixed HorizonAuthModule SHALL accept and use the application's PrismaService without creating a conflicting module, allowing all authentication endpoints to successfully process requests.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - SSO Mode and Non-Database Features

_For any_ configuration that uses SSO mode or non-database features (Redis, JWT verification), the fixed code SHALL produce exactly the same behavior as the original code, preserving SSO mode functionality, Redis initialization, and all authentication logic that doesn't require database access.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `packages/horizon-auth/src/lib/horizon-auth.module.ts`

**Function**: `HorizonAuthModule.forRoot()`

**Specific Changes**:
1. **Remove PrismaModule Import**: Remove `PrismaModule.forRoot(finalConfig)` from the imports array in full mode
   - Delete the line: `PrismaModule.forRoot(finalConfig),`
   - This prevents the creation of the conflicting global module

2. **Add Configuration Validation**: Update `validateConfig()` to remove database.url requirement in full mode
   - Remove the check: `if (!config.database?.url) { throw new Error(...) }`
   - The application's PrismaModule will handle database configuration

3. **Update Documentation**: Add comments explaining that applications must provide their own PrismaModule
   - Document that PrismaService must be available globally in the application
   - Explain that horizon-auth will inject the application's PrismaService

4. **Remove Database Config**: Remove database configuration from HorizonAuthConfig interface (optional - for clarity)
   - Mark `database?: { url: string }` as deprecated
   - Add comment that it's no longer used

**File**: `packages/horizon-auth/src/prisma/prisma.module.ts`

**Changes**: Mark this file as deprecated or remove it entirely
   - Option 1: Delete the file completely (breaking change)
   - Option 2: Keep the file but mark it as deprecated with comments
   - Recommended: Delete the file since it's no longer needed

**File**: `packages/horizon-auth/src/prisma/prisma.service.ts`

**Changes**: Mark this file as deprecated or remove it entirely
   - Option 1: Delete the file completely (breaking change)
   - Option 2: Keep the file but create a type alias: `export type PrismaService = PrismaClient`
   - Recommended: Delete the file and update all imports to use `PrismaClient` from `@prisma/client`

**File**: All service files (auth.service.ts, users.service.ts, two-factor.service.ts, etc.)

**Changes**: Update PrismaService imports to use PrismaClient from @prisma/client
   - Change: `import { PrismaService } from '../prisma/prisma.service'`
   - To: `import { PrismaClient } from '@prisma/client'`
   - Change constructor parameter: `private readonly prisma: PrismaService`
   - To: `private readonly prisma: PrismaClient`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by attempting to use horizon-auth in an application with its own PrismaModule, then verify the fix works correctly and preserves existing behavior across SSO mode, Redis initialization, and all authentication features.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create a test application that imports both its own PrismaModule and HorizonAuthModule.forRoot(). Attempt to call authentication endpoints (login, password reset) and observe the 500 errors. Inspect NestJS dependency injection logs to confirm the PrismaService conflict.

**Test Cases**:
1. **Login Endpoint Test**: POST /auth/login with valid credentials in an app with both PrismaModules (will fail on unfixed code with 500 error)
2. **Password Reset Test**: POST /auth/password-reset with valid email in an app with both PrismaModules (will fail on unfixed code with 500 error)
3. **Service Injection Test**: Attempt to instantiate AuthService in a test and observe PrismaService injection failure (will fail on unfixed code)
4. **Module Import Order Test**: Try different import orders (app PrismaModule first vs HorizonAuthModule first) and observe that both fail (will fail on unfixed code)

**Expected Counterexamples**:
- NestJS throws dependency injection errors mentioning multiple providers for PrismaService
- Authentication endpoints return 500 errors with "Cannot resolve dependency" messages
- Possible causes: @Global() module conflict, duplicate provider tokens, module import order issues

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL config WHERE isBugCondition(config) DO
  app := createTestApp(config)
  result := app.post('/auth/login', validCredentials)
  ASSERT result.status IN [200, 201, 400, 401]
  ASSERT result.status != 500
  ASSERT authService.prisma === app.prismaService
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL config WHERE NOT isBugCondition(config) DO
  ASSERT HorizonAuthModule_original(config).behavior = HorizonAuthModule_fixed(config).behavior
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the configuration domain
- It catches edge cases that manual unit tests might miss (SSO mode variations, Redis config variations)
- It provides strong guarantees that behavior is unchanged for all non-buggy configurations

**Test Plan**: Observe behavior on UNFIXED code first for SSO mode and Redis initialization, then write property-based tests capturing that behavior.

**Test Cases**:
1. **SSO Mode Preservation**: Observe that SSO mode works correctly on unfixed code (no PrismaModule import), then write test to verify this continues after fix
2. **Redis Initialization Preservation**: Observe that Redis connection is created correctly on unfixed code, then write test to verify this continues after fix
3. **Authentication Features Preservation**: Observe that 2FA, device management, push tokens work correctly on unfixed code, then write test to verify these continue after fix
4. **Database Operations Preservation**: Observe that Prisma queries and transactions execute correctly on unfixed code, then write test to verify these continue after fix

### Unit Tests

- Test HorizonAuthModule.forRoot() with application PrismaModule available
- Test that services successfully inject PrismaClient from application
- Test that SSO mode continues to skip database initialization
- Test that Redis module continues to initialize correctly
- Test edge cases (missing PrismaModule in application should throw clear error)

### Property-Based Tests

- Generate random HorizonAuthConfig variations and verify SSO mode behavior is preserved
- Generate random authentication scenarios (login, 2FA, password reset) and verify they work with injected PrismaService
- Test that all database operations produce the same results with application's PrismaService
- Generate random Redis configurations and verify Redis initialization is preserved

### Integration Tests

- Test full authentication flow (register, login, refresh, logout) with application's PrismaModule
- Test switching between SSO mode and full mode configurations
- Test that multiple horizon-auth services (AuthService, UsersService, TwoFactorService) all use the same PrismaService instance
- Test that database connection pooling works correctly with application's PrismaService
