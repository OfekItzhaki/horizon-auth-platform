# Implementation Plan: Enhanced Authentication Features

## Overview

This implementation plan breaks down the enterprise authentication features into incremental, testable steps. Each task builds on previous work, with property-based tests integrated throughout to catch errors early. The implementation follows NestJS patterns and integrates with the existing Horizon Auth architecture.

## Tasks

- [x] 1. Database schema extensions and migrations
  - Update Prisma schema with new models (SocialAccount, Device, PushToken, TwoFactorAuth, BackupCode)
  - Extend User model with isActive and deactivationReason fields
  - Extend RefreshToken model with deviceId field
  - Add appropriate indexes and foreign key constraints
  - Generate Prisma migration files
  - Test migration up and down in development environment
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

- [ ] 2. Configuration interface extensions
  - [x] 2.1 Extend HorizonAuthConfig interface with features configuration
    - Add socialLogin configuration (Google and Facebook OAuth credentials)
    - Add deviceManagement configuration
    - Add pushNotifications configuration
    - Add twoFactor configuration
    - Add accountManagement configuration
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 2.2 Write unit tests for configuration validation
    - Test missing OAuth credentials when social login is enabled
    - Test default values for optional configuration
    - Test backward compatibility with old configurations
    - _Requirements: 6.2, 6.8_

- [ ] 3. Device management implementation
  - [x] 3.1 Create DeviceService with core methods
    - Implement device fingerprint generation using crypto hash
    - Implement device information extraction from User-Agent using ua-parser-js
    - Implement createOrUpdateDevice method
    - Implement getUserDevices method
    - Implement revokeDevice method with token cascade
    - Implement updateLastActive method
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_
  
  - [ ]* 3.2 Write property test for device fingerprint determinism
    - **Property 5: Device fingerprint determinism**
    - **Validates: Requirements 2.2**
  
  - [ ]* 3.3 Write property test for device information extraction
    - **Property 6: Device information extraction completeness**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.4 Write property test for active device list accuracy
    - **Property 7: Active device list accuracy**
    - **Validates: Requirements 2.4**
  
  - [ ]* 3.5 Write property test for device revocation cascade
    - **Property 8: Device revocation cascades to tokens**
    - **Validates: Requirements 2.6, 3.5**
  
  - [ ]* 3.6 Write property test for revoked device token refresh failure
    - **Property 9: Revoked device token refresh fails**
    - **Validates: Requirements 2.7**
  
  - [x] 3.7 Create device management DTOs
    - Create DeviceInfoDto for optional device name
    - Create DeviceResponseDto with all device fields
    - Add validation decorators
    - _Requirements: 8.3, 8.4_
  
  - [x] 3.8 Add device management endpoints to AuthController
    - Add GET /auth/devices endpoint with JWT guard
    - Add DELETE /auth/devices/:deviceId endpoint with JWT guard
    - Integrate DeviceService methods
    - _Requirements: 8.3, 8.4, 8.14, 8.15_
  
  - [ ]* 3.9 Write integration tests for device management endpoints
    - Test device list retrieval
    - Test device revocation
    - Test unauthorized access
    - _Requirements: 2.4, 2.6_

- [ ] 4. Checkpoint - Ensure device management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Social login implementation
  - [x] 5.1 Install required dependencies
    - Install passport-google-oauth20
    - Install passport-facebook
    - Install @nestjs/passport peer dependencies if needed
    - _Requirements: 1.1, 1.3_
  
  - [x] 5.2 Create SocialAuthService
    - Implement authenticateWithGoogle method
    - Implement authenticateWithFacebook method
    - Implement linkSocialAccount method
    - Implement findUserBySocialAccount method
    - Implement createUserFromSocialProfile method
    - Handle existing user linking vs new user creation
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 5.3 Write property test for OAuth code exchange
    - **Property 1: OAuth code exchange succeeds for valid codes**
    - **Validates: Requirements 1.2, 1.4**
  
  - [ ]* 5.4 Write property test for social account linking
    - **Property 2: Social account linking preserves user identity**
    - **Validates: Requirements 1.5, 1.8**
  
  - [ ]* 5.5 Write property test for new user creation
    - **Property 3: New user creation from social login**
    - **Validates: Requirements 1.6**
  
  - [ ]* 5.6 Write property test for social account data round-trip
    - **Property 4: Social account data round-trip**
    - **Validates: Requirements 1.7**
  
  - [ ] 5.7 Create Passport strategies
    - Create GoogleStrategy extending PassportStrategy
    - Create FacebookStrategy extending PassportStrategy
    - Configure OAuth scopes and callback URLs
    - Integrate with SocialAuthService
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 5.8 Create social login DTOs
    - Create GoogleCallbackDto with code field
    - Create FacebookCallbackDto with code field
    - Add validation decorators
    - _Requirements: 8.1, 8.2, 8.14_
  
  - [ ] 5.9 Add social login endpoints to AuthController
    - Add POST /auth/social/google endpoint
    - Add POST /auth/social/facebook endpoint
    - Integrate SocialAuthService methods
    - Return JWT tokens on successful authentication
    - _Requirements: 8.1, 8.2, 8.14, 8.15_
  
  - [ ]* 5.10 Write integration tests for social login flow
    - Test Google OAuth callback with mock provider
    - Test Facebook OAuth callback with mock provider
    - Test linking to existing user
    - Test creating new user
    - _Requirements: 1.5, 1.6_

- [ ] 6. Checkpoint - Ensure social login tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Push notification token management
  - [ ] 7.1 Create PushTokenService
    - Implement registerPushToken method
    - Implement updatePushToken method
    - Implement revokePushToken method
    - Implement getUserPushTokens method
    - Implement revokeDevicePushTokens method (called by DeviceService)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 7.2 Write property test for push token registration
    - **Property 10: Push token registration with device association**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 7.3 Write property test for multiple push tokens
    - **Property 11: Multiple push tokens per user**
    - **Validates: Requirements 3.3**
  
  - [ ]* 7.4 Write property test for push token update
    - **Property 12: Push token update replaces old token**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.5 Write property test for active push token retrieval
    - **Property 13: Active push token retrieval accuracy**
    - **Validates: Requirements 3.6**
  
  - [ ]* 7.6 Write property test for push token revocation
    - **Property 14: Push token revocation marks inactive**
    - **Validates: Requirements 3.7**
  
  - [ ] 7.7 Create push token DTOs
    - Create RegisterPushTokenDto with token, tokenType, and optional deviceId
    - Add validation decorators and enum validation
    - _Requirements: 8.5, 8.14_
  
  - [ ] 7.8 Add push token endpoints to AuthController
    - Add POST /auth/push-tokens endpoint with JWT guard
    - Add DELETE /auth/push-tokens/:tokenId endpoint with JWT guard
    - Integrate PushTokenService methods
    - _Requirements: 8.5, 8.6, 8.14, 8.15_
  
  - [ ] 7.9 Update DeviceService to call PushTokenService on device revocation
    - Integrate revokeDevicePushTokens in revokeDevice method
    - _Requirements: 3.5_
  
  - [ ]* 7.10 Write integration tests for push token endpoints
    - Test token registration
    - Test token revocation
    - Test cascade revocation when device is revoked
    - _Requirements: 3.1, 3.5, 3.7_

- [ ] 8. Checkpoint - Ensure push notification tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Two-factor authentication implementation
  - [ ] 9.1 Install required dependencies
    - Install otplib for TOTP generation
    - Install qrcode for QR code generation
    - _Requirements: 4.1, 4.2_
  
  - [ ] 9.2 Create TwoFactorService
    - Implement generateTotpSecret method with QR code generation
    - Implement verifyTotpSetup method
    - Implement enableTwoFactor method with backup code generation
    - Implement disableTwoFactor method
    - Implement verifyTotpCode method with time window tolerance
    - Implement verifyBackupCode method with bcrypt comparison
    - Implement regenerateBackupCodes method
    - Implement generateBackupCodes helper (10 codes, 8 chars each)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  
  - [ ]* 9.3 Write property test for TOTP secret and QR code generation
    - **Property 15: TOTP secret generation and QR code creation**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 9.4 Write property test for backup code count
    - **Property 16: Backup code generation count**
    - **Validates: Requirements 4.3, 4.10**
  
  - [ ]* 9.5 Write property test for TOTP verification
    - **Property 17: TOTP verification requires valid code**
    - **Validates: Requirements 4.4, 4.6**
  
  - [ ]* 9.6 Write property test for backup code single-use
    - **Property 18: Backup code single-use enforcement**
    - **Validates: Requirements 4.7, 4.8**
  
  - [ ]* 9.7 Write property test for 2FA login flow
    - **Property 19: 2FA login requires both factors**
    - **Validates: Requirements 4.5**
  
  - [ ]* 9.8 Write property test for 2FA disable cleanup
    - **Property 20: 2FA disable cleanup**
    - **Validates: Requirements 4.9**
  
  - [ ]* 9.9 Write property test for backup code regeneration
    - **Property 21: Backup code regeneration invalidates old codes**
    - **Validates: Requirements 4.10**
  
  - [ ] 9.10 Create 2FA DTOs
    - Create EnableTwoFactorDto (empty)
    - Create VerifyTwoFactorSetupDto with 6-digit code
    - Create VerifyTwoFactorLoginDto with code (6-8 chars)
    - Create TwoFactorSetupResponseDto with secret and qrCode
    - Create TwoFactorEnabledResponseDto with backupCodes array
    - Add validation decorators
    - _Requirements: 8.7, 8.8, 8.9, 8.10, 8.14_
  
  - [ ] 9.11 Update AuthService to integrate 2FA verification
    - Modify login method to check if user has 2FA enabled
    - Return intermediate response requiring 2FA if enabled
    - Create verifyTwoFactorLogin method
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [ ] 9.12 Add 2FA endpoints to AuthController
    - Add POST /auth/2fa/enable endpoint with JWT guard
    - Add POST /auth/2fa/verify endpoint with JWT guard
    - Add POST /auth/2fa/disable endpoint with JWT guard
    - Add POST /auth/2fa/backup-codes/regenerate endpoint with JWT guard
    - Integrate TwoFactorService methods
    - _Requirements: 8.7, 8.8, 8.9, 8.10, 8.14, 8.15_
  
  - [ ]* 9.13 Write integration tests for 2FA flow
    - Test 2FA enable flow
    - Test 2FA verification during login
    - Test backup code usage
    - Test 2FA disable
    - Test backup code regeneration
    - _Requirements: 4.1, 4.3, 4.5, 4.7, 4.9, 4.10_

- [ ] 10. Checkpoint - Ensure 2FA tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Account management implementation
  - [ ] 11.1 Create AccountService
    - Implement deactivateAccount method with token revocation
    - Implement reactivateAccount method
    - Implement deleteAccount method with cascade deletion
    - Implement isAccountActive method
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ]* 11.2 Write property test for account deactivation
    - **Property 22: Account deactivation preserves data**
    - **Validates: Requirements 5.1, 5.4**
  
  - [ ]* 11.3 Write property test for deactivated account login prevention
    - **Property 23: Deactivated account login prevention**
    - **Validates: Requirements 5.2**
  
  - [ ]* 11.4 Write property test for deactivation token revocation
    - **Property 24: Deactivation revokes all tokens**
    - **Validates: Requirements 5.3**
  
  - [ ]* 11.5 Write property test for account reactivation
    - **Property 25: Account reactivation restores access**
    - **Validates: Requirements 5.5**
  
  - [ ]* 11.6 Write property test for account deletion cascade
    - **Property 26: Account deletion cascade completeness**
    - **Validates: Requirements 5.6, 5.7**
  
  - [ ]* 11.7 Write property test for account deletion confirmation
    - **Property 27: Account deletion confirmation**
    - **Validates: Requirements 5.8**
  
  - [ ] 11.8 Update AuthService to check account active status
    - Modify login method to check isActive field
    - Return appropriate error if account is deactivated
    - _Requirements: 5.2_
  
  - [ ] 11.9 Create account management DTOs
    - Create DeactivateAccountDto with optional reason field
    - Add validation decorators
    - _Requirements: 8.11, 8.14_
  
  - [ ] 11.10 Add account management endpoints to AuthController
    - Add POST /auth/account/deactivate endpoint with JWT guard
    - Add POST /auth/account/reactivate endpoint with JWT guard
    - Add DELETE /auth/account endpoint with JWT guard
    - Integrate AccountService methods
    - _Requirements: 8.11, 8.12, 8.13, 8.14, 8.15_
  
  - [ ]* 11.11 Write integration tests for account management
    - Test account deactivation
    - Test login prevention when deactivated
    - Test account reactivation
    - Test account deletion with cascade
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

- [ ] 12. Checkpoint - Ensure account management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Feature configuration and conditional registration
  - [ ] 13.1 Update AuthModule to conditionally register services
    - Check features configuration in module initialization
    - Only register SocialAuthService if social login is enabled
    - Only register DeviceService if device management is enabled
    - Only register PushTokenService if push notifications are enabled
    - Only register TwoFactorService if 2FA is enabled
    - Only register AccountService if account management is enabled
    - _Requirements: 6.6, 1.10, 2.9, 3.9, 4.12, 5.10_
  
  - [ ] 13.2 Update AuthController to conditionally register routes
    - Use conditional route registration based on features config
    - Return 404 for disabled feature endpoints
    - _Requirements: 6.6_
  
  - [ ]* 13.3 Write property test for feature endpoint availability
    - **Property 28: Feature endpoint availability based on configuration**
    - **Validates: Requirements 6.6**
  
  - [ ]* 13.4 Write unit tests for SSO mode feature restrictions
    - Test that social login endpoints are not available in SSO mode
    - Test that device management endpoints are not available in SSO mode
    - Test that push token endpoints are not available in SSO mode
    - Test that 2FA endpoints are not available in SSO mode
    - Test that account management endpoints are not available in SSO mode
    - _Requirements: 1.10, 2.9, 3.9, 4.12, 5.10_

- [ ] 14. Backward compatibility verification
  - [ ]* 14.1 Write property test for configuration backward compatibility
    - **Property 29: Backward compatibility with existing configurations**
    - **Validates: Requirements 6.8, 9.1, 9.2**
  
  - [ ]* 14.2 Write property test for database migration data preservation
    - **Property 30: Database migration data preservation**
    - **Validates: Requirements 9.3**
  
  - [ ]* 14.3 Write property test for JWT token structure consistency
    - **Property 31: JWT token structure consistency**
    - **Validates: Requirements 9.5**
  
  - [ ]* 14.4 Write integration tests for backward compatibility
    - Test existing login flow without new features
    - Test existing token refresh flow
    - Test existing email verification flow
    - Test existing password reset flow
    - _Requirements: 9.2, 9.4_

- [ ] 15. Update AuthService to integrate device tracking
  - Modify login method to create/update device on successful authentication
  - Associate refresh tokens with device IDs
  - Update token refresh logic to update device lastActiveAt
  - _Requirements: 2.1, 2.3, 2.5_

- [ ] 16. Error handling and validation
  - [ ] 16.1 Create custom exception classes
    - Create AccountDeactivatedException
    - Create TwoFactorRequiredException
    - Create InvalidTwoFactorCodeException
    - Create BackupCodeAlreadyUsedException
    - Create SocialAccountAlreadyLinkedException
    - Create FeatureDisabledException
    - _Requirements: Error handling section_
  
  - [ ] 16.2 Add global exception filter for custom exceptions
    - Map exceptions to appropriate HTTP status codes
    - Return consistent error response format
    - _Requirements: Error handling section_
  
  - [ ]* 16.3 Write unit tests for error handling
    - Test each custom exception is thrown correctly
    - Test exception filter maps to correct HTTP responses
    - _Requirements: Error handling section_

- [ ] 17. Documentation and examples
  - [ ] 17.1 Update README.md with new features
    - Document social login configuration
    - Document device management usage
    - Document push notification setup
    - Document 2FA setup and usage
    - Document account management endpoints
    - Add code examples for each feature
    - _Requirements: All requirements_
  
  - [ ] 17.2 Create migration guide
    - Document database migration steps
    - Document configuration changes
    - Document breaking changes (if any)
    - Provide upgrade checklist
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 17.3 Update API documentation
    - Document all new endpoints with request/response examples
    - Document new DTOs
    - Document error responses
    - _Requirements: 8.1-8.15_

- [ ] 18. Final checkpoint - Comprehensive testing
  - Run all unit tests
  - Run all property-based tests
  - Run all integration tests
  - Verify test coverage meets requirements (100% for services and controllers)
  - Test in both SSO mode and Full mode
  - Test with features enabled and disabled
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties across all inputs
- Integration tests validate end-to-end flows and feature interactions
- All new features work exclusively in Full Mode (not SSO Mode)
- Device tracking is automatically integrated into existing login/refresh flows
- Configuration is backward compatible - existing implementations work without changes
