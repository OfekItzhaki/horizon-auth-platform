# Using Horizon Auth Locally (Without NPM)

This guide shows how to use the Horizon Auth package in another service locally, before publishing to NPM.

## Method 1: npm link (Best for Active Development)

Use this when you're actively developing the package and want changes to reflect immediately.

### Setup

```bash
# 1. Build the package
cd packages/horizon-auth
npm run build

# 2. Create global link
npm link

# 3. In your other service, link to it
cd /path/to/your-service
npm link @ofeklabs/horizon-auth
```

### Usage in Your Service

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      jwt: {
        privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN || '.localhost',
        secure: false, // Set to true in production
      },
      features: {
        twoFactor: { enabled: true, issuer: 'MyApp' },
        deviceManagement: { enabled: true, maxDevicesPerUser: 10 },
        pushNotifications: { enabled: true },
        accountManagement: { enabled: true, allowReactivation: true },
      },
    }),
  ],
})
export class AppModule {}
```

### When You Make Changes

```bash
# Rebuild the package
cd packages/horizon-auth
npm run build

# Changes are automatically available in linked services
# Just restart your service
```

### Unlink When Done

```bash
# In your service
npm unlink @ofeklabs/horizon-auth

# In the package (optional)
cd packages/horizon-auth
npm unlink
```

---

## Method 2: Direct Path Install (Simple, One-Time)

Use this for quick testing without active development.

```bash
# In your service
npm install /absolute/path/to/horizon-auth-platform/packages/horizon-auth

# Or relative path
npm install ../horizon-auth-platform/packages/horizon-auth
```

**Note:** You need to reinstall after every change to the package.

---

## Method 3: file: Protocol (Good for Teams)

Add to your service's `package.json`:

```json
{
  "dependencies": {
    "@ofeklabs/horizon-auth": "file:../horizon-auth-platform/packages/horizon-auth"
  }
}
```

Then:

```bash
npm install
```

**Note:** Run `npm install` again after package changes.

---

## Complete Local Setup Example

Let's say you have a new NestJS service and want to use Horizon Auth locally:

### 1. Create Your Service

```bash
nest new my-service
cd my-service
```

### 2. Install Horizon Auth Locally

```bash
# Using npm link
cd ../horizon-auth-platform/packages/horizon-auth
npm run build
npm link

cd ../../my-service
npm link @ofeklabs/horizon-auth
```

### 3. Setup Database & Redis

```bash
# Create database
createdb my_service_db

# Start Redis (if not running)
redis-server
```

### 4. Generate JWT Keys

```bash
mkdir certs
openssl genrsa -out certs/private.pem 2048
openssl rsa -in certs/private.pem -pubout -out certs/public.pem
chmod 600 certs/private.pem
```

### 5. Configure Environment

Create `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_service_db
REDIS_HOST=localhost
REDIS_PORT=6379
COOKIE_DOMAIN=.localhost
NODE_ENV=development
```

### 6. Apply Migrations

```bash
# Copy or link the Prisma schema
npx prisma migrate deploy --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma

# Generate Prisma client
npx prisma generate --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma
```

### 7. Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HorizonAuthModule.forRoot({
      database: { url: process.env.DATABASE_URL },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      jwt: {
        privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN || '.localhost',
        secure: false,
      },
      features: {
        twoFactor: { enabled: true, issuer: 'MyApp' },
        deviceManagement: { enabled: true, maxDevicesPerUser: 10 },
        pushNotifications: { enabled: true },
        accountManagement: { enabled: true, allowReactivation: true },
      },
    }),
  ],
})
export class AppModule {}
```

### 8. Start Your Service

```bash
npm run start:dev
```

### 9. Test It

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","fullName":"Test User"}'

# Enable 2FA
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### "Cannot find module '@ofeklabs/horizon-auth'"

**Solution:**
```bash
# Make sure the package is built
cd packages/horizon-auth
npm run build

# Re-link
npm link
cd /path/to/your-service
npm link @ofeklabs/horizon-auth
```

### "Prisma Client not generated"

**Solution:**
```bash
npx prisma generate --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma
```

### Changes Not Reflecting

**Solution:**
```bash
# Rebuild the package
cd packages/horizon-auth
npm run build

# Restart your service
```

### "Cannot connect to Redis"

**Solution:**
```bash
# Start Redis
redis-server

# Or check if it's running
redis-cli ping
# Should return: PONG
```

---

## When to Switch to NPM

Once you're done with local development and testing:

1. Publish to NPM:
   ```bash
   cd packages/horizon-auth
   npm publish --access public
   ```

2. In your service, unlink and install from NPM:
   ```bash
   npm unlink @ofeklabs/horizon-auth
   npm install @ofeklabs/horizon-auth@0.3.0
   ```

---

## Quick Reference

| Task | Command |
|------|---------|
| Build package | `cd packages/horizon-auth && npm run build` |
| Link package | `cd packages/horizon-auth && npm link` |
| Use in service | `cd my-service && npm link @ofeklabs/horizon-auth` |
| Unlink | `npm unlink @ofeklabs/horizon-auth` |
| Install from path | `npm install ../horizon-auth-platform/packages/horizon-auth` |
| Apply migrations | `npx prisma migrate deploy --schema=./node_modules/@ofeklabs/horizon-auth/prisma/schema.prisma` |

---

**Need Help?** Check `PRODUCTION-INTEGRATION-GUIDE.md` for production setup or `QUICK-INTEGRATION.md` for a quick start.
