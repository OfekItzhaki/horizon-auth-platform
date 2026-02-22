# Bugfix Requirements Document

## Introduction

The @ofeklabs/horizon-auth package creates its own internal PrismaModule that conflicts with the application's PrismaModule when both are imported. Both modules are marked as @Global() and both export a PrismaService that extends PrismaClient, causing NestJS dependency injection to fail. This results in 500 errors on authentication endpoints (login, password reset) because the auth services cannot properly inject the Prisma dependency.

The root cause is architectural: the horizon-auth package bundles its own Prisma client and module, but when used as a library in an application that also has its own Prisma setup, the two global modules conflict. The package needs to be modified to accept an external PrismaService injection rather than creating its own.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN HorizonAuthModule.forRoot() is called in an application that has its own PrismaModule THEN the system creates two conflicting global PrismaModule instances

1.2 WHEN authentication endpoints (login, password reset) are invoked THEN the system returns 500 errors due to dependency injection failures

1.3 WHEN services in horizon-auth (AuthService, UsersService, TwoFactorService, AccountService, PushTokenService) attempt to inject PrismaService THEN the system cannot resolve which PrismaService to inject (package's or app's)

1.4 WHEN the horizon-auth package initializes THEN the system creates a separate Prisma client connection using the package's internal PrismaModule.forRoot(config)

### Expected Behavior (Correct)

2.1 WHEN HorizonAuthModule.forRoot() is called in an application that has its own PrismaModule THEN the system SHALL use the application's existing PrismaService without creating a conflicting module

2.2 WHEN authentication endpoints (login, password reset) are invoked THEN the system SHALL successfully process requests and return appropriate responses (200/201 for success, 400/401 for validation errors)

2.3 WHEN services in horizon-auth (AuthService, UsersService, TwoFactorService, AccountService, PushTokenService) attempt to inject PrismaService THEN the system SHALL successfully inject the application's PrismaService

2.4 WHEN the horizon-auth package initializes THEN the system SHALL reuse the application's existing Prisma client connection instead of creating a new one

### Unchanged Behavior (Regression Prevention)

3.1 WHEN HorizonAuthModule is configured in SSO mode THEN the system SHALL CONTINUE TO skip database/Prisma initialization and only provide JWT verification

3.2 WHEN RedisModule is initialized by horizon-auth THEN the system SHALL CONTINUE TO create its own Redis connection as configured

3.3 WHEN authentication features (2FA, device management, push tokens, account management) are used THEN the system SHALL CONTINUE TO function correctly with the injected PrismaService

3.4 WHEN the application's PrismaService connects to the database THEN the system SHALL CONTINUE TO use the application's DATABASE_URL and connection configuration

3.5 WHEN horizon-auth services perform database operations THEN the system SHALL CONTINUE TO execute the same Prisma queries and transactions as before
