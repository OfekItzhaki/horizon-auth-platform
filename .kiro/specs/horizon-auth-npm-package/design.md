# Design Document: @ofeklabs/horizon-auth

## Overview

The @ofeklabs/horizon-auth package transforms the existing horizon-auth-platform into a production-ready, reusable NestJS dynamic module. The package implements 2026 security standards including Argon2id password hashing, RS256 JWT signing, refresh token rotation, and Redis-based token blacklisting. The design prioritizes developer experience with a 60-second installation flow via NestJS schematics, while maintaining enterprise-grade security and multi-tenant support.

### Key Design Principles

1. **Security First**: Implement modern cryptographic standards (Argon2id, RS256, token rotation)
2. **Developer Experience**: One-command setup with sensible defaults
3. **Flexibility**: Support both standalone and shared SSO deployment modes
4. **Interoperability**: JWKS endpoint enables cross-language token verification
5. **Production Ready**: Built-in rate limiting, monitoring, and deployment guidance

### Architecture Goals

- Zero-configuration defaults with full customization via forRoot()
- Minimal dependencies on consumer applications
- Database-agnostic design (Prisma as abstraction layer)
- Stateless access tokens with stateful refresh token management
- Horizontal scalability via Redis-backed token blacklist

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Consumer Application"
        App[NestJS App]
        AppModule[App Module]
    end
    
    subgraph "@ofeklabs/horizon-auth Package"
        HorizonAuth[HorizonAuthModule.forRoot]
        AuthModule[Auth Module]
        UsersModule[Users Module]
        RedisModule[Redis Module]
        PrismaModule[Prisma Module]
        
        AuthService[Auth Service]
        TokenService[Token Service]
        PasswordService[Password Service]
        
        JwtGuard[JWT Auth Guard]
        RolesGuard[Roles Guard]
        RateLimitGuard[Rate Limit Guard]
    end
    
    subgraph "External Services"
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
        Email[Email Service]
    end
    
    App --> AppModule
    AppModule --> HorizonAuth
    HorizonAuth --> AuthModule
    HorizonAuth --> UsersModule
    HorizonAuth --> RedisModule
    HorizonAuth --> PrismaModule
    
    AuthModule --> AuthService
    AuthService --> TokenService
    AuthService --> PasswordService
    
    AuthModule --> JwtGuard
    AuthModule --> RolesGuard
    AuthModule --> RateLimitGuard
    
    PrismaModule --> Postgres
    RedisModule --> Redis
    AuthService --> Email
```

### Module Structure

The package follows NestJS dynamic module pattern with clear separation of concerns:


**HorizonAuthModule** (Dynamic Module)
- Entry point exposing forRoot(config) and forRootAsync(config)
- Registers all sub-modules with provided configuration
- Applies global guards if configured
- Validates configuration at startup

**AuthModule**
- Authentication endpoints (login, register, refresh, logout)
- JWT strategy and guards
- Password reset flows
- JWKS endpoint for public key distribution

**UsersModule**
- User CRUD operations
- Email verification
- User profile management
- Multi-tenant user isolation

**RedisModule**
- Token blacklist management
- TTL-based automatic cleanup
- Connection pooling and health checks

**PrismaModule**
- Database connection management
- Schema migrations
- Transaction support

### Deployment Modes

The package supports three deployment modes:

**1. Embedded Mode** (Default)
- Package runs within consumer application
- Each application has its own auth instance
- Suitable for monolithic applications or isolated microservices

**2. Dev SSO Mode**
- Shared authentication service for local development
- All *.localhost applications share sessions
- Single Docker Compose setup for all dev projects

**3. Production SSO Mode**
- Centralized authentication service
- Multiple applications share Redis blacklist
- Shared cookie domain for seamless SSO

## Components and Interfaces

### Core Services

#### PasswordService

Handles all password-related cryptographic operations using Argon2id.

```typescript
interface PasswordService {
  /**
   * Hash a plaintext password using Argon2id
   * @param password - Plaintext password
   * @returns Argon2id hash string
   */
  hash(password: string): Promise<string>;
  
  /**
   * Verify a password against an Argon2id hash
   * @param password - Plaintext password
   * @param hash - Argon2id hash to verify against
   * @returns True if password matches, false otherwise
   */
  verify(password: string, hash: string): Promise<boolean>;
  
  /**
   * Check if a hash is bcrypt (for migration support)
   * @param hash - Hash string to check
   * @returns True if hash is bcrypt format
   */
  isBcryptHash(hash: string): boolean;
  
  /**
   * Verify bcrypt hash and rehash with Argon2id
   * @param password - Plaintext password
   * @param bcryptHash - Existing bcrypt hash
   * @param userId - User ID for updating hash
   * @returns True if password matches
   */
  verifyAndMigrate(password: string, bcryptHash: string, userId: string): Promise<boolean>;
}
```

**Implementation Details:**
- Uses @node-rs/argon2 library for native performance
- Argon2id variant (hybrid of Argon2i and Argon2d)
- Memory cost: 65536 KB (64 MB)
- Time cost: 3 iterations
- Parallelism: 4 threads
- Constant-time comparison for verification

#### TokenService

Manages JWT generation, verification, and refresh token lifecycle.

```typescript
interface TokenService {
  /**
   * Generate an RS256-signed access token
   * @param payload - Token payload (user ID, email, roles, tenant)
   * @returns Signed JWT string
   */
  generateAccessToken(payload: AccessTokenPayload): string;
  
  /**
   * Generate a refresh token and store in database
   * @param userId - User ID
   * @param parentTokenId - Optional parent token ID for rotation tracking
   * @returns Refresh token JWT
   */
  generateRefreshToken(userId: string, parentTokenId?: string): Promise<string>;
  
  /**
   * Verify and decode an access token
   * @param token - JWT string
   * @returns Decoded payload
   */
  verifyAccessToken(token: string): AccessTokenPayload;
  
  /**
   * Verify refresh token and rotate
   * @param token - Refresh token JWT
   * @returns New access and refresh tokens
   */
  rotateRefreshToken(token: string): Promise<TokenPair>;
  
  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID
   */
  revokeAllTokens(userId: string): Promise<void>;
  
  /**
   * Check if a token is blacklisted
   * @param tokenId - Token JTI
   * @returns True if blacklisted
   */
  isBlacklisted(tokenId: string): Promise<boolean>;
  
  /**
   * Add token to blacklist with TTL
   * @param tokenId - Token JTI
   * @param expiresAt - Token expiration date
   */
  blacklistToken(tokenId: string, expiresAt: Date): Promise<void>;
}

interface AccessTokenPayload {
  sub: string;        // User ID
  email: string;      // User email
  tenantId: string;   // Tenant ID
  roles: string[];    // User roles
  iat: number;        // Issued at
  exp: number;        // Expires at
  iss: string;        // Issuer
  aud: string;        // Audience
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
```

**Implementation Details:**
- RS256 algorithm using RSA key pairs (2048-bit minimum)
- Access tokens: 15-minute expiry, stateless
- Refresh tokens: 7-day expiry, stored hashed in database
- Token rotation: Each refresh invalidates previous token
- Reuse detection: If revoked token is used, revoke all user tokens
- JTI (JWT ID) for tracking individual tokens



#### AuthService

Orchestrates authentication flows and business logic.

```typescript
interface AuthService {
  /**
   * Register a new user
   * @param email - User email
   * @param password - User password
   * @param tenantId - Optional tenant ID
   * @returns Created user and tokens
   */
  register(email: string, password: string, tenantId?: string): Promise<AuthResult>;
  
  /**
   * Authenticate user with email and password
   * @param email - User email
   * @param password - User password
   * @returns User and tokens
   */
  login(email: string, password: string): Promise<AuthResult>;
  
  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token JWT
   * @returns New token pair
   */
  refresh(refreshToken: string): Promise<AuthResult>;
  
  /**
   * Logout user and revoke all tokens
   * @param userId - User ID
   */
  logout(userId: string): Promise<void>;
  
  /**
   * Initiate password reset flow
   * @param email - User email
   * @returns Success message
   */
  requestPasswordReset(email: string): Promise<void>;
  
  /**
   * Complete password reset with magic link token
   * @param token - Reset token from email
   * @param newPassword - New password
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
  
  /**
   * Send email verification link
   * @param userId - User ID
   */
  sendEmailVerification(userId: string): Promise<void>;
  
  /**
   * Verify email with token
   * @param token - Verification token
   */
  verifyEmail(token: string): Promise<void>;
}

interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface SafeUser {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  tenantId: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### RedisService

Manages Redis connections and token blacklist operations.

```typescript
interface RedisService {
  /**
   * Add a token to the blacklist
   * @param tokenId - Token JTI
   * @param ttlSeconds - Time to live in seconds
   */
  blacklist(tokenId: string, ttlSeconds: number): Promise<void>;
  
  /**
   * Check if a token is blacklisted
   * @param tokenId - Token JTI
   * @returns True if blacklisted
   */
  isBlacklisted(tokenId: string): Promise<boolean>;
  
  /**
   * Remove a token from blacklist (manual cleanup)
   * @param tokenId - Token JTI
   */
  unblacklist(tokenId: string): Promise<void>;
  
  /**
   * Get Redis health status
   * @returns Health check result
   */
  healthCheck(): Promise<HealthStatus>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}
```

**Implementation Details:**
- Uses ioredis library for Redis client
- Key format: `auth:blacklist:{tokenId}`
- Automatic TTL cleanup (no manual cleanup needed)
- Connection pooling for performance
- Graceful degradation: Fail closed if Redis unavailable

### Guards and Decorators

#### JwtAuthGuard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;
    
    // Verify JWT and check blacklist
    return super.canActivate(context);
  }
}
```

#### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

#### Decorators

```typescript
// Mark routes as public (skip authentication)
export const Public = () => SetMetadata('isPublic', true);

// Inject current user into controller
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

// Require specific roles
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Inject current tenant
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  }
);
```

### Configuration Interface

```typescript
interface HorizonAuthConfig {
  // Database configuration
  database: {
    url: string;
  };
  
  // Redis configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // JWT configuration
  jwt: {
    privateKey: string;      // RSA private key (PEM format)
    publicKey: string;       // RSA public key (PEM format)
    accessTokenExpiry?: string;   // Default: '15m'
    refreshTokenExpiry?: string;  // Default: '7d'
    issuer?: string;         // Default: 'horizon-auth'
    audience?: string;       // Default: 'horizon-api'
  };
  
  // Multi-tenant configuration
  multiTenant?: {
    enabled: boolean;
    tenantIdExtractor?: 'header' | 'subdomain' | 'custom';
    customExtractor?: (req: Request) => string;
    defaultTenantId?: string;  // Default: 'default'
  };
  
  // Rate limiting configuration
  rateLimit?: {
    login?: { limit: number; ttl: number };      // Default: 5/min
    register?: { limit: number; ttl: number };   // Default: 3/min
    passwordReset?: { limit: number; ttl: number }; // Default: 3/hour
  };
  
  // Email configuration
  email?: {
    provider: 'resend' | 'sendgrid' | 'custom';
    apiKey?: string;
    from: string;
    customSender?: (to: string, subject: string, html: string) => Promise<void>;
  };
  
  // Security configuration
  security?: {
    bcryptMigration?: boolean;  // Enable bcrypt to Argon2id migration
    cookieSecure?: boolean;     // Default: true in production
    cookieDomain?: string;      // For SSO mode
  };
  
  // Global guards
  guards?: {
    applyJwtGuardGlobally?: boolean;  // Default: false
  };
}
```

## Data Models

### Prisma Schema

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  fullName          String?
  passwordHash      String?
  emailVerified     Boolean  @default(false)
  emailVerifyToken  String?  @unique
  tenantId          String   @default("default")
  roles             String[] @default(["user"])
  refreshTokens     RefreshToken[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([email])
  @@index([tenantId])
  @@map("users")
}

model RefreshToken {
  id            String    @id @default(cuid())
  hashedToken   String    @unique
  userId        String
  expiresAt     DateTime
  parentTokenId String?
  createdAt     DateTime  @default(now())
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([hashedToken])
  @@map("refresh_tokens")
}
```

### Database Indexes

- **users.email**: Unique index for fast email lookups during login
- **users.tenantId**: Index for multi-tenant queries
- **refresh_tokens.userId**: Index for finding all user tokens during logout
- **refresh_tokens.hashedToken**: Unique index for token verification

### Data Flow

**Registration Flow:**
1. User submits email + password
2. Validate email format and password strength
3. Hash password with Argon2id
4. Create user record with emailVerified=false
5. Generate email verification token (crypto.randomUUID)
6. Send verification email
7. Return success message

**Login Flow:**
1. User submits email + password
2. Lookup user by email
3. Verify password against Argon2id hash
4. Generate access token (RS256, 15min expiry)
5. Generate refresh token (random UUID)
6. Hash refresh token with SHA-256
7. Store hashed refresh token in database
8. Return access token in body, refresh token in HTTP-only cookie

**Token Refresh Flow:**
1. Client sends refresh token from cookie
2. Verify refresh token JWT signature
3. Extract JTI and hash with SHA-256
4. Lookup hashed token in database
5. Check if token is revoked or expired
6. If token already used, revoke all user tokens (reuse detection)
7. Mark current token as revoked
8. Generate new access token
9. Generate new refresh token with current token as parent
10. Return new tokens

**Logout Flow:**
1. Extract user ID from access token
2. Find all non-revoked refresh tokens for user
3. Add all token JTIs to Redis blacklist
4. Mark all refresh tokens as revoked in database
5. Clear refresh token cookie
6. Return success



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Password Hashing Round-Trip

*For any* valid password string, hashing the password with Argon2id and then verifying the original password against that hash should succeed.

**Validates: Requirements 3.1, 3.5**

### Property 2: Argon2id Hash Format

*For any* password hashed by the Package, the resulting hash should be in Argon2id format (not bcrypt, scrypt, or any other format).

**Validates: Requirements 3.6**

### Property 3: JWT Signing Round-Trip

*For any* access token generated by the Package, verifying the token with the corresponding RSA public key should succeed and return the original payload.

**Validates: Requirements 4.1, 4.5**

### Property 4: JWT Payload Structure

*For any* access token generated by the Package, the decoded payload should contain sub (user ID), email, tenantId, roles, iat, exp, iss, and aud fields, with expiration set to 15 minutes from issuance.

**Validates: Requirements 4.2, 4.3**

### Property 5: Refresh Token Rotation

*For any* valid refresh token, using it to refresh should generate a new access token and a new refresh token, and the original refresh token should be marked as revoked in the database.

**Validates: Requirements 5.3**

### Property 6: Refresh Token Storage Security

*For any* refresh token stored in the database, the stored value should be a SHA-256 hash, not the plaintext token.

**Validates: Requirements 5.4**

### Property 7: Refresh Token Parent Tracking

*For any* refresh token generated during token rotation, the database record should include the parentTokenId field referencing the previous token.

**Validates: Requirements 5.10**

### Property 8: Token Blacklist Enforcement

*For any* token added to the Redis blacklist, subsequent authentication attempts using that token should be rejected.

**Validates: Requirements 6.1, 6.3**

### Property 9: Blacklist TTL Configuration

*For any* token added to the blacklist, the Redis TTL should be set to match the token's expiration time.

**Validates: Requirements 6.2**

### Property 10: User Registration Validation

*For any* registration attempt with an invalid email format or password shorter than 8 characters, the Package should reject the registration and return an error.

**Validates: Requirements 7.2, 7.3**

### Property 11: User Creation Defaults

*For any* newly created user account, the database record should have emailVerified set to false, a UUID v4 emailVerifyToken, the default tenantId, and roles array containing "user".

**Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.9**

### Property 12: Password Reset Token Generation

*For any* password reset request, the Package should generate a UUID v4 reset token with expiration set to 1 hour from creation.

**Validates: Requirements 8.1, 8.2**

### Property 13: Password Reset Token Revocation

*For any* successful password reset, all existing refresh tokens for that user should be revoked.

**Validates: Requirements 8.8**

### Property 14: Multi-Tenant Token Claims

*For any* access token generated when multi-tenant mode is enabled, the decoded payload should include the tenantId claim.

**Validates: Requirements 10.2**

### Property 15: User Tenant Assignment

*For any* user record in the database, the tenantId field should be present and non-null.

**Validates: Requirements 10.1**

### Property 16: Configuration Validation

*For any* invalid configuration passed to forRoot() (missing required fields, invalid types, or malformed values), the Dynamic Module should throw a descriptive error during initialization.

**Validates: Requirements 2.7**

### Property 17: Logout Token Revocation

*For any* user logout operation, all non-revoked refresh tokens for that user should be added to the Redis blacklist and marked as revoked in the database.

**Validates: Requirements 6.1**



## Error Handling

### Error Categories

**Authentication Errors**
- Invalid credentials (401 Unauthorized)
- Expired tokens (401 Unauthorized)
- Invalid token signatures (401 Unauthorized)
- Blacklisted tokens (401 Unauthorized)
- Missing authentication (401 Unauthorized)

**Authorization Errors**
- Insufficient roles (403 Forbidden)
- Tenant isolation violations (403 Forbidden)

**Validation Errors**
- Invalid email format (400 Bad Request)
- Weak password (400 Bad Request)
- Missing required fields (400 Bad Request)
- Duplicate email registration (409 Conflict)

**Rate Limiting Errors**
- Too many requests (429 Too Many Requests)
- Includes Retry-After header

**Infrastructure Errors**
- Database connection failures (503 Service Unavailable)
- Redis connection failures (503 Service Unavailable)
- Email service failures (500 Internal Server Error)

### Error Response Format

All errors follow a consistent structure:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

Example:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/auth/login"
}
```

### Security Error Handling

**Timing Attack Prevention**
- Password verification uses constant-time comparison
- Failed login returns same error message regardless of whether email exists
- Response times are consistent for valid and invalid credentials

**Token Reuse Detection**
- If a revoked refresh token is used, all user tokens are immediately revoked
- Security event is logged for audit
- User receives 401 Unauthorized

**Fail-Closed Security**
- If Redis is unavailable, authentication fails (does not bypass blacklist check)
- If database is unavailable, authentication fails
- Configuration errors prevent application startup

### Logging and Monitoring

**Security Events (Always Logged)**
- Failed login attempts
- Token reuse detection
- Password reset requests
- Account lockouts
- Configuration errors

**Audit Events (Always Logged)**
- Successful logins
- User registrations
- Password changes
- Token refreshes
- Logouts

**Log Format**
```typescript
interface SecurityLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}
```

## Testing Strategy

### Dual Testing Approach

The package requires both unit tests and property-based tests for comprehensive coverage. These testing approaches are complementary:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Together, they provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

**Library Selection**: fast-check for TypeScript/JavaScript

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: horizon-auth-npm-package, Property {number}: {property_text}`

**Property Test Examples**:

```typescript
// Property 1: Password Hashing Round-Trip
// Feature: horizon-auth-npm-package, Property 1: Password Hashing Round-Trip
test('password hashing round-trip', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string({ minLength: 8, maxLength: 100 }), async (password) => {
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(password, hash);
      expect(isValid).toBe(true);
    }),
    { numRuns: 100 }
  );
});

// Property 3: JWT Signing Round-Trip
// Feature: horizon-auth-npm-package, Property 3: JWT Signing Round-Trip
test('JWT signing round-trip', () => {
  fc.assert(
    fc.property(
      fc.record({
        sub: fc.uuid(),
        email: fc.emailAddress(),
        tenantId: fc.string(),
        roles: fc.array(fc.string())
      }),
      (payload) => {
        const token = tokenService.generateAccessToken(payload);
        const decoded = tokenService.verifyAccessToken(token);
        expect(decoded.sub).toBe(payload.sub);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.tenantId).toBe(payload.tenantId);
        expect(decoded.roles).toEqual(payload.roles);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 10: User Registration Validation
// Feature: horizon-auth-npm-package, Property 10: User Registration Validation
test('user registration validation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        fc.string().filter(s => !s.includes('@')), // Invalid email
        fc.string({ maxLength: 7 }) // Short password
      ),
      async (invalidInput) => {
        await expect(
          authService.register(invalidInput, 'password123')
        ).rejects.toThrow();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Focus Areas**:
- Specific examples demonstrating correct behavior
- Edge cases (empty strings, null values, boundary conditions)
- Error conditions (expired tokens, invalid signatures, missing fields)
- Integration points between components

**Unit Test Examples**:

```typescript
// Specific example: Expired token rejection
test('rejects expired access token', () => {
  const expiredToken = createExpiredToken();
  expect(() => tokenService.verifyAccessToken(expiredToken))
    .toThrow('Token expired');
});

// Edge case: Empty password
test('rejects empty password during registration', async () => {
  await expect(authService.register('user@example.com', ''))
    .rejects.toThrow('Password must be at least 8 characters');
});

// Integration: Token refresh flow
test('refresh token rotation updates database', async () => {
  const { refreshToken } = await authService.login('user@example.com', 'password');
  const { refreshToken: newToken } = await authService.refresh(refreshToken);
  
  const oldTokenRecord = await prisma.refreshToken.findFirst({
    where: { hashedToken: hashToken(refreshToken) }
  });
  
  expect(oldTokenRecord.revokedAt).not.toBeNull();
  expect(newToken).not.toBe(refreshToken);
});
```

### E2E Testing

**Test Scenarios**:
1. Complete registration flow (start → verify → finish)
2. Login flow with token refresh
3. Logout and token blacklisting
4. Password reset flow
5. Rate limiting enforcement
6. Multi-tenant isolation
7. JWKS endpoint accessibility
8. Schematic generator output

**E2E Test Example**:

```typescript
describe('Authentication E2E', () => {
  test('complete registration and login flow', async () => {
    // Register
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);
    
    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);
    
    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.headers['set-cookie']).toBeDefined();
    
    // Access protected route
    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);
  });
});
```

### Test Coverage Goals

- Minimum 80% code coverage
- 100% coverage of security-critical paths (authentication, authorization, token management)
- All correctness properties implemented as property-based tests
- All error conditions covered by unit tests

### Continuous Integration

**Pre-commit Checks**:
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests
- Property tests

**CI Pipeline**:
- Run all tests (unit + property + E2E)
- Generate coverage report
- Build package
- Verify schematic generator
- Test Docker Compose setup

## Schematic Generator Design

### Generator Structure

```
schematics/
├── init/
│   ├── index.ts           # Main schematic logic
│   ├── schema.json        # CLI options schema
│   ├── files/             # Template files
│   │   ├── app.module.ts.template
│   │   ├── main.ts.template
│   │   ├── sample.controller.ts.template
│   │   ├── docker-compose.yml.template
│   │   ├── .env.example.template
│   │   └── prisma/
│   │       └── schema.prisma.template
│   └── README.md
└── collection.json        # Schematic collection definition
```

### Generator Logic

```typescript
export function init(options: InitOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // 1. Validate project structure
    validateNestProject(tree);
    
    // 2. Generate RSA key pair
    const { privateKey, publicKey } = generateRSAKeyPair();
    
    // 3. Apply templates
    const templateSource = apply(url('./files'), [
      template({
        ...options,
        privateKey,
        publicKey,
        databaseUrl: options.databaseUrl || 'postgresql://user:password@localhost:5432/horizon_auth',
        redisUrl: options.redisUrl || 'redis://localhost:6379'
      }),
      move(options.path || '.')
    ]);
    
    // 4. Merge with existing project
    const rule = mergeWith(templateSource);
    
    // 5. Install dependencies
    context.addTask(new NodePackageInstallTask());
    
    // 6. Run Prisma migration
    context.addTask(new RunSchematicTask('prisma-migrate', {}));
    
    return rule(tree, context);
  };
}
```

### Generated Files

**app.module.ts**:
```typescript
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY,
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
    }),
  ],
})
export class AppModule {}
```

**main.ts**:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
```

**sample.controller.ts**:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Public } from '@ofeklabs/horizon-auth';

@Controller()
export class SampleController {
  @Public()
  @Get()
  getHello() {
    return { message: 'Hello World' };
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
```

## Package Publication

### NPM Package Configuration

**package.json**:
```json
{
  "name": "@ofeklabs/horizon-auth",
  "version": "1.0.0",
  "description": "Production-ready NestJS authentication module with 2026 security standards",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "schematics": "./schematics/collection.json",
  "files": [
    "dist",
    "schematics",
    "prisma"
  ],
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/throttler": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1"
  },
  "dependencies": {
    "@node-rs/argon2": "^1.7.0",
    "ioredis": "^5.3.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  }
}
```

**.npmignore**:
```
src/
test/
*.spec.ts
*.test.ts
tsconfig.json
.env
.env.example
node_modules/
coverage/
```

### Build Process

```bash
# 1. Clean previous build
rm -rf dist

# 2. Compile TypeScript
tsc -p tsconfig.build.json

# 3. Copy schematics
cp -r schematics dist/

# 4. Copy Prisma schema
cp -r prisma dist/

# 5. Publish to NPM
npm publish --access public
```

## Security Considerations

### Key Management

**Development**:
- Generate RSA key pair during schematic initialization
- Store keys in .env file (gitignored)
- Keys are 2048-bit minimum

**Production**:
- Generate keys using secure random number generator
- Store private key in secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys periodically (recommended: every 90 days)
- Support multiple public keys for zero-downtime rotation

### Cookie Security

**Attributes**:
- HttpOnly: Prevents JavaScript access
- Secure: HTTPS only (enforced in production)
- SameSite: Strict (prevents CSRF)
- Path: /auth/refresh (limits scope)
- MaxAge: 7 days

**Domain Configuration**:
- Single app: No domain attribute (same-origin only)
- SSO mode: Set domain to parent domain (e.g., .example.com)

### Rate Limiting Strategy

**Endpoint-Specific Limits**:
- Login: 5 attempts per minute per IP
- Registration: 3 attempts per minute per IP
- Password reset: 3 attempts per hour per IP
- Token refresh: 10 attempts per minute per IP

**Implementation**:
- Uses @nestjs/throttler with Redis storage
- Tracks by IP address
- Returns 429 with Retry-After header

### SQL Injection Prevention

- All database queries use Prisma ORM
- Parameterized queries prevent SQL injection
- No raw SQL queries in authentication flows

### XSS Prevention

- All user input validated with class-validator
- Email addresses sanitized
- No user content rendered in authentication responses

## Deployment Architecture

### Standalone Deployment

```mermaid
graph LR
    Client[Client] --> LB[Load Balancer]
    LB --> App1[App Instance 1]
    LB --> App2[App Instance 2]
    LB --> App3[App Instance 3]
    
    App1 --> PG[(PostgreSQL)]
    App2 --> PG
    App3 --> PG
    
    App1 --> Redis[(Redis)]
    App2 --> Redis
    App3 --> Redis
```

### SSO Deployment

```mermaid
graph LR
    Client1[App 1 Client] --> App1[App 1]
    Client2[App 2 Client] --> App2[App 2]
    Client3[App 3 Client] --> App3[App 3]
    
    App1 --> Auth[Auth Service]
    App2 --> Auth
    App3 --> Auth
    
    Auth --> PG[(PostgreSQL)]
    Auth --> Redis[(Redis)]
    
    App1 --> Redis
    App2 --> Redis
    App3 --> Redis
```

### Infrastructure Requirements

**PostgreSQL**:
- Version: 14 or higher
- Connections: 20 per application instance
- Storage: 10GB minimum
- Backups: Daily automated backups

**Redis**:
- Version: 7 or higher
- Memory: 1GB minimum
- Persistence: AOF enabled
- Replication: Master-replica for high availability

**Application**:
- Node.js: 18 or higher
- Memory: 512MB per instance
- CPU: 1 vCPU per instance
- Horizontal scaling: 3+ instances recommended

## Migration Guide

### From Existing Auth System

**Step 1: Install Package**
```bash
npm install @ofeklabs/horizon-auth
npx nest g @ofeklabs/horizon-auth:init
```

**Step 2: Migrate Database Schema**
```bash
# Generate migration from existing schema
npx prisma migrate dev --name add_horizon_auth_tables
```

**Step 3: Migrate Password Hashes**

Enable bcrypt migration in configuration:
```typescript
HorizonAuthModule.forRoot({
  security: {
    bcryptMigration: true,
  },
  // ... other config
})
```

The package will automatically rehash bcrypt passwords to Argon2id on user login.

**Step 4: Migrate JWT Configuration**

Generate RSA key pair:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Update configuration to use RS256:
```typescript
jwt: {
  privateKey: fs.readFileSync('private.pem', 'utf8'),
  publicKey: fs.readFileSync('public.pem', 'utf8'),
}
```

**Step 5: Update Client Applications**

- Update login flow to handle refresh token cookies
- Implement token refresh logic
- Update logout to call /auth/logout endpoint

### Gradual Migration Strategy

1. Deploy package alongside existing auth system
2. Route new users to new system
3. Migrate existing users on login (password rehashing)
4. Monitor both systems for 30 days
5. Deprecate old system once migration complete

## Performance Considerations

### Benchmarks

**Target Performance**:
- Login: < 200ms (p95)
- Token refresh: < 50ms (p95)
- Token verification: < 10ms (p95)
- Password hashing: < 500ms (p95)

### Optimization Strategies

**Caching**:
- Cache public key for JWT verification (in-memory)
- Cache user roles for authorization (Redis, 5-minute TTL)
- Cache JWKS response (in-memory, 1-hour TTL)

**Database**:
- Index on users.email for fast login lookups
- Index on refresh_tokens.hashedToken for token verification
- Connection pooling (20 connections per instance)

**Redis**:
- Pipeline blacklist operations
- Use Redis cluster for high throughput
- Monitor memory usage and eviction policy

### Monitoring

**Metrics to Track**:
- Authentication success/failure rate
- Token refresh rate
- Password reset requests
- Rate limit hits
- Database query latency
- Redis latency
- Error rates by endpoint

**Alerting**:
- Failed login rate > 10% (potential attack)
- Redis unavailable (authentication blocked)
- Database unavailable (authentication blocked)
- High latency (> 1s p95)
