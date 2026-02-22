# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - External PrismaService Injection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the global module conflict
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: application with its own @Global() PrismaModule importing HorizonAuthModule.forRoot() in full mode
  - Create a test application that imports both its own PrismaModule and HorizonAuthModule.forRoot(config)
  - Test that POST /auth/login with valid credentials succeeds (status 200/201, not 500)
  - Test that AuthService successfully injects PrismaService without dependency resolution errors
  - Test that the injected PrismaService is the application's instance (not a separate one)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with 500 errors and "Cannot resolve dependency" messages (this is correct - it proves the bug exists)
  - Document counterexamples found: NestJS dependency injection errors, authentication endpoint failures, module conflict messages
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - SSO Mode and Non-Database Features
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for SSO mode (ssoMode: true) - verify it works without PrismaModule
  - Observe behavior on UNFIXED code for Redis initialization - verify connection is created correctly
  - Observe behavior on UNFIXED code for JWT verification - verify tokens are validated correctly
  - Write property-based tests capturing observed behavior patterns:
    - SSO mode skips database/Prisma initialization and only provides JWT verification
    - RedisModule creates its own Redis connection as configured
    - Authentication features (2FA, device management, push tokens) function correctly
    - Database operations execute with the same logic when PrismaService is available
  - Property-based testing generates many test cases for stronger guarantees across configuration variations
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for Prisma injection conflict

  - [x] 3.1 Remove PrismaModule from horizon-auth package
    - Delete or deprecate `packages/horizon-auth/src/prisma/prisma.module.ts`
    - Delete or deprecate `packages/horizon-auth/src/prisma/prisma.service.ts`
    - Remove `PrismaModule.forRoot(finalConfig)` from imports array in `HorizonAuthModule.forRoot()`
    - Remove database.url validation from `validateConfig()` function
    - _Bug_Condition: isBugCondition(input) where input.appHasPrismaModule = true AND input.horizonAuthMode = 'full' AND bothModulesAreGlobal()_
    - _Expected_Behavior: HorizonAuthModule accepts and uses application's PrismaService without creating conflicting module_
    - _Preservation: SSO mode continues to skip database initialization, Redis module continues to initialize correctly, authentication features remain functional_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Update service imports to use application's PrismaClient
    - Update all service files (auth.service.ts, users.service.ts, two-factor.service.ts, account.service.ts, push-token.service.ts, device.service.ts)
    - Change imports from `import { PrismaService } from '../prisma/prisma.service'` to `import { PrismaClient } from '@prisma/client'`
    - Change constructor parameters from `private readonly prisma: PrismaService` to `private readonly prisma: PrismaClient`
    - Ensure all services inject PrismaClient from the application's global PrismaModule
    - _Bug_Condition: isBugCondition(input) where bothModulesExportPrismaService() causes injection conflicts_
    - _Expected_Behavior: Services successfully inject application's PrismaService without conflicts_
    - _Preservation: Database operations continue to execute with the same logic_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 3.4_

  - [x] 3.3 Update documentation and configuration
    - Add comments to HorizonAuthModule explaining that applications must provide their own PrismaModule
    - Document that PrismaService must be available globally in the application
    - Mark `database?: { url: string }` as deprecated in HorizonAuthConfig interface
    - Add migration guide for applications upgrading to this version
    - _Expected_Behavior: Clear documentation guides applications to provide PrismaModule_
    - _Preservation: Existing configuration options for SSO mode and Redis remain unchanged_
    - _Requirements: 2.1, 2.4, 3.1, 3.2_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - External PrismaService Injection
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify POST /auth/login returns 200/201 (not 500)
    - Verify AuthService successfully injects application's PrismaService
    - Verify no dependency resolution errors occur
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - SSO Mode and Non-Database Features
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify SSO mode continues to work without database initialization
    - Verify Redis module continues to initialize correctly
    - Verify authentication features (2FA, device management, push tokens) remain functional
    - Verify database operations produce the same results
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all exploration tests and verify they pass (bug is fixed)
  - Run all preservation tests and verify they pass (no regressions)
  - Run any existing unit tests and integration tests
  - Verify authentication endpoints work correctly in test application
  - Ask the user if questions arise
