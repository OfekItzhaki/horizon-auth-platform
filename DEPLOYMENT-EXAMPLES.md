# Deployment Examples

Real-world examples of deploying Horizon Auth in different scenarios.

## Scenario 1: Single Standalone App

**Use Case:** You have one app that needs authentication.

**Setup:** Embedded mode (each app has its own auth)

```env
# .env
AUTH_MODE=full
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.myapp.com
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
APP_NAME=MyApp
```

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot(), // Uses ENV variables
  ],
})
export class AppModule {}
```

**Deploy:** Single deployment with database and Redis.

---

## Scenario 2: Portfolio with SSO

**Use Case:** You have multiple projects under one domain (e.g., ofeklabs.com) and want users to login once.

### Step 1: Deploy Auth Service

**Domain:** `auth.ofeklabs.com`

```env
# .env for auth.ofeklabs.com
AUTH_MODE=full
DATABASE_URL=postgresql://user:pass@db.ofeklabs.com:5432/auth
REDIS_HOST=redis.ofeklabs.com
REDIS_PORT=6379
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.ofeklabs.com
NODE_ENV=production
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=OfekLabs
```

```typescript
// app.module.ts
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot(), // Full mode with all features
  ],
})
export class AppModule {}
```

### Step 2: Deploy Your Projects

**Projects:** `project1.ofeklabs.com`, `project2.ofeklabs.com`, `project3.ofeklabs.com`

```env
# .env for each project
AUTH_MODE=sso
AUTH_SERVICE_URL=https://auth.ofeklabs.com
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
COOKIE_DOMAIN=.ofeklabs.com
NODE_ENV=production
```

```typescript
// app.module.ts (same for all projects)
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot(), // SSO mode - token verification only
  ],
})
export class AppModule {}
```

### Result

- User visits `project1.ofeklabs.com`
- Your frontend checks if user is authenticated
- If not, redirect to `auth.ofeklabs.com/login` (your login UI)
- User logs in at `auth.ofeklabs.com`
- Cookie set for `.ofeklabs.com`
- Redirect back to `project1.ofeklabs.com`
- User is now logged in!
- User visits `project2.ofeklabs.com` → Already logged in! (same cookie)

---

## Scenario 3: Microservices Architecture

**Use Case:** Multiple backend services need to verify tokens.

### Auth Service

```env
# auth-service/.env
AUTH_MODE=full
DATABASE_URL=postgresql://...
REDIS_HOST=redis
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
```

### Other Services

```env
# user-service/.env, order-service/.env, etc.
AUTH_MODE=sso
AUTH_SERVICE_URL=http://auth-service:3000
JWT_PUBLIC_KEY="..."
```

All services can verify tokens without needing database/Redis!

---

## Scenario 4: Local Development

**Use Case:** Testing locally with multiple projects.

### Auth Service (localhost:3000)

```env
# backend/.env
AUTH_MODE=full
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev_auth
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
COOKIE_DOMAIN=.localhost
COOKIE_SECURE=false
NODE_ENV=development
ENABLE_2FA=true
ENABLE_DEVICE_MGMT=true
ENABLE_PUSH=true
ENABLE_ACCOUNT_MGMT=true
APP_NAME=DevAuth
```

### Project 1 (localhost:3001)

```env
# project1/.env
AUTH_MODE=sso
AUTH_SERVICE_URL=http://localhost:3000
JWT_PUBLIC_KEY="..."
COOKIE_DOMAIN=.localhost
COOKIE_SECURE=false
NODE_ENV=development
```

### Project 2 (localhost:3002)

```env
# project2/.env
AUTH_MODE=sso
AUTH_SERVICE_URL=http://localhost:3000
JWT_PUBLIC_KEY="..."
COOKIE_DOMAIN=.localhost
COOKIE_SECURE=false
NODE_ENV=development
```

**Note:** For `.localhost` to work, you may need to use `127.0.0.1` or configure your hosts file.

---

## Scenario 5: Docker Compose

**Use Case:** Deploy everything with Docker.

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password

  auth-service:
    build: ./auth-service
    ports:
      - "3000:3000"
    environment:
      AUTH_MODE: full
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/auth
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: redis_password
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      COOKIE_DOMAIN: .yourdomain.com
      NODE_ENV: production
      ENABLE_2FA: "true"
      ENABLE_DEVICE_MGMT: "true"
      ENABLE_PUSH: "true"
      ENABLE_ACCOUNT_MGMT: "true"
      APP_NAME: YourApp
    depends_on:
      - postgres
      - redis

  project1:
    build: ./project1
    ports:
      - "3001:3000"
    environment:
      AUTH_MODE: sso
      AUTH_SERVICE_URL: http://auth-service:3000
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      COOKIE_DOMAIN: .yourdomain.com
      NODE_ENV: production
    depends_on:
      - auth-service

  project2:
    build: ./project2
    ports:
      - "3002:3000"
    environment:
      AUTH_MODE: sso
      AUTH_SERVICE_URL: http://auth-service:3000
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      COOKIE_DOMAIN: .yourdomain.com
      NODE_ENV: production
    depends_on:
      - auth-service

volumes:
  postgres_data:
```

---

## Scenario 6: Kubernetes

**Use Case:** Deploy on Kubernetes with secrets.

### Auth Service Deployment

```yaml
# auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/auth-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: AUTH_MODE
          value: "full"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        - name: JWT_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-private-key
        - name: JWT_PUBLIC_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-public-key
        - name: COOKIE_DOMAIN
          value: ".yourdomain.com"
        - name: NODE_ENV
          value: "production"
        - name: ENABLE_2FA
          value: "true"
        - name: ENABLE_DEVICE_MGMT
          value: "true"
        - name: APP_NAME
          value: "YourApp"
```

### Project Deployment

```yaml
# project1-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: project1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: project1
  template:
    metadata:
      labels:
        app: project1
    spec:
      containers:
      - name: project1
        image: your-registry/project1:latest
        ports:
        - containerPort: 3000
        env:
        - name: AUTH_MODE
          value: "sso"
        - name: AUTH_SERVICE_URL
          value: "http://auth-service:3000"
        - name: JWT_PUBLIC_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-public-key
        - name: COOKIE_DOMAIN
          value: ".yourdomain.com"
        - name: NODE_ENV
          value: "production"
```

---

## Comparison Table

| Scenario | Auth Mode | Database | Redis | Best For |
|----------|-----------|----------|-------|----------|
| Single App | Full | Yes | Yes | Independent applications |
| Portfolio SSO | Full (auth) + SSO (projects) | Yes (auth only) | Yes (auth only) | Multiple related projects |
| Microservices | Full (auth) + SSO (services) | Yes (auth only) | Yes (auth only) | Service-oriented architecture |
| Local Dev | Full or SSO | Yes | Yes | Development and testing |
| Docker | Full or SSO | Yes (container) | Yes (container) | Containerized deployments |
| Kubernetes | Full or SSO | Yes (external) | Yes (external) | Cloud-native deployments |

---

## Key Takeaways

1. **Embedded Mode (`AUTH_MODE=full`)**: Each app has its own auth, needs database + Redis
2. **SSO Mode (`AUTH_MODE=sso`)**: Apps verify tokens only, no database/Redis needed
3. **Same Package**: Use the same `@ofeklabs/horizon-auth` package for both modes
4. **ENV Only**: Configure everything with environment variables - no code changes!
5. **Cookie Domain**: Use `.yourdomain.com` (with dot) for SSO across subdomains

---

**Need More Help?**
- [ENV-CONFIGURATION.md](./ENV-CONFIGURATION.md) - Complete ENV variable reference
- [PRODUCTION-INTEGRATION-GUIDE.md](./PRODUCTION-INTEGRATION-GUIDE.md) - Production setup guide
- [QUICK-INTEGRATION.md](./QUICK-INTEGRATION.md) - 5-minute quick start
