# Testing Enhanced Authentication Features

This guide will help you test all the new authentication features added to Horizon Auth.

## Prerequisites

1. **Database Setup**
   ```bash
   cd packages/horizon-auth
   
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations (if not already done)
   npx prisma migrate deploy
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Package**
   ```bash
   npm run build
   ```

## Testing Approach

We have two main testing options:

### Option 1: Local Backend Testing (Recommended)

Test the features using your existing backend application.

#### Step 1: Update Backend Dependencies

```bash
cd backend
npm install ../packages/horizon-auth
```

#### Step 2: Update Backend Configuration

Edit `backend/src/app.module.ts` to enable the new features:

```typescript
HorizonAuthModule.forRoot({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  jwt: {
    privateKey: fs.readFileSync('./certs/private.pem', 'utf8'),
    publicKey: fs.readFileSync('./certs/public.pem', 'utf8'),
  },
  // Enable new features
  features: {
    // Two-Factor Authentication
    twoFactor: {
      enabled: true,
      issuer: 'HorizonAuth',
    },
    
    // Device Management
    deviceManagement: {
      enabled: true,
      maxDevicesPerUser: 10,
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
    
    // Social Login (optional - requires OAuth credentials)
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
}),
```

#### Step 3: Run Backend

```bash
cd backend
npm run start:dev
```

#### Step 4: Test Each Feature

Use a tool like **Postman**, **Insomnia**, or **curl** to test the endpoints.

---

## Feature Testing Guide

### 1. Two-Factor Authentication (2FA)

#### Enable 2FA
```bash
# First, login to get access token
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Save the accessToken from response

# Enable 2FA (generates QR code)
POST http://localhost:3000/auth/2fa/enable
Authorization: Bearer YOUR_ACCESS_TOKEN

# Response will include:
# - secret: TOTP secret
# - qrCode: Data URL for QR code (scan with Google Authenticator)
```

#### Verify 2FA Setup
```bash
# Get a code from your authenticator app
POST http://localhost:3000/auth/2fa/verify
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "code": "123456"
}

# Response will include backup codes - SAVE THESE!
```

#### Test 2FA Login
```bash
# Try to login - will require 2FA
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Response: { "requiresTwoFactor": true, "userId": "..." }

# Complete login with 2FA code
POST http://localhost:3000/auth/2fa/verify-login
Content-Type: application/json

{
  "userId": "USER_ID_FROM_ABOVE",
  "code": "123456"
}
```

#### Test Backup Codes
```bash
# Use a backup code instead of TOTP
POST http://localhost:3000/auth/2fa/verify-login
Content-Type: application/json

{
  "userId": "USER_ID",
  "code": "ABCD-EFGH"
}

# Backup code can only be used once
```

#### Regenerate Backup Codes
```bash
POST http://localhost:3000/auth/2fa/backup-codes/regenerate
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Disable 2FA
```bash
POST http://localhost:3000/auth/2fa/disable
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 2. Device Management

#### View Active Devices
```bash
GET http://localhost:3000/auth/devices
Authorization: Bearer YOUR_ACCESS_TOKEN

# Response shows all devices with active sessions
```

#### Login from Different Devices
```bash
# Login from different browsers/devices
# Each will create a new device entry
POST http://localhost:3000/auth/login
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

#### Revoke a Device
```bash
# Get device ID from GET /auth/devices
POST http://localhost:3000/auth/devices/DEVICE_ID/revoke
Authorization: Bearer YOUR_ACCESS_TOKEN

# This will revoke all tokens for that device
```

---

### 3. Push Notification Tokens

#### Register Push Token
```bash
POST http://localhost:3000/auth/push-tokens
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "token": "fcm_token_here_or_apns_token",
  "tokenType": "FCM",
  "deviceId": "DEVICE_ID_FROM_DEVICES_ENDPOINT"
}
```

#### Revoke Push Token
```bash
DELETE http://localhost:3000/auth/push-tokens/TOKEN_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Test Cascade Revocation
```bash
# When you revoke a device, its push tokens are also revoked
POST http://localhost:3000/auth/devices/DEVICE_ID/revoke
Authorization: Bearer YOUR_ACCESS_TOKEN

# Verify push tokens are inactive
```

---

### 4. Account Management

#### Deactivate Account
```bash
POST http://localhost:3000/auth/account/deactivate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "reason": "Taking a break"
}

# All tokens are revoked
# Account is marked inactive
```

#### Test Login Prevention
```bash
# Try to login with deactivated account
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Should return: "Account is deactivated"
```

#### Reactivate Account
```bash
POST http://localhost:3000/auth/account/reactivate
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Account is reactivated and you can login again
```

#### Delete Account
```bash
DELETE http://localhost:3000/auth/account
Authorization: Bearer YOUR_ACCESS_TOKEN

# Permanently deletes:
# - User record
# - All refresh tokens
# - All devices
# - All push tokens
# - 2FA settings
# - Backup codes
# - Social accounts
```

---

### 5. Social Login (Optional)

**Note**: Requires OAuth credentials from Google/Facebook.

#### Setup OAuth Apps

1. **Google**: https://console.cloud.google.com/
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/auth/google/callback`

2. **Facebook**: https://developers.facebook.com/
   - Create app
   - Add Facebook Login product
   - Add redirect URI: `http://localhost:3000/auth/facebook/callback`

#### Test Social Login

The social login flow requires a frontend to handle OAuth redirects. For now, the endpoints are placeholders that need OAuth code exchange implementation.

---

## Option 2: Unit Testing

Create test files for each service:

```bash
cd packages/horizon-auth

# Create test directory
mkdir -p src/__tests__

# Run tests (when created)
npm test
```

### Example Test Structure

```typescript
// src/__tests__/two-factor.service.spec.ts
import { Test } from '@nestjs/testing';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: PrismaService,
          useValue: {
            // Mock Prisma methods
          },
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should generate TOTP secret', async () => {
    // Test implementation
  });
});
```

---

## Integration Testing Checklist

- [ ] 2FA enable/verify/disable flow
- [ ] 2FA login with TOTP code
- [ ] 2FA login with backup code
- [ ] Backup code single-use enforcement
- [ ] Device tracking on login
- [ ] Device list retrieval
- [ ] Device revocation
- [ ] Push token registration
- [ ] Push token revocation
- [ ] Push token cascade on device revoke
- [ ] Account deactivation
- [ ] Login prevention when deactivated
- [ ] Account reactivation
- [ ] Account deletion cascade
- [ ] Token refresh updates device lastActiveAt
- [ ] Features disabled when not configured
- [ ] Backward compatibility (existing login still works)

---

## Troubleshooting

### Issue: "Cannot find module '@ofeklabs/horizon-auth'"
**Solution**: Rebuild and reinstall the package
```bash
cd packages/horizon-auth
npm run build
cd ../../backend
npm install ../packages/horizon-auth
```

### Issue: Database migration errors
**Solution**: Reset and rerun migrations
```bash
cd packages/horizon-auth
npx prisma migrate reset
npx prisma migrate deploy
```

### Issue: "Device ID is required" when registering push token
**Solution**: First login to create a device, then use that device ID
```bash
# 1. Login (creates device)
POST /auth/login

# 2. Get devices
GET /auth/devices

# 3. Use device ID from step 2
POST /auth/push-tokens
{
  "deviceId": "DEVICE_ID_HERE",
  ...
}
```

### Issue: Services not injected in AuthController
**Solution**: Make sure features are enabled in config and AuthModule conditionally imports them

---

## Next Steps

1. **Manual Testing**: Follow the testing guide above
2. **Write Unit Tests**: Create test files for each service
3. **Write Integration Tests**: Test end-to-end flows
4. **Update Documentation**: Add examples to README
5. **Publish Package**: Once tested, publish new version to NPM

---

## Quick Test Script

Here's a bash script to quickly test the main flows:

```bash
#!/bin/bash

API_URL="http://localhost:3000"
EMAIL="test@example.com"
PASSWORD="password123"

echo "1. Register user..."
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

echo "\n\n2. Login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

echo "\n\n3. Enable 2FA..."
curl -X POST $API_URL/auth/2fa/enable \
  -H "Authorization: Bearer $TOKEN"

echo "\n\n4. Get devices..."
curl -X GET $API_URL/auth/devices \
  -H "Authorization: Bearer $TOKEN"

echo "\n\nDone!"
```

Save as `test-auth.sh` and run: `chmod +x test-auth.sh && ./test-auth.sh`
