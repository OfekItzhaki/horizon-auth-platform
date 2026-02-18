# Publishing @ofeklabs/horizon-auth to NPM

## ✅ Pre-Publishing Checklist

- [x] Package builds successfully (`npm run build`)
- [x] All TypeScript errors resolved
- [x] Database schema created and tested
- [x] RSA key generation script works
- [x] Migration script works
- [x] Rate limiting implemented
- [x] Multi-tenant support added
- [x] Cross-language documentation complete
- [x] README comprehensive
- [x] .npmignore configured
- [x] package.json configured correctly

## 📦 Publishing Steps

### 1. Login to NPM

```bash
npm login
```

Enter your NPM credentials.

### 2. Verify Package Contents

```bash
npm pack --dry-run
```

This shows what will be included in the package.

### 3. Test Package Locally

```bash
# Build the package
npm run build

# Create a tarball
npm pack

# In another project, install from the tarball
npm install ../horizon-auth/ofeklabs-horizon-auth-0.1.0.tgz
```

### 4. Publish to NPM

```bash
# For first-time publish with scoped package
npm publish --access public

# For updates
npm publish
```

## 🚀 Post-Publishing

### Update Version

For future updates:

```bash
# Patch version (0.1.0 -> 0.1.1)
npm version patch

# Minor version (0.1.0 -> 0.2.0)
npm version minor

# Major version (0.1.0 -> 1.0.0)
npm version major

# Then publish
npm publish
```

### Verify Publication

```bash
# Check on NPM
npm view @ofeklabs/horizon-auth

# Install in a test project
npm install @ofeklabs/horizon-auth
```

## 📝 Package Information

- **Name**: @ofeklabs/horizon-auth
- **Version**: 0.1.0
- **Description**: Production-ready NestJS authentication module with 2026 security standards
- **License**: MIT
- **Repository**: https://github.com/OfekItzhaki/horizon-auth-platform

## 🔑 What's Included

- ✅ Argon2id password hashing
- ✅ RS256 JWT signing
- ✅ Refresh token rotation
- ✅ Redis token blacklisting
- ✅ Rate limiting
- ✅ Multi-tenant support
- ✅ JWKS endpoint
- ✅ Guards and decorators
- ✅ TypeScript definitions
- ✅ Migration scripts
- ✅ RSA key generation
- ✅ Docker Compose setup
- ✅ Comprehensive documentation

## 🎯 Usage After Publishing

Users can install with:

```bash
npm install @ofeklabs/horizon-auth
```

Then use in their NestJS app:

```typescript
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';

@Module({
  imports: [
    HorizonAuthModule.forRoot({
      database: { url: process.env.DATABASE_URL },
      redis: { host: 'localhost', port: 6379 },
      jwt: {
        privateKey: readFileSync('./certs/private.pem', 'utf8'),
        publicKey: readFileSync('./certs/public.pem', 'utf8'),
      },
    }),
  ],
})
export class AppModule {}
```

## 🔐 Dev SSO Mode

For local development with multiple apps:

```bash
docker-compose -f docker-compose.dev-sso.yml up -d
```

All `*.localhost` apps will share authentication.

## 🌍 Production Deployment

The package works in both modes:
1. **Embedded**: Each app has its own auth instance
2. **Centralized SSO**: Shared auth service for multiple apps

See README.md for complete deployment guide.

## 📞 Support

- Issues: https://github.com/OfekItzhaki/horizon-auth-platform/issues
- Documentation: See README.md, EXAMPLE.md, CROSS-LANGUAGE.md
