# Test Setup Guide

## Quick Test of the Package

To verify the package works, follow these steps:

### 1. Start Infrastructure

```bash
# From packages/horizon-auth directory
docker-compose up -d
```

Wait for PostgreSQL and Redis to be healthy:
```bash
docker-compose ps
```

### 2. Generate RSA Keys

```bash
mkdir -p certs
openssl genrsa -out certs/private.pem 2048
openssl rsa -in certs/private.pem -pubout -out certs/public.pem
```

### 3. Set Up Database

Create a `.env` file:
```env
DATABASE_URL=postgresql://horizon:horizon_dev_password@localhost:5432/horizon_auth
```

Run Prisma migrations:
```bash
npx prisma migrate dev --name init
```

### 4. Create a Test Application

Create a simple test app in the parent directory:

```bash
cd ../..
mkdir test-app
cd test-app
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @prisma/client ioredis passport passport-jwt cookie-parser
npm install -D @nestjs/cli typescript @types/node
```

Link your local package:
```bash
npm link ../packages/horizon-auth
```

### 5. Test the Package

Create `test-app/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

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
        privateKey: readFileSync(join(__dirname, '../../packages/horizon-auth/certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(__dirname, '../../packages/horizon-auth/certs/public.pem'), 'utf8'),
      },
    }),
  ],
})
export class AppModule {}
```

Create `test-app/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
  console.log('Test app running on http://localhost:3000');
}
bootstrap();
```

### 6. Test API Endpoints

Start the app:
```bash
npm run start:dev
```

Test registration:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Test login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

Test protected route:
```bash
# Use the accessToken from login response
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Test JWKS endpoint:
```bash
curl http://localhost:3000/.well-known/jwks.json
```

## Troubleshooting

### Docker not starting
```bash
docker-compose down
docker-compose up -d
docker-compose logs
```

### Prisma errors
```bash
npx prisma generate
npx prisma migrate reset
npx prisma migrate dev
```

### Build errors
```bash
npm run build
# Check for TypeScript errors
npx tsc --noEmit
```

## Next Steps

Once basic testing works:

1. Add unit tests (Jest)
2. Add property-based tests (fast-check)
3. Add E2E tests
4. Implement rate limiting
5. Add email service integration
6. Create the schematic generator
