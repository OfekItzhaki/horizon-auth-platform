# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Email Sending with Configuration
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: password reset and registration with email config provided
  - Test that when email configuration is provided (customSender or provider with apiKey), emails are sent for password reset operations
  - Test that when email configuration is provided, emails are sent for registration operations
  - The test assertions should verify: email sending function is called, email contains the token, email has correct recipient
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: customSender not invoked, provider SDKs not called, only console.log executed
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Backward Compatibility and Existing Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for operations without email configuration
  - Observe that console.log works when no email config is provided
  - Observe that token generation uses randomUUID() and stores tokens correctly
  - Observe that NotFoundException is thrown for non-existent users in password reset
  - Observe that authentication flows (login, refresh, logout) work identically
  - Write property-based tests capturing observed behavior patterns: console logging fallback, token generation, security checks, authentication operations
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for email sending bug

  - [x] 3.1 Create EmailService
    - Create new file `packages/horizon-auth/src/auth/services/email.service.ts`
    - Implement EmailService class with Injectable decorator
    - Add constructor that receives HorizonAuthConfig and extracts email configuration
    - Implement sendPasswordResetEmail method (email, resetToken) that generates reset link and HTML content
    - Implement sendEmailVerificationEmail method (email, verificationToken) that generates verification link and HTML content
    - Implement private sendEmail method that checks for customSender first, then delegates to provider SDK (resend or sendgrid)
    - Add console logging fallback when no email config is provided
    - _Bug_Condition: isBugCondition(input) where input.emailConfig is defined AND (customSender OR apiKey) is provided_
    - _Expected_Behavior: Email SHALL be sent using configured service (customSender, resend, or sendgrid) with token and instructions_
    - _Preservation: Console logging fallback when no email config, no changes to token generation or security_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Update auth.service.ts to use EmailService
    - Inject EmailService in constructor (optional injection)
    - In requestPasswordReset: Replace console.log with emailService.sendPasswordResetEmail(email, resetToken) when emailService is available
    - In requestPasswordReset: Keep console.log as fallback when emailService is not available
    - In register: Add emailService.sendEmailVerificationEmail(email, user.emailVerifyToken) after user creation when emailService is available
    - In register: Keep silent behavior as fallback when emailService is not available
    - _Bug_Condition: isBugCondition(input) where email config is provided but emails not sent_
    - _Expected_Behavior: Emails sent via EmailService when config provided, console.log fallback otherwise_
    - _Preservation: All existing authentication logic, token generation, security checks unchanged_
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.3 Update auth.module.ts to register EmailService
    - Import EmailService
    - Add EmailService to providers array
    - Use conditional provider registration based on email config availability (make EmailService optional)
    - _Bug_Condition: EmailService not registered in module_
    - _Expected_Behavior: EmailService available for injection when email config provided_
    - _Preservation: All existing module configuration unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Add provider SDKs as peer dependencies
    - Update `packages/horizon-auth/package.json`
    - Add `resend` as optional peer dependency
    - Add `@sendgrid/mail` as optional peer dependency
    - Update documentation to note users must install SDK for their chosen provider
    - _Bug_Condition: Provider SDKs not available for email sending_
    - _Expected_Behavior: Provider SDKs available when users install them_
    - _Preservation: No breaking changes to existing dependencies_
    - _Requirements: 2.3, 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Email Sending with Configuration
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify emails are sent when email configuration is provided
    - Verify customSender is invoked when configured
    - Verify provider SDKs are called when configured
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Backward Compatibility and Existing Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm console logging still works when no email config provided
    - Confirm token generation unchanged (randomUUID, expiry times)
    - Confirm security checks unchanged (NotFoundException for non-existent users)
    - Confirm authentication flows unchanged (login, refresh, logout, 2FA)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
