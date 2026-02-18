# Production Integration Guide - Horizon Auth Enhanced Features

This guide walks you through integrating the enhanced Horizon Auth package into your production project.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis instance
- RSA key pair for JWT signing

## Step 1: Publish Package to NPM

First, publish the updated package to NPM so you can install it in your production project.

### Option A: Publish to NPM (Recommended)

```bash
cd packages/horizon-auth

# Update version for major feature release
npm version minor  # 0.2.1 -> 0.3.0

# Build the package
npm run build

# Publish to NPM
npm publish --access public

# Note: You'll need to be logged in to npm
# npm login
```

### Option B: Use Local Package (Development/Testing)

```bash
# In your production project
npm install /path/to/horizon-auth-platform/packages/horizon-auth
```

### Option C: Use Git Repository

```bash
# In your production project
npm install git+https://github.com/yourusername/horizon-auth-platform.git#packages/horizon-auth
```

## Step 2: Install in Production Project

```bash
cd your-production-project

# Install from NPM (after publishing)
npm install @ofeklabs/horizon-auth@latest

# Or install specific version
npm install @ofeklabs/horizon-auth@0.3.0
```

## Step 3: Database Setup

### 3.1 Run Migrations

The package includes Prisma migrations. You need to apply them to your production database.

```bash
# Copy the Prisma schema to your project (if not using the package's Prisma client)
# Or use the package's migrations

# Apply migrations
npx prisma migrate deploy --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma

# Generate Prisma client
npx prisma generate --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma
```

### 3.2 Database Connection

Ensure your production database URL is configured:

```env
# .env
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```

## Step 4: Redis Setup

Enhanced features require Redis for token management.

### Production Redis Options:

1. **Self-hosted Redis**
   ```bash
   # Install Redis
   sudo apt-get install redis-server
   
   # Start Redis
   sudo systemctl start redis
   ```

2. **Redis Cloud** (Recommended for production)
   - Sign up at https://redis.com/try-free/
   - Get connection details

3. **AWS ElastiCache**
   - Create Redis cluster in AWS
   - Get endpoint URL

### Configure Redis:

```env
# .env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # if required
```

## Step 5: Generate JWT Keys

Generate RSA key pair for JWT signing:

```bash
# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/private.pem 2048

# Generate public key
openssl rsa -in certs/private.pem -pubout -out certs/public.pem

# Secure the private key
chmod 600 certs/private.pem
```

## Step 6: Configure Your NestJS Application

### 6.1 Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Full Mode with Enhanced Features
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD, // optional
      },
      jwt: {
        privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN || '.yourdomain.com',
        secure: process.env.NODE_ENV === 'production',
      },
      
      // Enable enhanced features
      features: {
        // Two-Factor Authentication
        twoFactor: {
          enabled: true,
          issuer: 'YourAppName', // Shows in authenticator apps
        },
        
        // Device Management
        deviceManagement: {
          enabled: true,
          maxDevicesPerUser: 10, // Limit devices per user
        },
        
        // Push Notifications
        pushNotifications: {
          enabled: true,
        },
        
        // Account Management
        accountManagement: {
          enabled: true,
          allowReactivation: true, // Allow users to reactivate
        },
        
        // Social Login (optional)
        socialLogin: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: `${process.env.APP_URL}/auth/google/callback`,
          },
          facebook: {
            appId: process.env.FACEBOOK_APP_ID,
            appSecret: process.env.FACEBOOK_APP_SECRET,
            callbackUrl: `${process.env.APP_URL}/auth/facebook/callback`,
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 6.2 Environment Variables

Create/update your `.env` file:

```env
# App
NODE_ENV=production
APP_URL=https://yourdomain.com
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
# Keys are in certs/ directory

# Cookies
COOKIE_DOMAIN=.yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (optional)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Step 7: Feature-Specific Setup

### 7.1 Two-Factor Authentication

No additional setup required. Users can enable 2FA from their account settings.

**Frontend Integration:**
```typescript
// Enable 2FA
const response = await fetch('/auth/2fa/enable', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { secret, qrCode } = await response.json();

// Display QR code to user
// qrCode is a data URL: data:image/png;base64,...
```

### 7.2 Social Login Setup

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `https://yourdomain.com/auth/google/callback`
6. Copy Client ID and Secret to `.env`

#### Facebook OAuth:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs: `https://yourdomain.com/auth/facebook/callback`
5. Copy App ID and Secret to `.env`

### 7.3 Push Notifications

Push notifications require device tracking. Ensure users login (not just register) to create devices.

**Frontend Integration:**
```typescript
// After login, register push token
const response = await fetch('/auth/push-tokens', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken, // From Firebase Cloud Messaging
    tokenType: 'FCM', // or 'APNS' for iOS
    deviceId: deviceId, // From device list
  }),
});
```

### 7.4 Device Management

Devices are automatically tracked on login. No additional setup required.

**Frontend Integration:**
```typescript
// List user's devices
const devices = await fetch('/auth/devices', {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

// Revoke a device
await fetch(`/auth/devices/${deviceId}/revoke`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

## Step 8: Security Considerations

### 8.1 Environment Variables

Never commit sensitive data to git:

```bash
# Add to .gitignore
.env
.env.production
certs/private.pem
```

### 8.2 Key Management

- Store private keys securely (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate keys periodically
- Use different keys for different environments

### 8.3 Redis Security

- Enable Redis authentication
- Use TLS for Redis connections in production
- Restrict Redis access to application servers only

### 8.4 Rate Limiting

The package includes rate limiting on sensitive endpoints:
- Login: 5 requests/minute
- Register: 3 requests/minute
- Password reset: 3 requests/hour

Adjust if needed in your configuration.

## Step 9: Monitoring & Logging

### 9.1 Add Logging

```typescript
import { Logger } from '@nestjs/common';

// In your main.ts
const logger = new Logger('Bootstrap');
logger.log(`Application running on port ${port}`);
```

### 9.2 Monitor Redis

```bash
# Check Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor
```

### 9.3 Database Monitoring

- Monitor connection pool usage
- Track slow queries
- Set up alerts for connection failures

## Step 10: Testing in Production

### 10.1 Smoke Tests

```bash
# Test health endpoint
curl https://yourdomain.com/health

# Test public endpoint
curl https://yourdomain.com/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","fullName":"Test User"}'
```

### 10.2 Feature Testing

1. Register a test user
2. Enable 2FA
3. Test login with 2FA
4. Test device management
5. Test account deactivation/reactivation

## Step 11: Deployment Checklist

- [ ] Database migrations applied
- [ ] Redis instance running and accessible
- [ ] JWT keys generated and secured
- [ ] Environment variables configured
- [ ] OAuth credentials configured (if using social login)
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] Logging and monitoring set up
- [ ] Backup strategy in place
- [ ] Smoke tests passed

## Step 12: Rollback Plan

If issues arise:

1. **Database Rollback:**
   ```bash
   # Rollback last migration
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

2. **Package Rollback:**
   ```bash
   npm install @ofeklabs/horizon-auth@0.2.1
   ```

3. **Feature Disable:**
   ```typescript
   // Disable specific features in app.module.ts
   features: {
     twoFactor: { enabled: false },
     // ... other features
   }
   ```

## Troubleshooting

### Issue: "Cannot connect to Redis"
**Solution:** Check Redis host, port, and password. Ensure Redis is running.

### Issue: "Prisma Client not generated"
**Solution:** Run `npx prisma generate`

### Issue: "JWT verification failed"
**Solution:** Ensure public/private keys match and are correctly loaded

### Issue: "Push token registration fails"
**Solution:** Ensure user has logged in (not just registered) to create a device

### Issue: "Social login not working"
**Solution:** Verify OAuth credentials and callback URLs are correct

## Support & Documentation

- **Package Documentation:** `packages/horizon-auth/ENHANCED-FEATURES.md`
- **API Reference:** `TESTING-ENHANCED-AUTH.md`
- **Quick Start:** `QUICK-START-TESTING.md`
- **GitHub Issues:** https://github.com/yourusername/horizon-auth-platform/issues

## Next Steps

1. **Publish to NPM** (if not already done)
2. **Set up staging environment** for testing
3. **Deploy to production** following this guide
4. **Monitor** for issues in first 24 hours
5. **Update documentation** with production-specific notes

---

**Need Help?** Check the troubleshooting section or open an issue on GitHub.
