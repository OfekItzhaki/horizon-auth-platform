# Quick Start: Testing Enhanced Auth Features

This guide will get you testing the new features in under 5 minutes.

## Prerequisites

- PostgreSQL running (default: localhost:5432)
- Redis running (default: localhost:6379)
- Node.js installed

## Step 1: Setup Database

```bash
cd backend

# Create database
createdb horizon_auth

# Or using psql
psql -U postgres -c "CREATE DATABASE horizon_auth;"

# Run migrations
cd ../packages/horizon-auth
npx prisma migrate deploy
npx prisma generate
```

## Step 2: Start Backend

```bash
cd ../../backend

# Make sure .env has correct values
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/horizon_auth
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Start the server
npm run start:dev
```

The backend is now running with ALL enhanced features enabled!

## Step 3: Test with curl

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

Save the `accessToken` from the response.

### Enable 2FA

```bash
# Replace YOUR_TOKEN with the accessToken from above
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You'll get a QR code (data URL) - open it in a browser or scan with Google Authenticator.

### Verify 2FA Setup

```bash
# Get a code from your authenticator app
curl -X POST http://localhost:3000/auth/2fa/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

You'll receive 10 backup codes - save these!

### Test 2FA Login

```bash
# Login (will require 2FA)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Response: { "requiresTwoFactor": true, "userId": "..." }

# Complete login with 2FA code
curl -X POST http://localhost:3000/auth/2fa/verify-login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_ABOVE",
    "code": "123456"
  }'
```

### View Devices

```bash
curl -X GET http://localhost:3000/auth/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Account Deactivation

```bash
# Deactivate account
curl -X POST http://localhost:3000/auth/account/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing deactivation"
  }'

# Try to login (should fail)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Reactivate
curl -X POST http://localhost:3000/auth/account/reactivate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Step 4: Test with Postman (Recommended)

1. Import the collection from `TESTING-ENHANCED-AUTH.md`
2. Set environment variable `baseUrl` = `http://localhost:3000`
3. Run through the test scenarios

## Troubleshooting

### "Cannot connect to database"
- Make sure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Create the database: `createdb horizon_auth`

### "Cannot connect to Redis"
- Make sure Redis is running: `redis-server`
- Check REDIS_HOST and REDIS_PORT in backend/.env

### "Module not found: @ofeklabs/horizon-auth"
```bash
cd packages/horizon-auth
npm run build
cd ../../backend
npm install ../packages/horizon-auth
```

### "Prisma Client not generated"
```bash
cd packages/horizon-auth
npx prisma generate
```

## What's Working

✅ User registration and login
✅ 2FA with TOTP (Google Authenticator)
✅ 2FA with backup codes
✅ Device tracking on login
✅ Device management (list, revoke)
✅ Push token registration
✅ Account deactivation/reactivation
✅ Account deletion
✅ Custom exceptions with proper HTTP status codes

## What's Not Implemented Yet

⚠️ Social login (Google/Facebook) - requires OAuth credentials
⚠️ Property-based tests - optional, can be added later
⚠️ Integration tests - optional, can be added later

## Next Steps

1. Test all features manually
2. Add OAuth credentials for social login testing
3. Write integration tests
4. Update README documentation
5. Publish new version to NPM

## Need Help?

Check the full testing guide: `TESTING-ENHANCED-AUTH.md`
