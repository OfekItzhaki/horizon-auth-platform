# Local Testing Guide

This guide shows you how to test @ofeklabs/horizon-auth locally in different modes.

---

## 🎯 Three Ways to Run Locally

1. **Test the Published Package** - Install from NPM in a test project
2. **Embedded Mode** - Each app has its own auth instance
3. **Dev SSO Mode** - Shared auth service for multiple apps (*.localhost)

---

## 1️⃣ Test the Published Package

This tests the actual package that users will install from NPM.

### Create a Test Project

```bash
# Create new NestJS project
mkdir test-horizon-auth
cd test-horizon-auth
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @ofeklabs/horizon-auth
npm install @prisma/client ioredis passport passport-jwt
npm install -D @nestjs/cli typescript @types/node
```

### Setup TypeScript

```bash
npx tsc --init
```

Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Create App Files

**src/app.module.ts**:
```typescript
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { AppController } from './app.controller';
import { readFileSync } from 'fs';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: 'postgresql://horizon:horizon_dev_password@localhost:5432/horizon_auth',
      },
      redis: {
        host: 'localhost',
        port: 6379,
      },
      jwt: {
        privateKey: readFileSync('./certs/private.pem', 'utf8'),
        publicKey: readFileSync('./certs/public.pem', 'utf8'),
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

**src/app.controller.ts**:
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public, CurrentUser, JwtAuthGuard } from '@ofeklabs/horizon-auth';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello() {
    return { message: 'Hello from test app!' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(@CurrentUser() user: any) {
    return { message: 'Protected route', user };
  }
}
```

**src/main.ts**:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('Test app running on http://localhost:3000');
}
bootstrap();
```

### Generate Keys

```bash
mkdir certs
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); require('fs').writeFileSync('certs/private.pem', privateKey); require('fs').writeFileSync('certs/public.pem', publicKey); console.log('Keys generated!');"
```

### Start Infrastructure

```bash
# Download docker-compose.yml from the package
curl -o docker-compose.yml https://raw.githubusercontent.com/OfekItzhaki/horizon-auth-platform/main/packages/horizon-auth/docker-compose.yml

# Start PostgreSQL and Redis
docker-compose up -d
```

### Run Migrations

```bash
# Copy Prisma schema from the package
npx @ofeklabs/horizon-auth migrate
```

### Start the App

```bash
npx ts-node src/main.ts
```

### Test It

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the access token from login response
curl http://localhost:3000/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 2️⃣ Embedded Mode (Each App Has Own Auth)

This is for when each application has its own authentication instance.

### Your Existing Backend

You already have a backend in `backend/` folder. Let's integrate the package:

```bash
cd backend
npm install @ofeklabs/horizon-auth
```

### Update backend/src/app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';

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
        privateKey: readFileSync('./certs/private.pem', 'utf8'),
        publicKey: readFileSync('./certs/public.pem', 'utf8'),
      },
    }),
  ],
  // ... your existing controllers, providers
})
export class AppModule {}
```

### Start Infrastructure

```bash
cd backend
docker-compose up -d
npm run start:dev
```

Now your backend has authentication at:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/profile

---

## 3️⃣ Dev SSO Mode (Shared Auth for *.localhost)

This is the coolest mode! One auth service shared by multiple apps.

### How It Works

- Auth service runs at `http://auth.localhost:3000`
- App 1 runs at `http://app1.localhost:3001`
- App 2 runs at `http://app2.localhost:3002`
- All apps share the same authentication cookies (domain: `.localhost`)

### Start the SSO Service

```bash
cd packages/horizon-auth

# Start PostgreSQL, Redis, and Auth Service
docker-compose -f docker-compose.dev-sso.yml up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Auth Service on port 3000

### Configure Your Apps

**App 1 (backend/)** - Port 3001:

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      // Point to shared SSO service
      ssoMode: true,
      ssoAuthUrl: 'http://auth.localhost:3000',
      jwt: {
        // Only need public key to verify tokens
        publicKey: readFileSync('./certs/public.pem', 'utf8'),
      },
    }),
  ],
})
export class AppModule {}
```

**App 2 (another project)** - Port 3002:

Same configuration, different port.

### Update /etc/hosts (Windows: C:\Windows\System32\drivers\etc\hosts)

Add these lines:
```
127.0.0.1 auth.localhost
127.0.0.1 app1.localhost
127.0.0.1 app2.localhost
```

### Start Your Apps

```bash
# Terminal 1 - Auth Service (already running via docker-compose)
# Check: http://auth.localhost:3000/.well-known/jwks.json

# Terminal 2 - App 1
cd backend
npm run start:dev -- --port 3001

# Terminal 3 - App 2
cd ../another-app
npm run start:dev -- --port 3002
```

### Test SSO

1. **Register on Auth Service**:
```bash
curl -X POST http://auth.localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

2. **Login on Auth Service**:
```bash
curl -X POST http://auth.localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

3. **Access App 1 with same cookie**:
```bash
curl http://app1.localhost:3001/protected \
  -H "Authorization: Bearer ACCESS_TOKEN_FROM_LOGIN"
```

4. **Access App 2 with same cookie**:
```bash
curl http://app2.localhost:3002/protected \
  -H "Authorization: Bearer ACCESS_TOKEN_FROM_LOGIN"
```

Both apps recognize the same user! 🎉

---

## 🔍 Checking If It's Working

### Check Auth Service Health

```bash
# JWKS endpoint (public keys)
curl http://localhost:3000/.well-known/jwks.json

# Should return:
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "...",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### Check Database

```bash
docker exec -it horizon-auth-postgres psql -U horizon -d horizon_auth

# Inside psql:
\dt                    # List tables
SELECT * FROM users;   # View users
\q                     # Quit
```

### Check Redis

```bash
docker exec -it horizon-auth-redis redis-cli

# Inside redis-cli:
KEYS *                 # List all keys
GET refresh_token:xxx  # View a refresh token
exit
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs horizon-auth-postgres

# Restart
docker-compose restart postgres
```

### "Cannot connect to Redis"

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it horizon-auth-redis redis-cli ping
# Should return: PONG
```

### "Module not found: @ofeklabs/horizon-auth"

```bash
# Verify installation
npm list @ofeklabs/horizon-auth

# Reinstall
npm install @ofeklabs/horizon-auth
```

### "Keys not found"

```bash
# Regenerate keys
npm run generate:keys

# Or manually:
node scripts/generate-keys.js
```

---

## 📊 Monitoring

### View Auth Service Logs (SSO Mode)

```bash
docker logs -f horizon-auth-sso-service
```

### View Database Connections

```bash
docker exec -it horizon-auth-postgres psql -U horizon -d horizon_auth -c "SELECT * FROM pg_stat_activity;"
```

### View Redis Memory Usage

```bash
docker exec -it horizon-auth-redis redis-cli INFO memory
```

---

## 🎓 What You Learned

1. **Tarball** - The compressed package file NPM distributes
2. **Embedded Mode** - Each app has its own auth instance
3. **SSO Mode** - Shared auth service for multiple apps
4. **Cookie Domains** - How `.localhost` enables cookie sharing
5. **JWKS** - How apps verify tokens without sharing secrets

---

## 🚀 Next Steps

1. Test the published package in a new project
2. Try SSO mode with multiple apps
3. Integrate into your existing backend
4. Add frontend authentication
5. Deploy to production!

