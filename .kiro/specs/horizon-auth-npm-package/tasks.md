# Implementation Plan: @ofeklabs/horizon-auth

## Overview

This implementation plan transforms the existing horizon-auth-platform into a production-ready NPM package. The approach follows a modular structure, building core security services first, then authentication flows, then the dynamic module wrapper, and finally the schematic generator for one-command setup.

## Tasks

- [x] 1. Set up package structure and build configuration
  - Create packages/horizon-auth directory structure
  - Configure TypeScript for library compilation
  - Set up package.json with peer dependencies
  - Configure .npmignore and nest-cli.json
  - Create tsconfig.build.json for production builds
  - _Requirements: 17.1, 17.2, 17.9, 17.10, 17.11, 17.12_

- [ ] 2. Implement core security services
  - [x] 2.1 Implement PasswordService with Argon2id
    - Install @node-rs/argon2 dependency
    - Create PasswordService class with hash() and verify() methods
    - Configure Argon2id parameters (memory: 65536 KB, time: 3, parallelism: 4)
    - Implement bcrypt migration support (isBcryptHash, verifyAndMigrate)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 22.1, 22.4, 22.5_
  
  - [ ]* 2.2 Write property test for password hashing round-trip
    - **Property 1: Password Hashing Round-Trip**
    - **Validates: Requirements 3.1, 3.5**
  
  - [ ]* 2.3 Write property test for Argon2id hash format
    - **Property 2: Argon2id Hash Format**
    - **Validates: Requirements 3.6**
  
  - [ ]* 2.4 Write unit tests for PasswordService edge cases
    - Test empty password rejection
    - Test bcrypt migration flow
    - Test constant-time comparison
    - _Requirements: 3.7_

- [ ] 3. Implement JWT token management
  - [x] 3.1 Implement TokenService with RS256 signing
    - Install required JWT dependencies
    - Create TokenService class
    - Implement generateAccessToken() with RS256
    - Implement verifyAccessToken() with public key
    - Configure 15-minute access token expiry
    - Include sub, email, tenantId, roles, iat, exp, iss, aud in payload
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_
  
  - [ ]* 3.2 Write property test for JWT signing round-trip
    - **Property 3: JWT Signing Round-Trip**
    - **Validates: Requirements 4.1, 4.5**
  
  - [ ]* 3.3 Write property test for JWT payload structure
    - **Property 4: JWT Payload Structure**
    - **Validates: Requirements 4.2, 4.3**
  
  - [ ]* 3.4 Write unit tests for JWT edge cases
    - Test expired token rejection
    - Test invalid signature rejection
    - _Requirements: 4.7, 4.8_

- [ ] 4. Implement refresh token management
  - [ ] 4.1 Implement refresh token generation and storage
    - Create generateRefreshToken() method
    - Use crypto.randomUUID for token generation
    - Hash tokens with SHA-256 before database storage
    - Store tokens in RefreshToken table with userId, expiresAt, parentTokenId
    - Set 7-day expiration
    - _Requirements: 5.1, 5.2, 5.4, 5.9, 5.10_
  
  - [ ] 4.2 Implement refresh token rotation logic
    - Create rotateRefreshToken() method
    - Verify incoming refresh token
    - Mark old token as revoked
    - Generate new token pair with parent tracking
    - Implement reuse detection (revoke all tokens if reused)
    - _Requirements: 5.3, 5.8_
  
  - [ ]* 4.3 Write property test for refresh token rotation
    - **Property 5: Refresh Token Rotation**
    - **Validates: Requirements 5.3**
  
  - [ ]* 4.4 Write property test for refresh token storage security
    - **Property 6: Refresh Token Storage Security**
    - **Validates: Requirements 5.4**
  
  - [ ]* 4.5 Write property test for parent token tracking
    - **Property 7: Refresh Token Parent Tracking**
    - **Validates: Requirements 5.10**
  
  - [ ]* 4.6 Write unit tests for token rotation edge cases
    - Test reuse detection
    - Test expired token rejection
    - _Requirements: 5.8, 5.9_

- [ ] 5. Implement Redis token blacklist
  - [x] 5.1 Create RedisModule and RedisService
    - Install ioredis dependency
    - Create RedisModule with dynamic configuration
    - Implement RedisService with blacklist(), isBlacklisted(), healthCheck()
    - Use key format: auth:blacklist:{tokenId}
    - Implement connection pooling
    - _Requirements: 6.6_
  
  - [ ] 5.2 Implement token blacklisting logic
    - Add blacklistToken() method to TokenService
    - Calculate TTL from token expiration
    - Add token to Redis with TTL
    - Check blacklist before accepting tokens
    - Implement fail-closed behavior if Redis unavailable
    - _Requirements: 6.1, 6.2, 6.3, 6.7_
  
  - [ ]* 5.3 Write property test for blacklist enforcement
    - **Property 8: Token Blacklist Enforcement**
    - **Validates: Requirements 6.1, 6.3**
  
  - [ ]* 5.4 Write property test for blacklist TTL
    - **Property 9: Blacklist TTL Configuration**
    - **Validates: Requirements 6.2**
  
  - [ ]* 5.5 Write unit tests for Redis failure scenarios
    - Test fail-closed behavior when Redis unavailable
    - _Requirements: 6.7_

- [ ] 6. Checkpoint - Ensure core security services pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement user management
  - [x] 7.1 Create UsersModule and UsersService
    - Create UsersModule
    - Implement UsersService with CRUD operations
    - Implement findByEmail(), findById(), create() methods
    - Implement email verification token generation
    - _Requirements: 7.1, 7.6_
  
  - [x] 7.2 Implement user registration with validation
    - Create register() method in AuthService
    - Validate email format using class-validator
    - Enforce minimum 8-character password length
    - Check for duplicate email
    - Set default values: emailVerified=false, tenantId="default", roles=["user"]
    - Generate UUID v4 email verification token
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_
  
  - [ ]* 7.3 Write property test for user registration validation
    - **Property 10: User Registration Validation**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 7.4 Write property test for user creation defaults
    - **Property 11: User Creation Defaults**
    - **Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.9**
  
  - [ ]* 7.5 Write unit tests for user registration edge cases
    - Test duplicate email rejection
    - Test invalid email formats
    - Test short passwords
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 8. Implement authentication flows
  - [ ] 8.1 Implement login flow
    - Create login() method in AuthService
    - Validate credentials using PasswordService
    - Generate access and refresh tokens
    - Return tokens with user data
    - Set HTTP-only, Secure, SameSite=Strict cookie for refresh token
    - _Requirements: 12.3, 12.4, 12.5, 5.5, 5.6, 5.7_
  
  - [ ] 8.2 Implement token refresh endpoint
    - Create refresh() method in AuthService
    - Extract refresh token from cookie
    - Verify and rotate token
    - Return new token pair
    - _Requirements: 12.6, 12.7, 12.8_
  
  - [ ] 8.3 Implement logout flow
    - Create logout() method in AuthService
    - Revoke all user refresh tokens
    - Add all tokens to Redis blacklist
    - Clear refresh token cookie
    - _Requirements: 12.9, 12.10, 12.11, 6.1_
  
  - [ ]* 8.4 Write property test for logout token revocation
    - **Property 17: Logout Token Revocation**
    - **Validates: Requirements 6.1**
  
  - [ ]* 8.5 Write unit tests for authentication flows
    - Test login with invalid credentials
    - Test refresh with expired token
    - Test logout clears cookies
    - _Requirements: 12.3, 12.6, 12.11_

- [ ] 9. Implement password reset flow
  - [ ] 9.1 Implement password reset request
    - Create requestPasswordReset() method
    - Generate UUID v4 reset token
    - Set 1-hour expiration
    - Store token in user record
    - Send email with magic link
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 9.2 Implement password reset completion
    - Create resetPassword() method
    - Validate reset token and expiration
    - Update password with new Argon2id hash
    - Invalidate reset token
    - Revoke all refresh tokens
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8_
  
  - [ ]* 9.3 Write property test for reset token generation
    - **Property 12: Password Reset Token Generation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 9.4 Write property test for reset token revocation
    - **Property 13: Password Reset Token Revocation**
    - **Validates: Requirements 8.8**
  
  - [ ]* 9.5 Write unit tests for password reset edge cases
    - Test expired token rejection
    - Test token invalidation after use
    - Test email sending
    - _Requirements: 8.3, 8.5, 8.7_

- [ ] 10. Implement guards and decorators
  - [x] 10.1 Create JwtAuthGuard
    - Extend AuthGuard('jwt') from @nestjs/passport
    - Check for @Public() decorator
    - Verify JWT and check blacklist
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 10.2 Create RolesGuard
    - Implement CanActivate interface
    - Extract required roles from @Roles() decorator
    - Check user roles against required roles
    - _Requirements: 13.6, 13.7, 13.8_
  
  - [x] 10.3 Create decorators
    - Implement @Public() decorator using SetMetadata
    - Implement @CurrentUser() decorator using createParamDecorator
    - Implement @Roles() decorator using SetMetadata
    - Implement @CurrentTenant() decorator using createParamDecorator
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.7, 10.7_
  
  - [ ]* 10.4 Write unit tests for guards and decorators
    - Test @Public() skips authentication
    - Test @CurrentUser() injects user
    - Test RolesGuard enforces roles
    - _Requirements: 13.3, 13.5, 13.8_

- [ ] 11. Implement rate limiting
  - [x] 11.1 Configure @nestjs/throttler
    - Install @nestjs/throttler dependency
    - Create rate limit configuration
    - Set login limit: 5/minute per IP
    - Set registration limit: 3/minute per IP
    - Set password reset limit: 3/hour per IP
    - Configure Redis storage for rate limiting
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 11.2 Apply rate limiting to endpoints
    - Apply throttler to login endpoint
    - Apply throttler to registration endpoint
    - Apply throttler to password reset endpoint
    - Configure Retry-After header
    - _Requirements: 9.5, 9.6_
  
  - [ ]* 11.3 Write unit tests for rate limiting
    - Test rate limit enforcement
    - Test 429 response
    - Test Retry-After header
    - Test configurable limits
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 12. Checkpoint - Ensure authentication flows work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement multi-tenant support
  - [ ] 13.1 Add tenant support to user model
    - Ensure tenantId field in User model
    - Add tenantId index to database
    - Set default tenantId value
    - _Requirements: 10.1, 10.4_
  
  - [ ] 13.2 Add tenant support to JWT tokens
    - Include tenantId in access token payload
    - Extract tenantId in JWT strategy
    - _Requirements: 10.2_
  
  - [x] 13.3 Implement tenant extraction strategies
    - Create tenant extractor for request headers
    - Create tenant extractor for subdomain
    - Support custom extractor function
    - _Requirements: 10.5, 10.6_
  
  - [ ]* 13.4 Write property test for multi-tenant token claims
    - **Property 14: Multi-Tenant Token Claims**
    - **Validates: Requirements 10.2**
  
  - [ ]* 13.5 Write property test for user tenant assignment
    - **Property 15: User Tenant Assignment**
    - **Validates: Requirements 10.1**
  
  - [ ]* 13.6 Write unit tests for tenant extraction
    - Test header extraction
    - Test subdomain extraction
    - Test custom extractor
    - _Requirements: 10.5, 10.6_

- [ ] 14. Implement JWKS endpoint
  - [x] 14.1 Create JWKS controller and service
    - Create JwksController with GET /.well-known/jwks.json endpoint
    - Implement JWKS response generation
    - Include kid, alg (RS256), kty (RSA), use (sig) in response
    - Format response according to RFC 7517
    - Mark endpoint as @Public()
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [ ]* 14.2 Write unit tests for JWKS endpoint
    - Test endpoint accessibility without auth
    - Test response format
    - Test all required fields present
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 15. Implement authentication API controllers
  - [x] 15.1 Create AuthController with all endpoints
    - POST /auth/register endpoint
    - POST /auth/login endpoint
    - POST /auth/refresh endpoint
    - POST /auth/logout endpoint
    - GET /auth/profile endpoint
    - POST /auth/password-reset/request endpoint
    - POST /auth/password-reset/complete endpoint
    - Apply appropriate guards and decorators
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13_
  
  - [ ]* 15.2 Write E2E tests for authentication API
    - Test complete registration flow
    - Test login flow
    - Test token refresh flow
    - Test logout flow
    - Test password reset flow
    - Test protected endpoint access
    - _Requirements: 12.1-12.13_

- [ ] 16. Implement dynamic module configuration
  - [x] 16.1 Create HorizonAuthModule with forRoot()
    - Create HorizonAuthModule as dynamic module
    - Implement forRoot() method accepting HorizonAuthConfig
    - Implement forRootAsync() for async configuration
    - Register all sub-modules (Auth, Users, Redis, Prisma)
    - Apply global guards if configured
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 13.9_
  
  - [ ] 16.2 Implement configuration validation
    - Create configuration validation schema
    - Validate required fields (database, redis, jwt)
    - Validate field types and formats
    - Throw descriptive errors for invalid configuration
    - Prevent application startup on validation failure
    - _Requirements: 2.7, 2.8_
  
  - [ ]* 16.3 Write property test for configuration validation
    - **Property 16: Configuration Validation**
    - **Validates: Requirements 2.7**
  
  - [ ]* 16.4 Write unit tests for configuration
    - Test valid configuration acceptance
    - Test invalid configuration rejection
    - Test default values
    - Test forRootAsync
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8_

- [ ] 17. Create Prisma schema and migrations
  - [x] 17.1 Create Prisma schema file
    - Define User model with all required fields
    - Define RefreshToken model with cascade delete
    - Add indexes for email, tenantId, userId, hashedToken
    - Use cuid() for ID generation
    - Set default values for emailVerified, tenantId, roles
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8, 14.9, 14.10_
  
  - [ ] 17.2 Generate initial Prisma migration
    - Create migration file for User and RefreshToken tables
    - _Requirements: 14.6_
  
  - [ ]* 17.3 Write unit tests for Prisma schema
    - Test User model creation
    - Test RefreshToken cascade delete
    - Test unique constraints
    - Test default values
    - _Requirements: 14.1-14.10_

- [ ] 18. Checkpoint - Ensure dynamic module configuration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Create NestJS schematic generator
  - [ ] 19.1 Set up schematic structure
    - Create schematics/init directory
    - Create schema.json for CLI options
    - Create collection.json
    - _Requirements: 1.2_
  
  - [ ] 19.2 Create template files
    - Create app.module.ts.template with forRoot configuration
    - Create main.ts.template with cookie-parser
    - Create sample.controller.ts.template with examples
    - Create docker-compose.yml.template with PostgreSQL and Redis
    - Create .env.example.template with all variables
    - Create prisma/schema.prisma.template
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [ ] 19.3 Implement schematic logic
    - Validate NestJS project structure
    - Generate RSA key pair (2048-bit)
    - Apply templates with configuration
    - Merge with existing project
    - Add npm install task
    - Add Prisma migration task
    - _Requirements: 1.2, 1.10_
  
  - [ ]* 19.4 Write E2E tests for schematic
    - Test schematic generates all files
    - Test generated app starts successfully
    - Test authentication works after setup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 20. Create Docker Compose configurations
  - [x] 20.1 Create docker-compose.yml for embedded mode
    - Add PostgreSQL 14 service on port 5432
    - Add Redis 7 service on port 6379
    - Configure persistent volumes
    - Add health checks
    - Set environment variables
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_
  
  - [x] 20.2 Create docker-compose.dev-sso.yml for Dev SSO mode
    - Create standalone auth service configuration
    - Configure shared Redis instance
    - Set shared cookie domain for *.localhost
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.6_
  
  - [ ]* 20.3 Write integration tests for Docker setup
    - Test Docker Compose starts successfully
    - Test services are healthy
    - Test authentication works with Docker services
    - _Requirements: 15.1-15.8_

- [ ] 21. Create comprehensive documentation
  - [x] 21.1 Write README.md
    - Add installation instructions
    - Add 60-second quick start guide
    - Document configuration options
    - Document API endpoints
    - Add decorator usage examples
    - Add multi-tenant configuration examples
    - Add Dev SSO setup instructions
    - Add security best practices
    - Add troubleshooting section
    - Add code examples for common use cases
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_
  
  - [x] 21.2 Add cross-language verification examples
    - Document JWT payload structure
    - Add C# verification example
    - Add Python verification example
    - Add Go verification example
    - _Requirements: 20.5, 20.6, 20.7, 20.8_
  
  - [ ] 21.3 Add production deployment documentation
    - Document environment variables
    - Document RSA key generation
    - Document PostgreSQL setup
    - Document Redis setup
    - Document HTTPS/TLS requirements
    - Document cookie security
    - Document rate limiting configuration
    - Add production Dockerfile
    - Add health check endpoints
    - Document security event logging
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10_
  
  - [ ] 21.4 Add migration documentation
    - Document bcrypt to Argon2id migration
    - Document HS256 to RS256 migration
    - Create migration script for user data
    - Document gradual password hash migration
    - Document database schema migration
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

- [ ] 22. Configure package for NPM publication
  - [ ] 22.1 Configure package.json
    - Set package name to @ofeklabs/horizon-auth
    - Configure peer dependencies
    - Configure dependencies
    - Set main and types entry points
    - Configure schematics path
    - Configure files to include in package
    - _Requirements: 17.9_
  
  - [ ] 22.2 Create .npmignore
    - Exclude source files
    - Exclude test files
    - Exclude development files
    - _Requirements: 17.10_
  
  - [ ] 22.3 Create build script
    - Clean previous build
    - Compile TypeScript
    - Copy schematics
    - Copy Prisma schema
    - _Requirements: 17.12_
  
  - [ ]* 22.4 Test package installation
    - Build package
    - Install in test project
    - Run schematic generator
    - Verify authentication works
    - _Requirements: 1.1, 1.2, 1.10_

- [ ] 23. Final checkpoint - Complete E2E validation
  - Run all tests (unit + property + E2E)
  - Verify schematic generator works
  - Verify Docker Compose setup works
  - Verify 60-second installation flow
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- E2E tests validate complete user flows
- The implementation builds incrementally: security services → auth flows → module wrapper → schematic generator
