# Horizon Auth Email Sending Bugfix Design

## Overview

The horizon-auth package has a critical bug where email-sending functionality is not implemented despite having a complete email configuration interface. The package defines `customSender` and provider options (resend, sendgrid) in the configuration, but the actual email-sending logic was never completed. Currently, password reset tokens are only logged to console with a TODO comment, and email verification tokens generated during registration are never sent to users.

This design outlines a minimal implementation that adds email sending functionality while maintaining backward compatibility (console logging when no email config is provided) and preserving all existing authentication behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when email configuration is provided but emails are not sent
- **Property (P)**: The desired behavior - emails should be sent using the configured email service
- **Preservation**: Existing authentication logic, token generation, security measures, and console logging fallback that must remain unchanged
- **requestPasswordReset**: The method in `auth.service.ts` that generates reset tokens but only logs them to console
- **register**: The method in `auth.service.ts` that generates email verification tokens but never sends them
- **EmailService**: A new service to be created that handles email sending logic
- **customSender**: A user-provided function in the email configuration for custom email sending
- **provider**: The email provider type (resend or sendgrid) configured by the user

## Bug Details

### Fault Condition

The bug manifests when email configuration is provided in HorizonAuthConfig but the system fails to send emails. The `requestPasswordReset` and `register` methods generate tokens but do not utilize the configured email service.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { operation: 'passwordReset' | 'registration', emailConfig: EmailConfig | undefined }
  OUTPUT: boolean
  
  RETURN input.emailConfig IS NOT undefined
         AND input.emailConfig.provider IN ['resend', 'sendgrid', 'custom']
         AND (input.emailConfig.customSender IS defined OR input.emailConfig.apiKey IS defined)
         AND emailNotSent(input.operation)
END FUNCTION
```

### Examples

- **Password Reset with Resend**: User calls `requestPasswordReset('user@example.com')` with resend provider configured. Expected: Email sent via Resend API. Actual: Token only logged to console.
- **Registration with SendGrid**: User calls `register('user@example.com', 'password123')` with sendgrid provider configured. Expected: Verification email sent via SendGrid API. Actual: Token generated but no email sent.
- **Password Reset with customSender**: User provides customSender function in config and calls `requestPasswordReset('user@example.com')`. Expected: customSender function invoked with email details. Actual: Token only logged to console.
- **Registration without email config**: User calls `register('user@example.com', 'password123')` with no email config. Expected: Token logged to console (backward compatibility). Actual: Works correctly (this is the non-buggy case).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Token generation using randomUUID() must continue to work exactly as before
- Password reset token expiry (1 hour) must remain unchanged
- Security checks (user existence validation, token validation) must remain unchanged
- Database operations for storing tokens must remain unchanged
- All authentication flows (login, refresh, logout, 2FA) must remain unchanged
- Console logging when no email config is provided must continue to work (backward compatibility)

**Scope:**
All inputs that do NOT involve email configuration should be completely unaffected by this fix. This includes:
- Authentication operations (login, logout, refresh tokens)
- Token validation and verification
- Password hashing and verification
- User creation and updates
- Development mode usage without email configuration

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Incomplete Implementation**: The email configuration interface was defined but the implementation was never completed. The TODO comment in `requestPasswordReset` confirms this was intentional technical debt.

2. **Missing Email Service**: There is no EmailService or email-sending abstraction in the codebase. The auth.service.ts directly logs tokens instead of delegating to an email service.

3. **No Provider Integration**: The resend and sendgrid provider options are defined in the config but there's no code to instantiate or use these provider SDKs.

4. **Missing Email Templates**: There are no email templates or email content generation logic for password reset or email verification emails.

## Correctness Properties

Property 1: Fault Condition - Email Sending with Configuration

_For any_ operation (password reset or registration) where email configuration is provided (customSender or provider with apiKey), the system SHALL send an email to the user using the configured email service, and the email SHALL contain the appropriate token (reset token or verification token) and instructions.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Backward Compatibility and Existing Behavior

_For any_ operation where email configuration is NOT provided, the system SHALL continue to log tokens to console (backward compatibility), and for all authentication operations unrelated to email sending, the system SHALL produce exactly the same behavior as the original code, preserving token generation, security checks, and database operations.

**Validates: Requirements 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `packages/horizon-auth/src/auth/services/email.service.ts` (NEW)

**Purpose**: Create a new EmailService to handle email sending logic

**Specific Changes**:
1. **Create EmailService class**: Injectable service that accepts email configuration
   - Constructor receives HorizonAuthConfig
   - Extracts email configuration from config
   
2. **Implement sendPasswordResetEmail method**: Sends password reset emails
   - Parameters: email address, reset token
   - Generates reset link with token
   - Creates HTML email content
   - Delegates to appropriate sender (customSender, resend, or sendgrid)
   
3. **Implement sendEmailVerificationEmail method**: Sends email verification emails
   - Parameters: email address, verification token
   - Generates verification link with token
   - Creates HTML email content
   - Delegates to appropriate sender
   
4. **Implement private sendEmail method**: Handles provider-specific sending
   - Checks if customSender is provided, uses it if available
   - Otherwise, checks provider type and uses appropriate SDK
   - For resend: Use Resend SDK
   - For sendgrid: Use SendGrid SDK
   - Returns void or throws error on failure
   
5. **Add console logging fallback**: When no email config is provided
   - Log to console for development/testing
   - Maintain backward compatibility

**File**: `packages/horizon-auth/src/auth/auth.service.ts`

**Function**: `requestPasswordReset`

**Specific Changes**:
1. **Inject EmailService**: Add EmailService to constructor dependencies (optional injection)
2. **Replace console.log with email sending**: After generating reset token, call `emailService.sendPasswordResetEmail(email, resetToken)` if emailService is available
3. **Keep console.log as fallback**: If emailService is not available, keep existing console.log behavior

**File**: `packages/horizon-auth/src/auth/auth.service.ts`

**Function**: `register`

**Specific Changes**:
1. **Add email sending after user creation**: After creating user with emailVerifyToken, call `emailService.sendEmailVerificationEmail(email, user.emailVerifyToken)` if emailService is available
2. **Keep silent behavior as fallback**: If emailService is not available, continue without sending email (current behavior)

**File**: `packages/horizon-auth/src/auth/auth.module.ts`

**Specific Changes**:
1. **Import EmailService**: Add EmailService to imports
2. **Add EmailService to providers**: Register EmailService as a provider
3. **Make EmailService optional**: Use conditional provider registration based on email config availability

**File**: `packages/horizon-auth/package.json`

**Specific Changes**:
1. **Add resend SDK**: Add `resend` as an optional peer dependency
2. **Add sendgrid SDK**: Add `@sendgrid/mail` as an optional peer dependency
3. **Update documentation**: Note that users must install the SDK for their chosen provider

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, write exploratory tests that demonstrate the bug on unfixed code (emails not sent), then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that emails are not sent when configuration is provided.

**Test Plan**: Write tests that configure email settings (mock customSender or provider) and call `requestPasswordReset` and `register`. Assert that email sending functions are called. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Password Reset with customSender**: Configure customSender, call requestPasswordReset, assert customSender was called (will fail on unfixed code)
2. **Registration with customSender**: Configure customSender, call register, assert customSender was called (will fail on unfixed code)
3. **Password Reset with Resend**: Configure resend provider, call requestPasswordReset, assert Resend SDK was called (will fail on unfixed code)
4. **Registration with SendGrid**: Configure sendgrid provider, call register, assert SendGrid SDK was called (will fail on unfixed code)

**Expected Counterexamples**:
- customSender function is never invoked
- Provider SDKs are never called
- Only console.log statements are executed
- Possible causes: EmailService doesn't exist, no integration in auth.service.ts, no provider SDK usage

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (email config provided), the fixed function sends emails correctly.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := performOperation_fixed(input)
  ASSERT emailWasSent(result)
  ASSERT emailContainsToken(result)
  ASSERT emailHasCorrectRecipient(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (no email config), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT performOperation_original(input) = performOperation_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-email operations

**Test Plan**: Observe behavior on UNFIXED code first for operations without email config, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Console Logging Preservation**: Observe that console.log works on unfixed code when no email config is provided, then verify this continues after fix
2. **Token Generation Preservation**: Verify that tokens are still generated with randomUUID() and stored correctly
3. **Security Preservation**: Verify that NotFoundException is still thrown for non-existent users in password reset
4. **Authentication Flow Preservation**: Verify that login, refresh, logout, and 2FA flows continue to work identically

### Unit Tests

- Test EmailService.sendPasswordResetEmail with customSender (mock function)
- Test EmailService.sendEmailVerificationEmail with customSender (mock function)
- Test EmailService with resend provider (mock Resend SDK)
- Test EmailService with sendgrid provider (mock SendGrid SDK)
- Test EmailService fallback when no config is provided (should not throw)
- Test auth.service.requestPasswordReset calls EmailService when available
- Test auth.service.register calls EmailService when available
- Test backward compatibility: console.log when EmailService is not available

### Property-Based Tests

- Generate random email addresses and tokens, verify emails are sent correctly with all providers
- Generate random configurations (with/without email config), verify correct behavior in all cases
- Generate random user registration scenarios, verify email verification tokens are sent when config exists
- Test that all non-email authentication operations produce identical results regardless of email config

### Integration Tests

- Test full password reset flow: request reset with email config, verify email sent, use token to reset password
- Test full registration flow: register with email config, verify verification email sent, verify email with token
- Test mixed scenarios: some operations with email config, some without, verify correct behavior in each case
- Test provider switching: configure different providers, verify each works correctly
