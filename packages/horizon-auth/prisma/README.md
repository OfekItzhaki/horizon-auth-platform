# Prisma Schema for @ofeklabs/horizon-auth

## Overview

This directory contains the Prisma schema required by the @ofeklabs/horizon-auth package. Your application MUST include these models in its own `schema.prisma` file.

## Required Setup

### Step 1: Copy Models to Your Schema

Copy all models from `schema.prisma` in this directory to your application's `prisma/schema.prisma` file.

**IMPORTANT**: Merge the models - don't replace your entire schema!

### Step 2: Generate Prisma Client

After adding the models, regenerate your Prisma Client:

```bash
npx prisma generate
```

### Step 3: Run Migrations

Create and apply the database migration:

```bash
npx prisma migrate dev --name add-horizon-auth-models
```

## Required Models

The package requires these models to function:

### Core Models (Always Required)
- **User** - Core user authentication and profile
- **RefreshToken** - JWT refresh token storage with rotation

### Feature-Specific Models (Required if feature is enabled)
- **SocialAccount** - OAuth social login (Google, Facebook)
- **Device** - Device management and tracking
- **PushToken** - Push notification token storage
- **TwoFactorAuth** - TOTP 2FA secrets
- **BackupCode** - 2FA backup codes

## Model Relationships

```
User
├── RefreshToken[] (one-to-many)
├── SocialAccount[] (one-to-many)
├── Device[] (one-to-many)
├── PushToken[] (one-to-many)
├── TwoFactorAuth? (one-to-one)
└── BackupCode[] (one-to-many)

Device
├── RefreshToken[] (one-to-many)
└── PushToken[] (one-to-many)
```

## Customization

You can customize the models to fit your needs:

### Adding Fields
You can add additional fields to any model:

```prisma
model User {
  // ... existing fields from horizon-auth
  
  // Your custom fields
  phoneNumber String?
  avatar      String?
  preferences Json?
}
```

### Changing Table Names
The `@@map()` directive controls the database table name:

```prisma
model User {
  // ...
  @@map("users")  // Table name in database
}
```

### Adding Relations
You can add relations to your own models:

```prisma
model User {
  // ... existing fields from horizon-auth
  
  // Your custom relations
  orders Order[]
  profile UserProfile?
}
```

## Multi-Tenant Support

The User model includes a `tenantId` field for multi-tenant applications. If you're not using multi-tenancy, you can:

1. Keep the field (it defaults to "default")
2. Remove the field and related indexes (requires modifying the package's services)

## Database Support

The schema is designed for PostgreSQL but can be adapted for other databases:

- **PostgreSQL** - Fully supported (recommended)
- **MySQL** - Supported (change `@default(cuid())` to `@default(uuid())`)
- **SQLite** - Supported for development (not recommended for production)
- **MongoDB** - Not supported (package uses relational features)

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'findUnique')"

**Cause**: The User model is missing from your schema.

**Solution**: Copy all models from this schema to your application's schema.

### Error: "Invalid `prisma.user.findUnique()` invocation"

**Cause**: Prisma Client wasn't regenerated after adding models.

**Solution**: Run `npx prisma generate` and restart your application.

### Error: "Unknown field 'emailVerifyToken' on model 'User'"

**Cause**: Your User model is missing required fields.

**Solution**: Ensure you copied the complete User model definition, not just the model name.

## Need Help?

- Check the [Migration Guide](../MIGRATION.md)
- Review the [Main README](../README.md)
- Open an issue on GitHub
