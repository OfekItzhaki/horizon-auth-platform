# NPM Publishing Setup Guide

## Issue: Two-Factor Authentication Required

NPM requires 2FA for publishing packages. Here's how to set it up:

## Option 1: Enable 2FA on NPM Account (Recommended)

### Step 1: Enable 2FA on npmjs.com

1. Go to https://www.npmjs.com/
2. Log in to your account
3. Click your profile picture → **Account**
4. Go to **Two-Factor Authentication**
5. Click **Enable 2FA**
6. Choose **Authorization and Publishing** (most secure)
7. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
8. Enter the 6-digit code to verify

### Step 2: Login with 2FA

```bash
npm login
```

When prompted, enter your 2FA code from your authenticator app.

### Step 3: Publish

```bash
npm publish --access public
```

You'll be prompted for your 2FA code again when publishing.

---

## Option 2: Use Access Token (Alternative)

If you prefer not to use 2FA every time:

### Step 1: Create an Access Token

1. Go to https://www.npmjs.com/
2. Log in to your account
3. Click your profile picture → **Access Tokens**
4. Click **Generate New Token**
5. Choose **Automation** (for CI/CD) or **Publish** (for manual publishing)
6. Name it (e.g., "horizon-auth-publish")
7. **Important**: Enable "Bypass 2FA" if you want to skip 2FA prompts
8. Copy the token (you won't see it again!)

### Step 2: Configure NPM to Use Token

Create or edit `~/.npmrc`:

```bash
# Windows
notepad %USERPROFILE%\.npmrc

# Add this line (replace YOUR_TOKEN with your actual token):
//registry.npmjs.org/:_authToken=YOUR_TOKEN
```

Or use command line:

```bash
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### Step 3: Publish

```bash
npm publish --access public
```

No 2FA prompt needed!

---

## Quick Publishing Steps (After Setup)

```bash
cd packages/horizon-auth

# 1. Verify you're logged in
npm whoami

# 2. Check package contents
npm pack --dry-run

# 3. Build the package
npm run build

# 4. Publish
npm publish --access public
```

---

## Troubleshooting

### "Access token expired"
```bash
npm logout
npm login
# Enter your credentials and 2FA code
```

### "403 Forbidden"
- Make sure 2FA is enabled on your NPM account
- Or use an access token with "Bypass 2FA" enabled
- Verify you have permission to publish to @ofeklabs scope

### "Package name already exists"
If someone else owns @ofeklabs:
1. Change the package name in package.json
2. Or request access to the @ofeklabs scope from the owner

### "Email not verified"
1. Go to https://www.npmjs.com/
2. Check your email for verification link
3. Click the link to verify

---

## After Successful Publishing

### Verify Publication

```bash
# Check package info
npm view @ofeklabs/horizon-auth

# Check on website
# Visit: https://www.npmjs.com/package/@ofeklabs/horizon-auth
```

### Test Installation

```bash
# In a new project
npm install @ofeklabs/horizon-auth

# Verify it works
node -e "console.log(require('@ofeklabs/horizon-auth'))"
```

### Update Package README on NPM

The README.md will automatically appear on the NPM package page!

---

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use 2FA** for your NPM account
3. **Rotate tokens** periodically
4. **Use automation tokens** only for CI/CD
5. **Keep your authenticator app** backed up

---

## Next Steps After Publishing

1. ✅ Announce on social media
2. ✅ Add badge to README: `[![npm version](https://badge.fury.io/js/@ofeklabs%2Fhorizon-auth.svg)](https://www.npmjs.com/package/@ofeklabs/horizon-auth)`
3. ✅ Create GitHub release
4. ✅ Update documentation with installation instructions
5. ✅ Monitor for issues and feedback

---

## Package Information

- **Name**: @ofeklabs/horizon-auth
- **Version**: 0.1.0
- **Registry**: https://registry.npmjs.org/
- **Package URL**: https://www.npmjs.com/package/@ofeklabs/horizon-auth (after publishing)

---

## Need Help?

- NPM Documentation: https://docs.npmjs.com/
- 2FA Guide: https://docs.npmjs.com/configuring-two-factor-authentication
- Publishing Guide: https://docs.npmjs.com/cli/v10/commands/npm-publish
