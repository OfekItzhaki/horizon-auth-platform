# Usage Example

This example shows how to integrate @ofeklabs/horizon-auth into a NestJS application.

## Complete Example Application

### 1. Install Dependencies

```bash
npm install @ofeklabs/horizon-auth @nestjs/common @nestjs/core @nestjs/platform-express
npm install @prisma/client ioredis passport passport-jwt
npm install -D @nestjs/cli prisma typescript
```

### 2. Generate RSA Keys

```bash
mkdir certs
openssl genrsa -out certs/private.pem 2048
openssl rsa -in certs/private.pem -pubout -out certs/public.pem
```

### 3. Create app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { AppController } from './app.controller';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: {
        url: process.env.DATABASE_URL || 'postgresql://horizon:password@localhost:5432/horizon_auth',
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      jwt: {
        privateKey: readFileSync(join(__dirname, '../certs/private.pem'), 'utf8'),
        publicKey: readFileSync(join(__dirname, '../certs/public.pem'), 'utf8'),
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
      },
      rateLimit: {
        login: { limit: 5, ttl: 60 },
        register: { limit: 3, ttl: 60 },
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### 4. Create app.controller.ts

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  Public,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@ofeklabs/horizon-auth';

@Controller()
export class AppController {
  // Public route - no authentication
  @Public()
  @Get()
  getHello() {
    return { message: 'Welcome to Horizon Auth!' };
  }

  // Protected route - requires valid JWT
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(@CurrentUser() user: any) {
    return {
      message: 'This is a protected route',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  // Admin-only route
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  getAdmin(@CurrentUser() user: any) {
    return {
      message: 'Admin access granted',
      user: user.email,
    };
  }

  // Multi-tenant example
  @UseGuards(JwtAuthGuard)
  @Get('tenant-info')
  getTenantInfo(@CurrentUser() user: any, @CurrentTenant() tenantId: string) {
    return {
      tenantId,
      user: user.email,
    };
  }
}
```

### 5. Create main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser for refresh tokens
  app.use(cookieParser());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS if needed
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
```

### 6. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run Prisma migrations
npx prisma migrate dev --name init

# Start application
npm run start:dev
```

## Testing the API

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "fullName": "John Doe"
  }'
```

Response:
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "emailVerified": false,
    "tenantId": "default",
    "roles": ["user"],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }' \
  -c cookies.txt
```

### Access Protected Route

```bash
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

## Frontend Integration (React Example)

```typescript
// auth.service.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
});

export const authService = {
  async register(email: string, password: string, fullName?: string) {
    const response = await api.post('/auth/register', { email, password, fullName });
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  async refresh() {
    const response = await api.post('/auth/refresh');
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  async logout() {
    const token = localStorage.getItem('accessToken');
    await api.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    localStorage.removeItem('accessToken');
  },

  async getProfile() {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};

// Add interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { accessToken } = await authService.refresh();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## Advanced: Multi-Tenant Setup

```typescript
// app.module.ts
HorizonAuthModule.forRoot({
  // ... other config
  multiTenant: {
    enabled: true,
    tenantIdExtractor: 'header', // Extract from X-Tenant-ID header
    defaultTenantId: 'default',
  },
});

// Or use subdomain extraction
HorizonAuthModule.forRoot({
  // ... other config
  multiTenant: {
    enabled: true,
    tenantIdExtractor: 'subdomain', // Extract from subdomain (tenant1.example.com)
    defaultTenantId: 'default',
  },
});

// Or custom extraction
HorizonAuthModule.forRoot({
  // ... other config
  multiTenant: {
    enabled: true,
    tenantIdExtractor: 'custom',
    customExtractor: (req) => {
      // Custom logic to extract tenant ID
      return req.headers['x-organization-id'] || 'default';
    },
  },
});
```

## Production Deployment

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-db:5432/horizon_auth
REDIS_HOST=prod-redis
REDIS_PORT=6379
REDIS_PASSWORD=strong_redis_password
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

```bash
docker build -t horizon-auth-app .
docker run -p 3000:3000 --env-file .env horizon-auth-app
```
