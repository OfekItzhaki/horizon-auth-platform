# Requirements Document

## Introduction

This document specifies the requirements for transforming the existing horizon-auth-platform NestJS authentication starter into a production-ready, reusable NPM package called @ofeklabs/horizon-auth. The package will provide a dynamic NestJS module that implements modern authentication patterns with 2026 security standards, enabling developers to add enterprise-grade authentication to their applications in under 60 seconds.

## Glossary

- **Package**: The @ofeklabs/horizon-auth NPM package
- **Dynamic_Module**: A NestJS module that can be configured at runtime using the forRoot() pattern
- **Consumer_Application**: A NestJS application that installs and uses the Package
- **Schematic**: A code generator that automates project setup using the Angular/NestJS schematics system
- **Access_Token**: A short-lived JWT (15 minutes) used for API authentication
- **Refresh_Token**: A long-lived token stored in HTTP-only cookies used to obtain new Access_Tokens
- **Token_Rotation**: The security pattern where each Refresh_Token is used once and replaced with a new token
- **JWKS_Endpoint**: A standardized endpoint (/.well-known/jwks.json) that publishes public keys for JWT verification
- **Multi_Tenant_System**: A system where multiple organizations share the same infrastructure with data isolation
- **Dev_SSO_Service**: A shared authentication service running in Docker for local development across multiple applications
- **Argon2id**: A memory-hard password hashing algorithm resistant to GPU cracking attacks
- **RS256**: RSA signature algorithm using SHA-256, enabling asymmetric JWT verification
- **Token_Blacklist**: A Redis-based list of revoked tokens that prevents their reuse
- **Magic_Link**: A time-limited URL sent via email for password reset without requiring the old password
- **Rate_Limiter**: A mechanism that restricts the number of requests from a client within a time window

## Requirements

### Requirement 1: Package Installation and Setup

**User Story:** As a developer, I want to install the authentication package with a single command and have it auto-configure my application, so that I can add production-ready authentication in under 60 seconds.

#### Acceptance Criteria

1. WHEN a developer runs `npm install @ofeklabs/horizon-auth`, THE Package SHALL be installed with all required dependencies
2. WHEN a developer runs `npx nest g @ofeklabs/horizon-auth:init`, THE Schematic SHALL generate all required configuration files
3. WHEN the Schematic runs, THE Package SHALL create app.module.ts with forRoot configuration
4. WHEN the Schematic runs, THE Package SHALL create prisma/schema.prisma with the authentication data model
5. WHEN the Schematic runs, THE Package SHALL create a Prisma migration file
6. WHEN the Schematic runs, THE Package SHALL create main.ts with global authentication guards
7. WHEN the Schematic runs, THE Package SHALL create docker-compose.yml with PostgreSQL 14 and Redis 7 services
8. WHEN the Schematic runs, THE Package SHALL create .env.example with all required environment variables
9. WHEN the Schematic runs, THE Package SHALL create sample.controller.ts demonstrating login and profile endpoints
10. WHEN the Schematic completes, THE Consumer_Application SHALL have a working authentication system ready to start

### Requirement 2: Dynamic Module Configuration

**User Story:** As a developer, I want to configure the authentication module using the forRoot pattern, so that I can customize behavior without modifying package code.

#### Acceptance Criteria

1. THE Dynamic_Module SHALL expose a forRoot() method that accepts configuration options
2. WHEN forRoot() is called with database configuration, THE Dynamic_Module SHALL connect to the specified PostgreSQL database
3. WHEN forRoot() is called with Redis configuration, THE Dynamic_Module SHALL connect to the specified Redis instance
4. WHEN forRoot() is called with JWT configuration, THE Dynamic_Module SHALL use the provided RS256 key pair
5. WHEN forRoot() is called with tenant configuration, THE Dynamic_Module SHALL enable multi-tenant mode
6. WHEN forRoot() is called without optional configuration, THE Dynamic_Module SHALL use secure default values
7. THE Dynamic_Module SHALL validate all configuration options at application startup
8. WHEN configuration validation fails, THE Dynamic_Module SHALL throw a descriptive error and prevent application startup

### Requirement 3: Password Security with Argon2id

**User Story:** As a security engineer, I want passwords hashed using Argon2id, so that the system resists modern GPU-based cracking attacks.

#### Acceptance Criteria

1. WHEN a user registers with a password, THE Package SHALL hash the password using Argon2id
2. WHEN hashing passwords, THE Package SHALL use Argon2id with memory cost of 65536 KB
3. WHEN hashing passwords, THE Package SHALL use Argon2id with time cost of 3 iterations
4. WHEN hashing passwords, THE Package SHALL use Argon2id with parallelism of 4 threads
5. WHEN a user logs in, THE Package SHALL verify the password against the Argon2id hash
6. THE Package SHALL NOT use bcrypt, scrypt, or any algorithm other than Argon2id for password hashing
7. WHEN password verification fails, THE Package SHALL use constant-time comparison to prevent timing attacks

### Requirement 4: JWT Authentication with RS256

**User Story:** As a developer, I want JWTs signed with RS256, so that other services can verify tokens without sharing secrets.

#### Acceptance Criteria

1. THE Package SHALL generate Access_Tokens using RS256 algorithm
2. WHEN generating Access_Tokens, THE Package SHALL set expiration to 15 minutes
3. WHEN generating Access_Tokens, THE Package SHALL include user ID, email, tenant ID, and roles in the payload
4. THE Package SHALL sign Access_Tokens using an RSA private key
5. THE Package SHALL verify Access_Tokens using the corresponding RSA public key
6. THE Package SHALL NOT use HS256 or any symmetric algorithm for JWT signing
7. WHEN an Access_Token expires, THE Package SHALL reject authentication requests with that token
8. WHEN an Access_Token signature is invalid, THE Package SHALL reject the authentication request

### Requirement 5: Refresh Token Rotation

**User Story:** As a security engineer, I want refresh tokens to rotate on each use, so that stolen tokens have minimal impact and can be detected.

#### Acceptance Criteria

1. WHEN a user logs in, THE Package SHALL generate a Refresh_Token and store its hash in the database
2. WHEN generating Refresh_Tokens, THE Package SHALL use cryptographically secure random values
3. WHEN a Refresh_Token is used, THE Package SHALL generate a new Refresh_Token and invalidate the old one
4. WHEN storing Refresh_Tokens, THE Package SHALL hash them using SHA-256 before database storage
5. WHEN a Refresh_Token is used, THE Package SHALL set the HTTP-only cookie flag
6. WHEN a Refresh_Token is used, THE Package SHALL set the Secure cookie flag in production
7. WHEN a Refresh_Token is used, THE Package SHALL set the SameSite cookie attribute to Strict
8. WHEN an already-used Refresh_Token is presented, THE Package SHALL revoke all Refresh_Tokens for that user
9. WHEN a Refresh_Token expires, THE Package SHALL reject refresh requests with that token
10. THE Package SHALL store the parent token ID to enable token family tracking

### Requirement 6: Redis Token Blacklisting

**User Story:** As a security engineer, I want revoked tokens blacklisted in Redis, so that logged-out users cannot continue using their tokens.

#### Acceptance Criteria

1. WHEN a user logs out, THE Package SHALL add all user Refresh_Tokens to the Token_Blacklist
2. WHEN adding tokens to the Token_Blacklist, THE Package SHALL set Redis TTL equal to the token expiration time
3. WHEN a Refresh_Token is presented, THE Package SHALL check the Token_Blacklist before accepting it
4. WHEN a blacklisted token is presented, THE Package SHALL reject the authentication request
5. WHEN a token expires naturally, THE Package SHALL allow Redis to automatically remove it from the Token_Blacklist
6. THE Package SHALL use Redis key prefixes to organize blacklisted tokens
7. WHEN Redis is unavailable, THE Package SHALL fail authentication requests securely

### Requirement 7: User Registration and Email Verification

**User Story:** As a user, I want to register with email and password, so that I can create an account and access the system.

#### Acceptance Criteria

1. WHEN a user submits registration with email and password, THE Package SHALL create a new user account
2. WHEN creating a user account, THE Package SHALL validate the email format
3. WHEN creating a user account, THE Package SHALL enforce minimum password length of 8 characters
4. WHEN a user registers with an existing email, THE Package SHALL return an error
5. WHEN a user account is created, THE Package SHALL set emailVerified to false
6. WHEN a user account is created, THE Package SHALL generate an email verification token using crypto.randomUUID
7. WHEN a user account is created, THE Package SHALL assign the default tenant ID
8. WHEN a user account is created, THE Package SHALL assign the default role of "user"
9. THE Package SHALL store user data in the User table with all required fields

### Requirement 8: Password Reset with Magic Links

**User Story:** As a user, I want to reset my password via email link, so that I can regain access if I forget my password.

#### Acceptance Criteria

1. WHEN a user requests password reset, THE Package SHALL generate a reset token using crypto.randomUUID
2. WHEN generating a reset token, THE Package SHALL set expiration to 1 hour
3. WHEN a reset token is generated, THE Package SHALL send an email with a magic link containing the token
4. WHEN a user clicks the magic link, THE Package SHALL validate the reset token
5. WHEN a reset token is expired, THE Package SHALL reject the password reset request
6. WHEN a reset token is valid, THE Package SHALL allow the user to set a new password
7. WHEN a new password is set, THE Package SHALL invalidate the reset token
8. WHEN a new password is set, THE Package SHALL revoke all existing Refresh_Tokens for that user

### Requirement 9: Rate Limiting

**User Story:** As a security engineer, I want rate limiting on authentication endpoints, so that the system resists brute force and denial of service attacks.

#### Acceptance Criteria

1. THE Package SHALL implement rate limiting using @nestjs/throttler
2. WHEN rate limiting is configured, THE Package SHALL limit login attempts to 5 per minute per IP address
3. WHEN rate limiting is configured, THE Package SHALL limit registration attempts to 3 per minute per IP address
4. WHEN rate limiting is configured, THE Package SHALL limit password reset requests to 3 per hour per IP address
5. WHEN a rate limit is exceeded, THE Package SHALL return HTTP 429 Too Many Requests
6. WHEN a rate limit is exceeded, THE Package SHALL include Retry-After header in the response
7. THE Package SHALL allow rate limit configuration via forRoot options

### Requirement 10: Multi-Tenant Support

**User Story:** As a platform operator, I want multi-tenant support built into the authentication system, so that I can serve multiple organizations with data isolation.

#### Acceptance Criteria

1. THE Package SHALL store a tenantId field for each user
2. WHEN multi-tenant mode is enabled, THE Package SHALL include tenantId in Access_Token claims
3. WHEN multi-tenant mode is enabled, THE Package SHALL provide a tenant isolation guard
4. WHEN a user is created without specifying a tenant, THE Package SHALL assign the default tenant ID
5. THE Package SHALL allow tenant ID to be extracted from request headers
6. THE Package SHALL allow tenant ID to be extracted from subdomain
7. THE Package SHALL provide a @CurrentTenant() decorator for accessing tenant context in controllers

### Requirement 11: JWKS Endpoint for Cross-Language Verification

**User Story:** As a polyglot developer, I want a JWKS endpoint that publishes public keys, so that services in any language can verify JWTs independently.

#### Acceptance Criteria

1. THE Package SHALL expose a GET /.well-known/jwks.json endpoint
2. WHEN the JWKS endpoint is called, THE Package SHALL return the RSA public key in JWK format
3. WHEN the JWKS endpoint is called, THE Package SHALL include the key ID (kid) in the response
4. WHEN the JWKS endpoint is called, THE Package SHALL include the algorithm (RS256) in the response
5. WHEN the JWKS endpoint is called, THE Package SHALL include the key type (RSA) in the response
6. WHEN the JWKS endpoint is called, THE Package SHALL include the public key use (sig) in the response
7. THE Package SHALL format the JWKS response according to RFC 7517
8. THE Package SHALL allow the JWKS endpoint to be publicly accessible without authentication

### Requirement 12: Authentication API Endpoints

**User Story:** As a frontend developer, I want standardized authentication endpoints, so that I can implement login, logout, and token refresh flows.

#### Acceptance Criteria

1. THE Package SHALL expose POST /auth/register endpoint accepting email and password
2. WHEN /auth/register succeeds, THE Package SHALL return HTTP 201 with user details
3. THE Package SHALL expose POST /auth/login endpoint accepting email and password
4. WHEN /auth/login succeeds, THE Package SHALL return HTTP 200 with access_token in response body
5. WHEN /auth/login succeeds, THE Package SHALL set refresh_token as HTTP-only cookie
6. THE Package SHALL expose POST /auth/refresh endpoint
7. WHEN /auth/refresh is called with valid Refresh_Token, THE Package SHALL return new access_token
8. WHEN /auth/refresh is called with valid Refresh_Token, THE Package SHALL set new refresh_token cookie
9. THE Package SHALL expose POST /auth/logout endpoint
10. WHEN /auth/logout is called, THE Package SHALL blacklist all Refresh_Tokens for the authenticated user
11. WHEN /auth/logout succeeds, THE Package SHALL clear the refresh_token cookie
12. THE Package SHALL expose GET /auth/profile endpoint returning current user information
13. WHEN /auth/profile is called without authentication, THE Package SHALL return HTTP 401

### Requirement 13: Guards and Decorators

**User Story:** As a backend developer, I want guards and decorators for protecting routes, so that I can easily control access to endpoints.

#### Acceptance Criteria

1. THE Package SHALL provide a JwtAuthGuard for protecting routes
2. THE Package SHALL provide a @Public() decorator for marking routes as publicly accessible
3. WHEN a route is marked with @Public(), THE Package SHALL skip authentication
4. THE Package SHALL provide a @CurrentUser() decorator for accessing authenticated user in controllers
5. WHEN @CurrentUser() is used, THE Package SHALL inject the complete user object
6. THE Package SHALL provide a RolesGuard for role-based access control
7. THE Package SHALL provide a @Roles() decorator for specifying required roles
8. WHEN a user lacks required roles, THE Package SHALL return HTTP 403 Forbidden
9. THE Package SHALL allow guards to be applied globally via forRoot configuration

### Requirement 14: Database Schema and Migrations

**User Story:** As a developer, I want the package to provide a complete Prisma schema, so that I can integrate authentication with my existing database.

#### Acceptance Criteria

1. THE Package SHALL provide a Prisma schema with User model
2. THE User model SHALL include id, email, fullName, passwordHash, emailVerified, emailVerifyToken, tenantId, roles, createdAt, and updatedAt fields
3. THE Package SHALL provide a Prisma schema with RefreshToken model
4. THE RefreshToken model SHALL include id, hashedToken, userId, expiresAt, and user relation fields
5. THE RefreshToken model SHALL use cascade delete when user is deleted
6. THE Package SHALL generate a Prisma migration file during schematic initialization
7. THE Package SHALL use cuid() for generating user IDs
8. THE Package SHALL use unique constraint on User.email field
9. THE Package SHALL use unique constraint on RefreshToken.hashedToken field
10. THE Package SHALL default User.roles to ["user"] array

### Requirement 15: Docker Development Environment

**User Story:** As a developer, I want a Docker Compose configuration for local development, so that I can run the authentication system without manual infrastructure setup.

#### Acceptance Criteria

1. THE Package SHALL provide a docker-compose.yml file with PostgreSQL 14 service
2. THE Package SHALL provide a docker-compose.yml file with Redis 7 service
3. WHEN Docker Compose is started, THE Package SHALL expose PostgreSQL on port 5432
4. WHEN Docker Compose is started, THE Package SHALL expose Redis on port 6379
5. THE Package SHALL configure PostgreSQL with persistent volume for data
6. THE Package SHALL configure Redis with persistent volume for data
7. THE Package SHALL provide health checks for both PostgreSQL and Redis services
8. THE Package SHALL include environment variables for database credentials in docker-compose.yml

### Requirement 16: Dev SSO Service

**User Story:** As a developer working on multiple microservices, I want a shared authentication service for local development, so that all my *.localhost:3000 apps share the same login session.

#### Acceptance Criteria

1. THE Package SHALL support running as a standalone authentication service in Docker
2. WHEN running as Dev_SSO_Service, THE Package SHALL accept authentication requests from multiple Consumer_Applications
3. WHEN running as Dev_SSO_Service, THE Package SHALL share Redis Token_Blacklist across all Consumer_Applications
4. WHEN running as Dev_SSO_Service, THE Package SHALL use shared cookie domain for *.localhost
5. THE Package SHALL provide documentation for configuring Dev_SSO_Service
6. THE Package SHALL provide a separate docker-compose.dev-sso.yml for the shared service

### Requirement 17: Package Structure and Build

**User Story:** As a package maintainer, I want a well-organized package structure, so that the package is maintainable and follows NestJS conventions.

#### Acceptance Criteria

1. THE Package SHALL organize source code under src/lib/ directory
2. THE Package SHALL organize authentication logic under src/auth/ directory
3. THE Package SHALL organize user management under src/users/ directory
4. THE Package SHALL organize Redis integration under src/redis/ directory
5. THE Package SHALL organize decorators under src/common/decorators/ directory
6. THE Package SHALL include schematics/ directory for code generators
7. THE Package SHALL include test/ directory for E2E tests
8. THE Package SHALL include prisma/ directory for schema and migrations
9. THE Package SHALL provide package.json with correct peer dependencies
10. THE Package SHALL provide .npmignore to exclude unnecessary files from publication
11. THE Package SHALL provide nest-cli.json for NestJS CLI integration
12. THE Package SHALL build to a dist/ directory for NPM publication

### Requirement 18: Comprehensive Documentation

**User Story:** As a developer evaluating the package, I want comprehensive documentation, so that I can understand capabilities and integration steps.

#### Acceptance Criteria

1. THE Package SHALL provide a README.md with installation instructions
2. THE Package SHALL provide a README.md with quick start guide showing 60-second setup
3. THE Package SHALL provide a README.md with configuration options documentation
4. THE Package SHALL provide a README.md with API endpoint documentation
5. THE Package SHALL provide a README.md with decorator usage examples
6. THE Package SHALL provide a README.md with multi-tenant configuration examples
7. THE Package SHALL provide a README.md with Dev_SSO_Service setup instructions
8. THE Package SHALL provide a README.md with security best practices
9. THE Package SHALL provide a README.md with troubleshooting section
10. THE Package SHALL provide code examples for common use cases

### Requirement 19: Testing and Quality Assurance

**User Story:** As a package maintainer, I want comprehensive tests, so that I can ensure the package works correctly and prevent regressions.

#### Acceptance Criteria

1. THE Package SHALL include E2E tests for user registration flow
2. THE Package SHALL include E2E tests for login flow
3. THE Package SHALL include E2E tests for token refresh flow
4. THE Package SHALL include E2E tests for logout flow
5. THE Package SHALL include E2E tests for password reset flow
6. THE Package SHALL include E2E tests for rate limiting behavior
7. THE Package SHALL include E2E tests for multi-tenant isolation
8. THE Package SHALL include E2E tests for JWKS endpoint
9. THE Package SHALL include unit tests for Argon2id password hashing
10. THE Package SHALL include unit tests for JWT token generation and verification
11. THE Package SHALL include unit tests for refresh token rotation logic
12. THE Package SHALL achieve minimum 80% code coverage

### Requirement 20: Cross-Language Token Verification

**User Story:** As a polyglot developer, I want to verify JWTs from services written in different languages, so that I can build a microservices architecture with shared authentication.

#### Acceptance Criteria

1. WHEN a service retrieves the JWKS endpoint, THE Package SHALL provide keys in standard JWK format
2. WHEN a C# service uses the JWKS endpoint, THE Package SHALL enable JWT verification using standard libraries
3. WHEN a Python service uses the JWKS endpoint, THE Package SHALL enable JWT verification using standard libraries
4. WHEN a Go service uses the JWKS endpoint, THE Package SHALL enable JWT verification using standard libraries
5. THE Package SHALL use standard JWT claims (sub, iat, exp, iss, aud)
6. THE Package SHALL include custom claims in a namespaced format to avoid conflicts
7. THE Package SHALL document the JWT payload structure for cross-language consumers
8. THE Package SHALL provide example code for JWT verification in multiple languages

### Requirement 21: Production Deployment Support

**User Story:** As a DevOps engineer, I want production deployment guidance, so that I can deploy the authentication system securely.

#### Acceptance Criteria

1. THE Package SHALL provide documentation for environment variable configuration
2. THE Package SHALL provide documentation for generating RSA key pairs for production
3. THE Package SHALL provide documentation for PostgreSQL production setup
4. THE Package SHALL provide documentation for Redis production setup
5. THE Package SHALL provide documentation for HTTPS/TLS requirements
6. THE Package SHALL provide documentation for cookie security in production
7. THE Package SHALL provide documentation for rate limiting configuration
8. THE Package SHALL provide a production-ready Dockerfile
9. THE Package SHALL provide health check endpoints for load balancers
10. THE Package SHALL log security events for audit purposes

### Requirement 22: Backward Compatibility and Migration

**User Story:** As a developer with an existing auth system, I want migration guidance, so that I can transition to this package without breaking existing users.

#### Acceptance Criteria

1. THE Package SHALL provide documentation for migrating from bcrypt to Argon2id
2. THE Package SHALL provide documentation for migrating from HS256 to RS256
3. THE Package SHALL provide a migration script for existing user data
4. THE Package SHALL support gradual password hash migration on user login
5. WHEN a user with bcrypt hash logs in, THE Package SHALL verify using bcrypt and rehash with Argon2id
6. THE Package SHALL provide documentation for database schema migration from existing systems
