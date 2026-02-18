# Quick Start: Use @ofeklabs/horizon-auth

This guide shows how to integrate the package into your projects.

---

## 🎯 Recommended: Portfolio SSO

Deploy one auth service, use it across all your projects. Perfect for portfolios, demo sites, or related applications.

**Why This Approach?**
- Users sign in once, access all projects
- No duplicate auth code per project
- Faster development
- Professional, cohesive experience
- Single point of maintenance

---

## 🚀 Setup (Portfolio SSO)

### Step 1: Deploy Auth Service (One Time)

Deploy `packages/horizon-auth` to `auth.yourdomain.com`:

### 1. Install Package

```bash
cd backend
npm install @ofeklabs/horizon-auth
```

### 2. Update app.module.ts

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
      database: {
        url: process.env.DATABASE_URL,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY || 
          readFileSync(join(__dirname, '../certs/private.pem'), 'utf8'),
        publicKey: process.env.JWT_PUBLIC_KEY || 
          readFileSync(join(__dirname, '../certs/public.pem'), 'utf8'),
      },
    }),
    
    // Your existing modules
    // UsersModule,
    // etc.
  ],
})
export class AppModule {}
```

### 3. Update .env

```env
DATABASE_URL=postgresql://user:password@localhost:5432/horizon_auth
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

### 4. Start Backend

```bash
npm run start:dev
```

Your backend now has authentication at:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/profile

---

## 🌐 Option 2: SSO Mode (Recommended for Multiple Apps)

Your backend verifies tokens from a shared auth service.

### 1. Start Shared Auth Service

```bash
cd packages/horizon-auth
docker-compose -f docker-compose.dev-sso.yml up -d
```

Auth service runs at `http://auth.localhost:3000`

### 2. Install Package in Backend

```bash
cd backend
npm install @ofeklabs/horizon-auth
```

### 3. Update app.module.ts

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
      // SSO Mode - verify tokens only
      ssoMode: true,
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://auth.localhost:3000',
      
      jwt: {
        // Only need public key to verify tokens
        publicKey: process.env.JWT_PUBLIC_KEY || 
          readFileSync(join(__dirname, '../certs/public.pem'), 'utf8'),
      },
      
      cookie: {
        domain: process.env.COOKIE_DOMAIN || '.localhost',
        secure: process.env.NODE_ENV === 'production',
      },
    }),
    
    // Your existing modules
  ],
})
export class AppModule {}
```

### 4. Update .env

```env
AUTH_SERVICE_URL=http://auth.localhost:3000
COOKIE_DOMAIN=.localhost
NODE_ENV=development
```

### 5. Update hosts file

**Windows**: `C:\Windows\System32\drivers\etc\hosts`

Add:
```
127.0.0.1 auth.localhost
127.0.0.1 backend.localhost
```

### 6. Start Backend

```bash
npm run start:dev -- --port 3001
```

### 7. Test SSO

```bash
# Register on auth service
curl -X POST http://auth.localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Login
curl -X POST http://auth.localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Access backend with same token
curl http://backend.localhost:3001/protected \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -b cookies.txt
```

---

## 🎨 Use in Your Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { 
  Public, 
  CurrentUser, 
  JwtAuthGuard,
  Roles,
  RolesGuard 
} from '@ofeklabs/horizon-auth';

@Controller('api')
export class ApiController {
  // Public route
  @Public()
  @Get('public')
  publicRoute() {
    return { message: 'No auth required' };
  }

  // Protected route
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  protectedRoute(@CurrentUser() user) {
    return { 
      message: 'Authenticated!',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      }
    };
  }

  // Admin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  adminRoute() {
    return { message: 'Admin access' };
  }
}
```

---

## 🚀 Production Deployment (ofeklabs.dev)

### Auth Service

Deploy to Render with:

```env
DATABASE_URL=<supabase-url>
REDIS_HOST=<redis-cloud-host>
REDIS_PASSWORD=<redis-password>
JWT_PRIVATE_KEY=<paste-entire-private-key>
JWT_PUBLIC_KEY=<paste-entire-public-key>
COOKIE_DOMAIN=.ofeklabs.dev
COOKIE_SECURE=true
NODE_ENV=production
```

Custom domain: `auth.ofeklabs.dev`

### Your Backend

Deploy to Render with:

```env
AUTH_SERVICE_URL=https://auth.ofeklabs.dev
JWT_PUBLIC_KEY=<paste-entire-public-key>
COOKIE_DOMAIN=.ofeklabs.dev
NODE_ENV=production
```

Custom domain: `api.ofeklabs.dev` or `tasks.ofeklabs.dev`

---

## 📚 Full Documentation

- [README.md](packages/horizon-auth/README.md) - Complete API reference
- [PRODUCTION-DEPLOYMENT.md](packages/horizon-auth/PRODUCTION-DEPLOYMENT.md) - Production setup
- [EXAMPLE.md](packages/horizon-auth/EXAMPLE.md) - Usage examples
- [CROSS-LANGUAGE.md](packages/horizon-auth/CROSS-LANGUAGE.md) - C#, Python, Go examples

---

## ✅ Next Steps

1. Choose your mode (Embedded or SSO)
2. Install the package
3. Update app.module.ts
4. Configure .env
5. Test locally
6. Deploy to production!

