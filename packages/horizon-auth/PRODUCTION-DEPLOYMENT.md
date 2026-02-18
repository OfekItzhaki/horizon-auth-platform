# Production Deployment Guide

Complete guide for deploying @ofeklabs/horizon-auth to production with ofeklabs.dev domain.

---

## 🎯 Architecture

```
auth.ofeklabs.dev (Auth Service)
    ↓
    ├── tasks.ofeklabs.dev (Tasks App)
    ├── crm.ofeklabs.dev (CRM App)
    ├── analytics.ofeklabs.dev (Analytics App)
    └── admin.ofeklabs.dev (Admin Panel)

All apps share authentication via cookies (domain: .ofeklabs.dev)
```

---

## 📋 Prerequisites

1. **Domain**: ofeklabs.dev configured with DNS
2. **Hosting**: Render, AWS, or any Node.js hosting
3. **Database**: PostgreSQL (Supabase, Render, AWS RDS)
4. **Redis**: Redis Cloud, Render Redis, or AWS ElastiCache
5. **RSA Keys**: Generated and stored securely

---

## 🔑 Step 1: Generate Production Keys

```bash
# Generate keys locally
cd packages/horizon-auth
npm run generate:keys

# Keys are in certs/private.pem and certs/public.pem
```

**Important**: Store these keys securely! You'll need them as environment variables.

---

## 🚀 Step 2: Deploy Auth Service to Render

### Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `OfekItzhaki/horizon-auth-platform`
4. Configure:
   - **Name**: `ofeklabs-auth-service`
   - **Root Directory**: `packages/horizon-auth`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/main.js`

### Environment Variables

Add these in Render dashboard:

```env
# Database (use Render PostgreSQL or Supabase)
DATABASE_URL=postgresql://user:password@host:5432/horizon_auth

# Redis (use Render Redis or Redis Cloud)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Keys (paste the ENTIRE key including headers)
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(paste entire private key here)
...
-----END PRIVATE KEY-----

JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr...
(paste entire public key here)
...
-----END PUBLIC KEY-----

# Application
NODE_ENV=production
PORT=3000

# Cookies (for SSO across subdomains)
COOKIE_DOMAIN=.ofeklabs.dev
COOKIE_SECURE=true

# Optional
JWT_ISSUER=ofeklabs-auth
JWT_AUDIENCE=ofeklabs-api
```

### Custom Domain

1. In Render dashboard, go to your service
2. Click **Settings** → **Custom Domain**
3. Add: `auth.ofeklabs.dev`
4. Update your DNS:
   - Type: `CNAME`
   - Name: `auth`
   - Value: `<your-render-url>.onrender.com`

---

## 📦 Step 3: Deploy Your Apps (SSO Mode)

For each app (tasks, CRM, analytics), configure to use the shared auth service.

### Example: Tasks App

**app.module.ts**:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HorizonAuthModule.forRoot({
      // SSO Mode - verify tokens only
      ssoMode: true,
      
      // Point to auth service
      authServiceUrl: process.env.AUTH_SERVICE_URL,
      
      // Only need public key to verify tokens
      jwt: {
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
      
      // Share cookies across *.ofeklabs.dev
      cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  ],
  // ... your controllers, services
})
export class AppModule {}
```

### Environment Variables (Tasks App)

```env
# Auth Service
AUTH_SERVICE_URL=https://auth.ofeklabs.dev

# JWT Public Key (same as auth service)
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr...
-----END PUBLIC KEY-----

# Cookies
COOKIE_DOMAIN=.ofeklabs.dev
NODE_ENV=production

# Your app-specific vars
DATABASE_URL=...
```

### Custom Domain (Tasks App)

Add custom domain: `tasks.ofeklabs.dev`

Repeat for all apps:
- `crm.ofeklabs.dev`
- `analytics.ofeklabs.dev`
- `admin.ofeklabs.dev`

---

## 🔐 Step 4: Configure Environment Variables from .env

### Local Development (.env)

```env
# .env.local
AUTH_SERVICE_URL=http://auth.localhost:3000
JWT_PUBLIC_KEY=<paste-from-certs/public.pem>
COOKIE_DOMAIN=.localhost
NODE_ENV=development
```

### Production (.env.production)

```env
# .env.production
AUTH_SERVICE_URL=https://auth.ofeklabs.dev
JWT_PUBLIC_KEY=<paste-from-certs/public.pem>
COOKIE_DOMAIN=.ofeklabs.dev
NODE_ENV=production
```

### Load in NestJS

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),
    HorizonAuthModule.forRoot({
      authServiceUrl: process.env.AUTH_SERVICE_URL,
      jwt: {
        publicKey: process.env.JWT_PUBLIC_KEY,
      },
      cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  ],
})
export class AppModule {}
```

---

## 🧪 Step 5: Test Production Setup

### 1. Test Auth Service

```bash
# Health check
curl https://auth.ofeklabs.dev/.well-known/jwks.json

# Should return public keys
```

### 2. Register a User

```bash
curl -X POST https://auth.ofeklabs.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ofeklabs.dev",
    "password": "securepassword123",
    "fullName": "Test User"
  }'
```

### 3. Login

```bash
curl -X POST https://auth.ofeklabs.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ofeklabs.dev",
    "password": "securepassword123"
  }' \
  -c cookies.txt
```

Save the `accessToken` from response.

### 4. Test Tasks App

```bash
curl https://tasks.ofeklabs.dev/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

### 5. Test CRM App (Same Token!)

```bash
curl https://crm.ofeklabs.dev/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

Both apps should recognize the same user! 🎉

---

## 🔒 Security Checklist

- [ ] HTTPS enabled on all domains
- [ ] JWT keys stored in environment variables (not in code)
- [ ] Different keys for dev/staging/production
- [ ] Redis password set
- [ ] Database uses SSL
- [ ] COOKIE_SECURE=true in production
- [ ] COOKIE_DOMAIN=.ofeklabs.dev (with leading dot)
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Secrets not committed to Git

---

## 📊 Monitoring

### Health Checks

Add to each app:

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tasks-app',
    };
  }
}
```

### Render Health Check

Configure in Render:
- **Health Check Path**: `/health`
- **Health Check Interval**: 30 seconds

---

## 🐛 Troubleshooting

### "Cannot connect to auth service"

```bash
# Check if auth service is running
curl https://auth.ofeklabs.dev/.well-known/jwks.json

# Check environment variable
echo $AUTH_SERVICE_URL
```

### "Token verification failed"

1. Ensure JWT_PUBLIC_KEY matches auth service
2. Check token hasn't expired (15 min default)
3. Verify token format: `Bearer <token>`

### "Cookie not shared between apps"

1. Check COOKIE_DOMAIN is `.ofeklabs.dev` (with leading dot)
2. Verify all apps use same domain
3. Check browser dev tools → Application → Cookies
4. Ensure COOKIE_SECURE=true in production

### "Redis connection error"

```bash
# Test Redis connection
redis-cli -h your-redis-host -p 6379 -a your-password ping
# Should return: PONG
```

---

## 🔄 Updating Keys

If you need to rotate JWT keys:

1. Generate new keys
2. Update JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in auth service
3. Update JWT_PUBLIC_KEY in all apps
4. Restart all services
5. All existing tokens will be invalidated (users need to re-login)

---

## 📈 Scaling

### Horizontal Scaling

Auth service is stateless (except Redis). You can run multiple instances:

```yaml
# Render: Auto-scaling
instances: 3
```

### Database Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pooling
  connection_limit = 10
}
```

### Redis Clustering

For high availability, use Redis Cluster or Redis Sentinel.

---

## 💰 Cost Estimate (Render)

- Auth Service: $7/month (Starter)
- PostgreSQL: $7/month (Starter)
- Redis: $10/month (Starter)
- Each App: $7/month (Starter)

**Total for 4 apps**: ~$45/month

---

## 🎓 Summary

1. ✅ Deploy auth service to `auth.ofeklabs.dev`
2. ✅ Configure environment variables (JWT keys, Redis, DB)
3. ✅ Deploy apps in SSO mode pointing to auth service
4. ✅ Configure custom domains for each app
5. ✅ Test authentication flow
6. ✅ Monitor and scale as needed

Your entire OfekLabs ecosystem now shares authentication! 🚀

