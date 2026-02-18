# Requirements Document: Enhanced Authentication Features

## Introduction

This document specifies the requirements for adding enterprise-grade authentication features to the @ofeklabs/horizon-auth package. The enhancements include social login (Google & Facebook), device management, push notification support, two-factor authentication (2FA), and comprehensive account management capabilities. These features must integrate seamlessly with the existing SSO mode and Full mode architecture while maintaining backward compatibility.

## Glossary

- **Auth_System**: The @ofeklabs/horizon-auth NestJS authentication module
- **SSO_Mode**: Single Sign-On mode where applications only verify JWT tokens issued by a central auth service
- **Full_Mode**: Complete authentication service mode with database and Redis for token management
- **Social_Provider**: External OAuth2 authentication provider (Google or Facebook)
- **Device**: A unique combination of user agent, browser, and operating system used to access the system
- **Device_Session**: An active authentication session associated with a specific device
- **Push_Token**: A Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS) token for sending push notifications
- **TOTP**: Time-based One-Time Password, a 6-digit code that changes every 30 seconds
- **Backup_Code**: A single-use recovery code for 2FA when the primary method is unavailable
- **Account_Deactivation**: Soft deletion where user data is retained but access is prevented
- **Account_Deletion**: Hard deletion where user data is permanently removed from the system

## Requirements

### Requirement 1: Social Login Integration

**User Story:** As a user, I want to sign in using my Google or Facebook account, so that I can access the application without creating a new password.

#### Acceptance Criteria

1. WHEN a user initiates Google OAuth2 login, THE Auth_System SHALL redirect to Google's authorization endpoint with appropriate scopes
2. WHEN Google returns an authorization code, THE Auth_System SHALL exchange it for user profile information
3. WHEN a user initiates Facebook OAuth2 login, THE Auth_System SHALL redirect to Facebook's authorization endpoint with appropriate scopes
4. WHEN Facebook returns an authorization code, THE Auth_System SHALL exchange it for user profile information
5. WHEN a social login succeeds for an existing user, THE Auth_System SHALL link the social account to the existing user account
6. WHEN a social login succeeds for a new user, THE Auth_System SHALL create a new user account with profile data from the social provider
7. WHEN storing social account data, THE Auth_System SHALL persist the provider name, provider user ID, and profile information
8. WHEN a user has multiple social accounts linked, THE Auth_System SHALL allow login through any linked provider
9. WHERE Full_Mode is enabled, THE Auth_System SHALL support social login with database persistence
10. WHERE SSO_Mode is enabled, THE Auth_System SHALL not provide social login endpoints

### Requirement 2: Device Management

**User Story:** As a user, I want to see all devices where I'm logged in and revoke access from specific devices, so that I can maintain security if a device is lost or stolen.

#### Acceptance Criteria

1. WHEN a user logs in, THE Auth_System SHALL capture device information including device name, type, operating system, and browser
2. WHEN a user logs in, THE Auth_System SHALL generate a device fingerprint based on user agent and other identifying information
3. WHEN a refresh token is issued, THE Auth_System SHALL associate it with the device that requested it
4. WHEN a user requests their active sessions, THE Auth_System SHALL return a list of all devices with active refresh tokens
5. WHEN displaying device information, THE Auth_System SHALL include the last active timestamp for each device
6. WHEN a user revokes a specific device session, THE Auth_System SHALL invalidate all refresh tokens associated with that device
7. WHEN a device is revoked, THE Auth_System SHALL prevent that device from refreshing its access token
8. WHERE Full_Mode is enabled, THE Auth_System SHALL support device management with database persistence
9. WHERE SSO_Mode is enabled, THE Auth_System SHALL not provide device management endpoints

### Requirement 3: Push Notification Token Management

**User Story:** As a developer, I want to register and manage push notification tokens for users, so that I can send notifications to their devices.

#### Acceptance Criteria

1. WHEN a client registers a push token, THE Auth_System SHALL store the token with its type (FCM or APNS)
2. WHEN registering a push token, THE Auth_System SHALL associate it with the user's device
3. WHEN a user has multiple devices, THE Auth_System SHALL support multiple push tokens per user
4. WHEN a push token is updated, THE Auth_System SHALL replace the old token for that device
5. WHEN a device session is revoked, THE Auth_System SHALL also revoke associated push notification tokens
6. WHEN a user requests their push tokens, THE Auth_System SHALL return all active tokens with device associations
7. WHEN a push token is explicitly revoked, THE Auth_System SHALL mark it as inactive
8. WHERE Full_Mode is enabled, THE Auth_System SHALL support push token management with database persistence
9. WHERE SSO_Mode is enabled, THE Auth_System SHALL not provide push token management endpoints

### Requirement 4: Two-Factor Authentication (2FA)

**User Story:** As a user, I want to enable two-factor authentication using an authenticator app, so that my account has an additional layer of security.

#### Acceptance Criteria

1. WHEN a user enables 2FA, THE Auth_System SHALL generate a TOTP secret key
2. WHEN a TOTP secret is generated, THE Auth_System SHALL create a QR code containing the secret for authenticator app setup
3. WHEN a user enables 2FA, THE Auth_System SHALL generate 10 single-use backup codes
4. WHEN a user verifies their TOTP setup, THE Auth_System SHALL require a valid 6-digit code before enabling 2FA
5. WHEN 2FA is enabled for a user, THE Auth_System SHALL require TOTP verification during login after password validation
6. WHEN a user provides a valid TOTP code during login, THE Auth_System SHALL complete the authentication process
7. WHEN a user provides a valid backup code during login, THE Auth_System SHALL mark that code as used and complete authentication
8. IF a backup code is already used, THEN THE Auth_System SHALL reject it and require a different code
9. WHEN a user disables 2FA, THE Auth_System SHALL remove the TOTP secret and invalidate all backup codes
10. WHEN a user regenerates backup codes, THE Auth_System SHALL invalidate old codes and generate 10 new codes
11. WHERE Full_Mode is enabled, THE Auth_System SHALL support 2FA with database persistence
12. WHERE SSO_Mode is enabled, THE Auth_System SHALL not provide 2FA management endpoints

### Requirement 5: Account Management

**User Story:** As a user, I want to deactivate or delete my account, so that I can control my data and account status.

#### Acceptance Criteria

1. WHEN a user deactivates their account, THE Auth_System SHALL mark the account as inactive without deleting data
2. WHEN an account is deactivated, THE Auth_System SHALL prevent login attempts for that user
3. WHEN an account is deactivated, THE Auth_System SHALL revoke all active refresh tokens
4. WHEN deactivating an account, THE Auth_System SHALL optionally store a deactivation reason
5. WHEN a user reactivates their account, THE Auth_System SHALL restore full access to the account
6. WHEN a user deletes their account, THE Auth_System SHALL permanently remove all user data including social accounts, devices, push tokens, and 2FA settings
7. WHEN an account is deleted, THE Auth_System SHALL cascade delete all related refresh tokens
8. WHEN an account is deleted, THE Auth_System SHALL return confirmation of successful deletion
9. WHERE Full_Mode is enabled, THE Auth_System SHALL support account management with database persistence
10. WHERE SSO_Mode is enabled, THE Auth_System SHALL not provide account management endpoints

### Requirement 6: Configuration and Feature Toggles

**User Story:** As a developer, I want to enable or disable specific authentication features through configuration, so that I can customize the auth system for my application's needs.

#### Acceptance Criteria

1. WHEN configuring the Auth_System, THE developer SHALL be able to enable or disable social login providers independently
2. WHEN social login is enabled, THE developer SHALL provide OAuth2 client credentials for each enabled provider
3. WHEN configuring the Auth_System, THE developer SHALL be able to enable or disable device management
4. WHEN configuring the Auth_System, THE developer SHALL be able to enable or disable push notification support
5. WHEN configuring the Auth_System, THE developer SHALL be able to enable or disable 2FA functionality
6. WHEN a feature is disabled, THE Auth_System SHALL not expose endpoints for that feature
7. WHEN a feature is disabled, THE Auth_System SHALL not require database tables for that feature
8. THE Auth_System SHALL maintain backward compatibility with existing configurations

### Requirement 7: Database Schema Extensions

**User Story:** As a developer, I want the database schema to support all new features, so that data is properly structured and relationships are maintained.

#### Acceptance Criteria

1. THE Auth_System SHALL define a SocialAccount table with fields for userId, provider, providerId, email, displayName, and profile data
2. THE Auth_System SHALL define a Device table with fields for userId, deviceId, deviceName, deviceType, os, browser, fingerprint, and lastActiveAt
3. THE Auth_System SHALL define a PushToken table with fields for userId, deviceId, token, tokenType, and active status
4. THE Auth_System SHALL define a TwoFactorAuth table with fields for userId, totpSecret, enabled status, and enabledAt timestamp
5. THE Auth_System SHALL define a BackupCode table with fields for userId, code hash, and used status
6. THE Auth_System SHALL extend the User table with isActive and deactivationReason fields
7. THE Auth_System SHALL extend the RefreshToken table with a deviceId foreign key
8. WHEN a user is deleted, THE Auth_System SHALL cascade delete all related records in SocialAccount, Device, PushToken, TwoFactorAuth, and BackupCode tables
9. THE Auth_System SHALL create appropriate indexes for performance on frequently queried fields

### Requirement 8: API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for all new features, so that I can integrate them into my application.

#### Acceptance Criteria

1. THE Auth_System SHALL provide POST /auth/social/google endpoint for Google OAuth2 callback
2. THE Auth_System SHALL provide POST /auth/social/facebook endpoint for Facebook OAuth2 callback
3. THE Auth_System SHALL provide GET /auth/devices endpoint to list user's active devices
4. THE Auth_System SHALL provide DELETE /auth/devices/:deviceId endpoint to revoke a specific device
5. THE Auth_System SHALL provide POST /auth/push-tokens endpoint to register a push notification token
6. THE Auth_System SHALL provide DELETE /auth/push-tokens/:tokenId endpoint to revoke a push token
7. THE Auth_System SHALL provide POST /auth/2fa/enable endpoint to initiate 2FA setup
8. THE Auth_System SHALL provide POST /auth/2fa/verify endpoint to complete 2FA setup
9. THE Auth_System SHALL provide POST /auth/2fa/disable endpoint to disable 2FA
10. THE Auth_System SHALL provide POST /auth/2fa/backup-codes/regenerate endpoint to generate new backup codes
11. THE Auth_System SHALL provide POST /auth/account/deactivate endpoint to deactivate an account
12. THE Auth_System SHALL provide POST /auth/account/reactivate endpoint to reactivate an account
13. THE Auth_System SHALL provide DELETE /auth/account endpoint to permanently delete an account
14. WHEN an endpoint is called, THE Auth_System SHALL validate request data using DTOs with class-validator
15. WHEN an endpoint requires authentication, THE Auth_System SHALL use JWT authentication guards

### Requirement 9: Backward Compatibility

**User Story:** As a developer using the existing Horizon Auth package, I want new features to not break my current implementation, so that I can upgrade without code changes.

#### Acceptance Criteria

1. WHEN upgrading to the new version, THE Auth_System SHALL continue to support all existing configuration options
2. WHEN new features are not configured, THE Auth_System SHALL function identically to the previous version
3. WHEN database migrations are applied, THE Auth_System SHALL preserve all existing user and token data
4. THE Auth_System SHALL not require changes to existing authentication flows
5. THE Auth_System SHALL maintain the same JWT token structure and validation logic
