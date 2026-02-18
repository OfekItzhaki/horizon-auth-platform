# Enhanced Authentication Features

This document describes the enterprise-grade authentication features added to Horizon Auth v0.3.0+.

## Features Overview

### 🔐 Two-Factor Authentication (2FA)
- TOTP-based (compatible with Google Authenticator, Authy, etc.)
- QR code generation for easy setup
- 10 backup codes with single-use enforcement
- Time window tolerance for clock skew

### 📱 Device Management
- Automatic device tracking on login
- Device fingerprinting
- User-agent parsing (browser, OS, device type)
- Device revocation with token cascade
- Last active tracking

### 🔔 Push Notification Tokens
- FCM and APNS support
- Device-associated tokens
- Automatic revocation on device removal
- Multiple tokens per user

### 👤 Account Management
- Account deactivation (soft delete)
- Account reactivation
- Account deletion (hard delete with cascade)
- Login prevention when deactivated

### 🌐 Social Login (Infrastructure)
- Google OAuth integration
- Facebook OAuth integration
- Account linking to existing users
- New user creation from social profiles

## Configuration

Enable features in your `HorizonAuthModule.forRoot()` configuration:

```typescript
HorizonAuthModule.forRoot({
  database: { url: process.env.DATABASE_URL },
  redis: { host: 'localhost', port: 6379 },
  jwt: {
    privateKey: fs.readFileSync('./certs/private.pem', 'utf8'),
    publicKey: fs.readFileSync('./certs/public.pem', 'utf8'),
  },
  
  // Enable enhanced features
  features: {
    // Two-Factor Authentication
    twoFactor: {
      enabled: true,
      issuer: 'MyApp', // Shown in authenticator apps
    },
    
    // Device Management
    deviceManagement: {
      enabled: true,
      maxDevicesPerUser: 10, // Optional limit
    },
    
    // Push Notifications
    pushNotifications: {
      enabled: true,
    },
    
    // Account Management
    accountManagement: {
      enabled: true,
      allowReactivation: true,
    },
    
    // Social Login
    socialLogin: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: 'http://localhost:3000/auth/google/callback',
      },
      facebook: {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
        callbackUrl: 'http://localhost:3000/auth/facebook/callback',
      },
    },
  },
})
```

## API Endpoints

### Two-Factor Authentication

#### Enable 2FA
```http
POST /auth/2fa/enable
Authorization: Bearer {accessToken}

Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}
```

#### Verify 2FA Setup
```http
POST /auth/2fa/verify
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "123456"
}

Response:
{
  "backupCodes": [
    "ABCD-EFGH",
    "IJKL-MNOP",
    ...
  ]
}
```

#### Disable 2FA
```http
POST /auth/2fa/disable
Authorization: Bearer {accessToken}

Response:
{
  "message": "2FA disabled successfully"
}
```

#### Regenerate Backup Codes
```http
POST /auth/2fa/backup-codes/regenerate
Authorization: Bearer {accessToken}

Response:
{
  "backupCodes": ["ABCD-EFGH", ...]
}
```

#### Login with 2FA
```http
# Step 1: Initial login
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (if 2FA enabled):
{
  "requiresTwoFactor": true,
  "userId": "user_id_here"
}

# Step 2: Verify 2FA code
POST /auth/2fa/verify-login
Content-Type: application/json

{
  "userId": "user_id_here",
  "code": "123456"  // TOTP code or backup code
}

Response:
{
  "user": {...},
  "accessToken": "..."
}
```

### Device Management

#### List Devices
```http
GET /auth/devices
Authorization: Bearer {accessToken}

Response:
[
  {
    "id": "device_id",
    "deviceName": "iPhone 13",
    "deviceType": "mobile",
    "os": "iOS 16.0",
    "browser": "Safari 16.0",
    "lastActiveAt": "2024-01-15T10:30:00Z",
    "current": true
  }
]
```

#### Revoke Device
```http
POST /auth/devices/{deviceId}/revoke
Authorization: Bearer {accessToken}

Response:
{
  "message": "Device revoked successfully"
}
```

### Push Notification Tokens

#### Register Push Token
```http
POST /auth/push-tokens
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "fcm_token_or_apns_token",
  "tokenType": "FCM",  // or "APNS"
  "deviceId": "device_id_from_devices_endpoint"
}

Response:
{
  "id": "token_id",
  "token": "...",
  "tokenType": "FCM",
  "active": true
}
```

#### Revoke Push Token
```http
DELETE /auth/push-tokens/{tokenId}
Authorization: Bearer {accessToken}

Response:
{
  "message": "Push token revoked successfully"
}
```

### Account Management

#### Deactivate Account
```http
POST /auth/account/deactivate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "reason": "Taking a break"  // Optional
}

Response:
{
  "message": "Account deactivated successfully"
}
```

#### Reactivate Account
```http
POST /auth/account/reactivate
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Account reactivated successfully"
}
```

#### Delete Account
```http
DELETE /auth/account
Authorization: Bearer {accessToken}

Response:
{
  "message": "Account deleted successfully"
}
```

## Usage Examples

### TypeScript/NestJS

```typescript
import { 
  TwoFactorService,
  DeviceService,
  AccountService,
  FeatureDisabledException 
} from '@ofeklabs/horizon-auth';

@Controller('my-controller')
export class MyController {
  constructor(
    @Optional() private readonly twoFactorService?: TwoFactorService,
    @Optional() private readonly deviceService?: DeviceService,
  ) {}

  @Get('check-2fa')
  async check2FA(@CurrentUser() user: SafeUser) {
    if (!this.twoFactorService) {
      throw new FeatureDisabledException('Two-factor authentication');
    }
    
    const has2FA = await this.twoFactorService.isTwoFactorEnabled(user.id);
    return { enabled: has2FA };
  }
}
```

### Frontend Integration

```typescript
// Enable 2FA
const enable2FA = async () => {
  const response = await fetch('/auth/2fa/enable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const { secret, qrCode } = await response.json();
  
  // Display QR code to user
  document.getElementById('qr-code').src = qrCode;
};

// Verify 2FA setup
const verify2FA = async (code: string) => {
  const response = await fetch('/auth/2fa/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  
  const { backupCodes } = await response.json();
  
  // Show backup codes to user (they should save these!)
  alert('Save these backup codes: ' + backupCodes.join(', '));
};

// Login with 2FA
const loginWith2FA = async (email: string, password: string) => {
  // Step 1: Initial login
  const loginResponse = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const loginData = await loginResponse.json();
  
  if (loginData.requiresTwoFactor) {
    // Step 2: Prompt for 2FA code
    const code = prompt('Enter 2FA code:');
    
    const verifyResponse = await fetch('/auth/2fa/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: loginData.userId, 
        code 
      }),
    });
    
    const { user, accessToken } = await verifyResponse.json();
    // Store token and proceed
  }
};
```

## Database Schema

The enhanced features add the following tables:

- `social_accounts` - OAuth account links
- `devices` - User devices
- `push_tokens` - Push notification tokens
- `two_factor_auth` - 2FA settings
- `backup_codes` - 2FA backup codes

And extends existing tables:

- `users` - Adds `isActive`, `deactivationReason`
- `refresh_tokens` - Adds `deviceId`

## Security Considerations

1. **2FA Backup Codes**
   - Stored as bcrypt hashes
   - Single-use only
   - 10 codes generated
   - Regeneration invalidates old codes

2. **Device Fingerprinting**
   - Based on User-Agent + IP (optional)
   - Deterministic hashing
   - Not foolproof but adds security layer

3. **Account Deactivation**
   - Soft delete preserves data
   - All tokens revoked immediately
   - Login prevented
   - Reversible

4. **Account Deletion**
   - Hard delete with cascade
   - Removes all associated data
   - Irreversible
   - GDPR compliant

## Backward Compatibility

All features are optional and backward compatible:

- Existing code works without changes
- Features disabled by default
- No breaking changes to existing APIs
- Database migrations are additive

## Performance

- Minimal overhead when features disabled
- Lazy loading of services
- Efficient database queries with indexes
- Redis caching for token validation

## Error Handling

Custom exceptions for better error handling:

```typescript
import {
  AccountDeactivatedException,
  TwoFactorRequiredException,
  InvalidTwoFactorCodeException,
  BackupCodeAlreadyUsedException,
  SocialAccountAlreadyLinkedException,
  FeatureDisabledException,
} from '@ofeklabs/horizon-auth';

try {
  await authService.login(email, password);
} catch (error) {
  if (error instanceof AccountDeactivatedException) {
    // Handle deactivated account
  } else if (error instanceof TwoFactorRequiredException) {
    // Prompt for 2FA code
  }
}
```

## Testing

See `TESTING-ENHANCED-AUTH.md` for comprehensive testing guide.

Quick test:
```bash
# Enable 2FA
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN"

# List devices
curl -X GET http://localhost:3000/auth/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Migration Guide

### From v0.2.x to v0.3.x

1. **Update package**:
   ```bash
   npm install @ofeklabs/horizon-auth@latest
   ```

2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Update configuration** (optional):
   ```typescript
   // Add features config if you want to enable new features
   features: {
     twoFactor: { enabled: true },
     // ...
   }
   ```

4. **No code changes required** - all features are opt-in!

## Support

- Documentation: See `TESTING-ENHANCED-AUTH.md`
- Issues: GitHub Issues
- Examples: Check `examples/` directory

## License

Same as Horizon Auth package license.
