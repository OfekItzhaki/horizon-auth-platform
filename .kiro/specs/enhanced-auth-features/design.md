# Design Document: Enhanced Authentication Features

## Overview

This design extends the @ofeklabs/horizon-auth package with enterprise-grade authentication features while maintaining the existing SSO/Full mode architecture. The implementation follows NestJS best practices and integrates seamlessly with the current Prisma/Redis/JWT infrastructure.

The new features are modular and configurable, allowing developers to enable only the features they need. All features work exclusively in Full Mode, as they require database persistence and are not applicable to SSO Mode (which only verifies tokens).

### Key Design Principles

1. **Modularity**: Each feature can be independently enabled/disabled through configuration
2. **Backward Compatibility**: Existing implementations continue to work without changes
3. **Security First**: All sensitive operations require authentication and proper validation
4. **Mode Awareness**: Features only activate in Full Mode, respecting the SSO/Full mode architecture
5. **Consistent Patterns**: Follow existing code patterns (services, DTOs, guards, controllers)

## Architecture

### High-Level Component Structure

```
HorizonAuthModule (existing)
├── AuthModule (extended)
│   ├── AuthController (extended with new endpoints)
│   ├── AuthService (extended with new methods)
│   ├── SocialAuthService (new)
│   ├── DeviceService (new)
│   ├── PushTokenService (new)
│   ├── TwoFactorService (new)
│   ├── AccountService (new)
│   └── Strategies
│       ├── GoogleStrategy (new)
│       └── FacebookStrategy (new)
├── PrismaModule (schema extended)
└── RedisModule (existing)
```

### Configuration Extension

The `HorizonAuthConfig` interface will be extended with optional feature configurations:

```typescript
interface HorizonAuthConfig {
  // ... existing config ...
  
  features?: {
    socialLogin?: {
      google?: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
      };
      facebook?: {
        appId: string;
        appSecret: string;
        callbackUrl: string;
      };
    };
    deviceManagement?: {
      enabled: boolean;
      maxDevicesPerUser?: number; // Optional limit
    };
    pushNotifications?: {
      enabled: boolean;
    };
    twoFactor?: {
      enabled: boolean;
      issuer?: string; // For TOTP QR codes (e.g., "MyApp")
    };
    accountManagement?: {
      enabled: boolean;
      allowReactivation?: boolean;
    };
  };
}
```

## Components and Interfaces

### 1. Social Authentication

**SocialAuthService**
- Handles OAuth2 flows for Google and Facebook
- Links social accounts to existing users or creates new users
- Stores social profile data

**Key Methods:**
- `authenticateWithGoogle(code: string): Promise<AuthResponse>`
- `authenticateWithFacebook(code: string): Promise<AuthResponse>`
- `linkSocialAccount(userId: string, provider: string, profile: SocialProfile): Promise<void>`
- `findUserBySocialAccount(provider: string, providerId: string): Promise<User | null>`

**Passport Strategies:**
- `GoogleStrategy`: Validates Google OAuth2 tokens
- `FacebookStrategy`: Validates Facebook OAuth2 tokens

### 2. Device Management

**DeviceService**
- Tracks user devices and sessions
- Generates device fingerprints
- Manages device-based token revocation

**Key Methods:**
- `createOrUpdateDevice(userId: string, deviceInfo: DeviceInfo): Promise<Device>`
- `getUserDevices(userId: string): Promise<Device[]>`
- `revokeDevice(userId: string, deviceId: string): Promise<void>`
- `updateLastActive(deviceId: string): Promise<void>`
- `generateFingerprint(userAgent: string, ip?: string): string`

**Device Information Extraction:**
- Parse User-Agent header using `ua-parser-js` library
- Extract: browser name/version, OS name/version, device type
- Generate fingerprint using hash of normalized user agent

### 3. Push Notification Support

**PushTokenService**
- Manages FCM and APNS push notification tokens
- Associates tokens with devices
- Handles token updates and revocation

**Key Methods:**
- `registerPushToken(userId: string, deviceId: string, token: string, type: 'FCM' | 'APNS'): Promise<PushToken>`
- `updatePushToken(tokenId: string, newToken: string): Promise<void>`
- `revokePushToken(tokenId: string): Promise<void>`
- `getUserPushTokens(userId: string): Promise<PushToken[]>`
- `revokeDevicePushTokens(deviceId: string): Promise<void>`

### 4. Two-Factor Authentication

**TwoFactorService**
- Generates and validates TOTP codes
- Manages backup codes
- Handles 2FA enable/disable flows

**Key Methods:**
- `generateTotpSecret(userId: string): Promise<{ secret: string; qrCode: string }>`
- `verifyTotpSetup(userId: string, code: string): Promise<boolean>`
- `enableTwoFactor(userId: string): Promise<{ backupCodes: string[] }>`
- `disableTwoFactor(userId: string): Promise<void>`
- `verifyTotpCode(userId: string, code: string): Promise<boolean>`
- `verifyBackupCode(userId: string, code: string): Promise<boolean>`
- `regenerateBackupCodes(userId: string): Promise<string[]>`

**Libraries:**
- `otplib` for TOTP generation and validation
- `qrcode` for QR code generation
- `crypto` for backup code generation

**Backup Code Format:**
- 10 codes generated per user
- Each code: 8 alphanumeric characters (e.g., "A3F7-K9M2")
- Stored as bcrypt hashes for security
- Single-use only

### 5. Account Management

**AccountService**
- Handles account deactivation, reactivation, and deletion
- Manages cascading operations for related data

**Key Methods:**
- `deactivateAccount(userId: string, reason?: string): Promise<void>`
- `reactivateAccount(userId: string): Promise<void>`
- `deleteAccount(userId: string): Promise<void>`
- `isAccountActive(userId: string): Promise<boolean>`

**Deactivation vs Deletion:**
- Deactivation: Sets `isActive = false`, revokes tokens, preserves data
- Deletion: Permanently removes user and all related data (cascade delete)

## Data Models

### Database Schema Extensions

**SocialAccount Table:**
```prisma
model SocialAccount {
  id          String   @id @default(cuid())
  userId      String
  provider    String   // 'google' | 'facebook'
  providerId  String   // Provider's user ID
  email       String?
  displayName String?
  profileData Json?    // Additional profile info
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
  @@map("social_accounts")
}
```

**Device Table:**
```prisma
model Device {
  id           String        @id @default(cuid())
  userId       String
  deviceName   String?       // e.g., "iPhone 13"
  deviceType   String?       // 'mobile' | 'tablet' | 'desktop'
  os           String?       // e.g., "iOS 16.0"
  browser      String?       // e.g., "Safari 16.0"
  fingerprint  String        // Hash of user agent
  lastActiveAt DateTime      @default(now())
  createdAt    DateTime      @default(now())
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokens RefreshToken[]
  pushTokens   PushToken[]

  @@index([userId])
  @@index([fingerprint])
  @@map("devices")
}
```

**PushToken Table:**
```prisma
model PushToken {
  id        String   @id @default(cuid())
  userId    String
  deviceId  String
  token     String   @unique
  tokenType String   // 'FCM' | 'APNS'
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  device    Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceId])
  @@map("push_tokens")
}
```

**TwoFactorAuth Table:**
```prisma
model TwoFactorAuth {
  id         String    @id @default(cuid())
  userId     String    @unique
  totpSecret String    // Encrypted TOTP secret
  enabled    Boolean   @default(false)
  enabledAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("two_factor_auth")
}
```

**BackupCode Table:**
```prisma
model BackupCode {
  id        String   @id @default(cuid())
  userId    String
  codeHash  String   // Bcrypt hash of the code
  used      Boolean  @default(false)
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("backup_codes")
}
```

**User Table Extensions:**
```prisma
model User {
  // ... existing fields ...
  isActive           Boolean         @default(true)
  deactivationReason String?
  socialAccounts     SocialAccount[]
  devices            Device[]
  pushTokens         PushToken[]
  twoFactorAuth      TwoFactorAuth?
  backupCodes        BackupCode[]
}
```

**RefreshToken Table Extension:**
```prisma
model RefreshToken {
  // ... existing fields ...
  deviceId  String?
  device    Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)
}
```

### DTOs (Data Transfer Objects)

**Social Login:**
```typescript
class GoogleCallbackDto {
  @IsString()
  code: string;
}

class FacebookCallbackDto {
  @IsString()
  code: string;
}
```

**Device Management:**
```typescript
class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceName?: string;
}

class DeviceResponseDto {
  id: string;
  deviceName?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  lastActiveAt: Date;
  current: boolean; // Is this the current device?
}
```

**Push Notifications:**
```typescript
class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsEnum(['FCM', 'APNS'])
  tokenType: 'FCM' | 'APNS';

  @IsOptional()
  @IsString()
  deviceId?: string;
}
```

**Two-Factor Authentication:**
```typescript
class EnableTwoFactorDto {
  // No fields - initiates setup
}

class VerifyTwoFactorSetupDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

class VerifyTwoFactorLoginDto {
  @IsString()
  @Length(6, 8)
  code: string; // TOTP (6 digits) or backup code (8 chars)
}

class TwoFactorSetupResponseDto {
  secret: string;
  qrCode: string; // Data URL
}

class TwoFactorEnabledResponseDto {
  backupCodes: string[];
}
```

**Account Management:**
```typescript
class DeactivateAccountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
```

## 
Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Social Login Properties

Property 1: OAuth code exchange succeeds for valid codes
*For any* valid OAuth authorization code from a configured provider (Google or Facebook), exchanging the code should successfully retrieve user profile information containing at minimum an email and provider user ID.
**Validates: Requirements 1.2, 1.4**

Property 2: Social account linking preserves user identity
*For any* existing user and any social provider profile, linking the social account should create an association that allows future logins through that provider to authenticate as the same user.
**Validates: Requirements 1.5, 1.8**

Property 3: New user creation from social login
*For any* social provider profile for a non-existing user, the authentication process should create a new user account with email and display name populated from the social profile.
**Validates: Requirements 1.6**

Property 4: Social account data round-trip
*For any* social account with provider, providerId, email, and profile data, storing the account then retrieving it by userId should return equivalent data.
**Validates: Requirements 1.7**

### Device Management Properties

Property 5: Device fingerprint determinism
*For any* user agent string, generating a device fingerprint should produce the same hash when called multiple times with the same input.
**Validates: Requirements 2.2**

Property 6: Device information extraction completeness
*For any* login request with a valid User-Agent header, the system should extract and store at minimum the browser name and OS name (device type may be null for desktop browsers).
**Validates: Requirements 2.1**

Property 7: Active device list accuracy
*For any* user, the list of active devices should contain exactly those devices that have at least one non-revoked refresh token.
**Validates: Requirements 2.4**

Property 8: Device revocation cascades to tokens
*For any* device with associated refresh tokens and push tokens, revoking the device should mark all its refresh tokens as revoked and all its push tokens as inactive.
**Validates: Requirements 2.6, 3.5**

Property 9: Revoked device token refresh fails
*For any* refresh token associated with a revoked device, attempting to use it to refresh an access token should fail with an authentication error.
**Validates: Requirements 2.7**

### Push Notification Properties

Property 10: Push token registration with device association
*For any* valid push token and device ID, registering the token should create a push token record linked to both the user and the device.
**Validates: Requirements 3.1, 3.2**

Property 11: Multiple push tokens per user
*For any* user with N devices, the system should support registering N distinct push tokens, one per device.
**Validates: Requirements 3.3**

Property 12: Push token update replaces old token
*For any* device with an existing push token, registering a new token for that device should deactivate the old token and activate the new one.
**Validates: Requirements 3.4**

Property 13: Active push token retrieval accuracy
*For any* user, retrieving push tokens should return exactly those tokens where active=true, each with its associated device information.
**Validates: Requirements 3.6**

Property 14: Push token revocation marks inactive
*For any* active push token, explicitly revoking it should set active=false without deleting the record.
**Validates: Requirements 3.7**

### Two-Factor Authentication Properties

Property 15: TOTP secret generation and QR code creation
*For any* user enabling 2FA, the system should generate a unique TOTP secret and create a QR code data URL that encodes the secret in otpauth:// format.
**Validates: Requirements 4.1, 4.2**

Property 16: Backup code generation count
*For any* 2FA enablement or backup code regeneration, exactly 10 unique backup codes should be generated and stored as hashed values.
**Validates: Requirements 4.3, 4.10**

Property 17: TOTP verification requires valid code
*For any* TOTP secret, only 6-digit codes that are valid for the current 30-second time window (or adjacent windows for clock skew) should pass verification.
**Validates: Requirements 4.4, 4.6**

Property 18: Backup code single-use enforcement
*For any* backup code, after it is successfully used for authentication, subsequent attempts to use the same code should fail.
**Validates: Requirements 4.7, 4.8**

Property 19: 2FA login requires both factors
*For any* user with 2FA enabled, successful login should require both valid password authentication and valid TOTP/backup code verification.
**Validates: Requirements 4.5**

Property 20: 2FA disable cleanup
*For any* user with 2FA enabled, disabling 2FA should remove the TOTP secret and mark all backup codes as invalid (or delete them).
**Validates: Requirements 4.9**

Property 21: Backup code regeneration invalidates old codes
*For any* user with existing backup codes, regenerating codes should make all old codes unusable and create 10 new valid codes.
**Validates: Requirements 4.10**

### Account Management Properties

Property 22: Account deactivation preserves data
*For any* active user account, deactivating the account should set isActive=false and optionally store a reason, but all user data (profile, social accounts, devices, etc.) should remain in the database.
**Validates: Requirements 5.1, 5.4**

Property 23: Deactivated account login prevention
*For any* user account where isActive=false, login attempts with correct credentials should fail with an appropriate error message.
**Validates: Requirements 5.2**

Property 24: Deactivation revokes all tokens
*For any* user with active refresh tokens, deactivating the account should mark all refresh tokens as revoked.
**Validates: Requirements 5.3**

Property 25: Account reactivation restores access
*For any* deactivated user account, reactivating should set isActive=true and allow successful login with correct credentials.
**Validates: Requirements 5.5**

Property 26: Account deletion cascade completeness
*For any* user account, deleting the account should remove the user record and all related records in SocialAccount, Device, PushToken, TwoFactorAuth, BackupCode, and RefreshToken tables.
**Validates: Requirements 5.6, 5.7**

Property 27: Account deletion confirmation
*For any* successful account deletion, the operation should return a success response and subsequent queries for that user ID should return null.
**Validates: Requirements 5.8**

### Configuration and Compatibility Properties

Property 28: Feature endpoint availability based on configuration
*For any* feature that is disabled in configuration, HTTP requests to that feature's endpoints should return 404 Not Found or not be registered in the route table.
**Validates: Requirements 6.6**

Property 29: Backward compatibility with existing configurations
*For any* valid configuration from the previous version (without new feature fields), the system should initialize successfully and provide all existing authentication functionality.
**Validates: Requirements 6.8, 9.1, 9.2**

Property 30: Database migration data preservation
*For any* existing user and refresh token records before migration, after applying the new schema migrations, all original data should remain intact and accessible.
**Validates: Requirements 9.3**

Property 31: JWT token structure consistency
*For any* user authentication, the generated JWT access token should have the same structure (claims, signing algorithm, expiry) as tokens generated by the previous version.
**Validates: Requirements 9.5**

## Error Handling

### Error Types and Responses

**Authentication Errors:**
- `INVALID_CREDENTIALS`: Wrong password or email
- `ACCOUNT_DEACTIVATED`: User account is deactivated
- `ACCOUNT_NOT_FOUND`: User does not exist
- `2FA_REQUIRED`: 2FA verification needed
- `INVALID_2FA_CODE`: TOTP or backup code is invalid
- `BACKUP_CODE_ALREADY_USED`: Backup code has been used

**Authorization Errors:**
- `UNAUTHORIZED`: No valid JWT token provided
- `TOKEN_REVOKED`: Refresh token has been revoked
- `DEVICE_REVOKED`: Device session has been revoked

**Validation Errors:**
- `INVALID_INPUT`: Request data fails validation
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_TOKEN_TYPE`: Push token type must be FCM or APNS

**Social Login Errors:**
- `OAUTH_FAILED`: OAuth provider returned an error
- `INVALID_OAUTH_CODE`: Authorization code is invalid or expired
- `SOCIAL_ACCOUNT_ALREADY_LINKED`: Social account is linked to another user

**Configuration Errors:**
- `FEATURE_DISABLED`: Requested feature is not enabled
- `INVALID_CONFIGURATION`: Configuration is missing required fields
- `SSO_MODE_NOT_SUPPORTED`: Feature not available in SSO mode

### Error Handling Strategy

1. **Validation Errors**: Return 400 Bad Request with detailed validation messages
2. **Authentication Errors**: Return 401 Unauthorized with error code
3. **Authorization Errors**: Return 403 Forbidden with error code
4. **Not Found Errors**: Return 404 Not Found
5. **Server Errors**: Return 500 Internal Server Error with generic message (log details)

### Graceful Degradation

- If device information extraction fails, create device with minimal info (fingerprint only)
- If QR code generation fails, return TOTP secret as plain text
- If push token registration fails, log error but don't fail the login process
- If email sending fails (for 2FA setup), retry with exponential backoff

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of correct behavior
- Edge cases (empty inputs, boundary values, null handling)
- Error conditions and exception handling
- Integration points between services
- Mock external dependencies (OAuth providers, QR code generation)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must be maintained
- Round-trip properties (store/retrieve, encode/decode)
- Relationship properties between entities

### Property-Based Testing Configuration

**Library**: Use `@fast-check/jest` for TypeScript/NestJS property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: enhanced-auth-features, Property {N}: {property_text}`
- Use custom generators for domain objects (User, Device, SocialAccount, etc.)

**Example Test Structure**:
```typescript
describe('Property 4: Social account data round-trip', () => {
  // Feature: enhanced-auth-features, Property 4: Social account data round-trip
  it('should preserve social account data through store and retrieve', async () => {
    await fc.assert(
      fc.asyncProperty(
        socialAccountArbitrary(),
        async (socialAccount) => {
          const stored = await socialAuthService.linkSocialAccount(
            socialAccount.userId,
            socialAccount.provider,
            socialAccount.profile
          );
          const retrieved = await prisma.socialAccount.findUnique({
            where: { id: stored.id }
          });
          expect(retrieved).toMatchObject({
            provider: socialAccount.provider,
            providerId: socialAccount.providerId,
            email: socialAccount.email,
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Requirements

**Unit Test Coverage**:
- All service methods: 100%
- All controller endpoints: 100%
- All DTOs validation: 100%
- Error handling paths: 100%

**Property Test Coverage**:
- All 31 correctness properties must have corresponding property-based tests
- Each property test must reference its design document property number

### Integration Testing

**Test Scenarios**:
1. Complete social login flow (OAuth redirect → callback → user creation/linking)
2. Device management lifecycle (create → list → revoke)
3. 2FA setup and login flow (enable → verify → login with 2FA)
4. Account deactivation and reactivation flow
5. Account deletion with cascade cleanup verification
6. Feature toggle behavior (enabled vs disabled features)
7. SSO mode vs Full mode behavior differences

**Test Environment**:
- Use test database with migrations applied
- Use test Redis instance
- Mock external OAuth providers
- Use test JWT keys

### Performance Testing

**Benchmarks**:
- Device fingerprint generation: < 10ms
- TOTP verification: < 50ms
- QR code generation: < 100ms
- Social login flow: < 500ms (excluding OAuth provider latency)
- Account deletion with cascades: < 1000ms

## Security Considerations

### Data Protection

1. **TOTP Secrets**: Encrypt TOTP secrets at rest using AES-256
2. **Backup Codes**: Store as bcrypt hashes, never plain text
3. **Push Tokens**: Store as plain text (required for sending notifications)
4. **Social Profile Data**: Store minimal required data, sanitize before storage

### Rate Limiting

Apply rate limiting to sensitive endpoints:
- Social login callbacks: 10 requests/minute per IP
- 2FA verification: 5 attempts/minute per user
- Device revocation: 10 requests/minute per user
- Account deletion: 1 request/hour per user

### Audit Logging

Log security-relevant events:
- Social account linking/unlinking
- Device revocation
- 2FA enable/disable
- Account deactivation/reactivation/deletion
- Failed 2FA attempts
- Backup code usage

### OAuth Security

1. Validate OAuth state parameter to prevent CSRF
2. Use PKCE (Proof Key for Code Exchange) for mobile apps
3. Validate redirect URIs against whitelist
4. Short-lived authorization codes (10 minutes)
5. Verify OAuth provider's SSL certificates

### 2FA Security

1. TOTP time window: 30 seconds with ±1 window tolerance for clock skew
2. Backup codes: 8 characters, alphanumeric, cryptographically random
3. Rate limit 2FA verification attempts
4. Require password re-authentication before disabling 2FA
5. Notify user via email when 2FA is enabled/disabled

## Deployment Considerations

### Database Migrations

**Migration Order**:
1. Add new columns to User table (isActive, deactivationReason)
2. Add deviceId column to RefreshToken table (nullable)
3. Create Device table
4. Create SocialAccount table
5. Create PushToken table
6. Create TwoFactorAuth table
7. Create BackupCode table
8. Add foreign key constraints
9. Create indexes

**Rollback Strategy**:
- Each migration should have a corresponding down migration
- Test rollback in staging environment
- Backup database before production migration

### Feature Flags

Use configuration-based feature flags to enable features gradually:
```typescript
features: {
  socialLogin: { google: { enabled: true }, facebook: { enabled: false } },
  deviceManagement: { enabled: true },
  pushNotifications: { enabled: false },
  twoFactor: { enabled: true },
  accountManagement: { enabled: true }
}
```

### Monitoring

**Metrics to Track**:
- Social login success/failure rates by provider
- Number of active devices per user (average, p95, p99)
- 2FA adoption rate
- 2FA verification success/failure rates
- Account deactivation/deletion rates
- Push token registration rates

**Alerts**:
- High social login failure rate (> 10%)
- High 2FA verification failure rate (> 20%)
- Unusual spike in account deletions
- OAuth provider API errors

### Backward Compatibility Checklist

- [ ] Existing configurations work without changes
- [ ] Existing JWT tokens remain valid
- [ ] Existing users can log in normally
- [ ] Existing refresh tokens continue to work
- [ ] Database migrations are additive (no breaking changes)
- [ ] API endpoints maintain same signatures
- [ ] Default behavior matches previous version when features are disabled
