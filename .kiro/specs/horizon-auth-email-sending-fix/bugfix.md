# Bugfix Requirements Document

## Introduction

The horizon-auth package has a critical bug where email-sending functionality is not implemented. The package defines an email configuration interface with `customSender` and provider options, but the actual email-sending logic was never completed. Currently, password reset tokens are only logged to console (with a TODO comment), and email verification tokens generated during registration are never sent to users. This prevents users from receiving password reset emails and email verification emails, making these authentication features non-functional.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `requestPasswordReset(email)` is called THEN the system only logs the reset token to console and does not send an email to the user

1.2 WHEN a user registers with `register(email, password)` THEN the system generates an `emailVerifyToken` but does not send a verification email to the user

1.3 WHEN email configuration with `customSender` or provider is provided THEN the system does not utilize the configured email service for any operations

### Expected Behavior (Correct)

2.1 WHEN `requestPasswordReset(email)` is called AND email configuration is provided THEN the system SHALL send a password reset email to the user using the configured email service (customSender or provider)

2.2 WHEN a user registers with `register(email, password)` AND email configuration is provided THEN the system SHALL send an email verification email to the user using the configured email service

2.3 WHEN email configuration with `customSender` is provided THEN the system SHALL use the customSender function to send emails

2.4 WHEN email configuration with a provider (resend, sendgrid) is provided THEN the system SHALL use the appropriate provider SDK to send emails

2.5 WHEN `requestPasswordReset(email)` is called AND no email configuration is provided THEN the system SHALL log the reset token to console (backward compatibility for development)

2.6 WHEN a user registers AND no email configuration is provided THEN the system SHALL log the verification token to console (backward compatibility for development)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `requestPasswordReset(email)` is called with a non-existent email THEN the system SHALL CONTINUE TO throw NotFoundException without revealing whether the user exists

3.2 WHEN `verifyEmail(token)` is called with a valid token THEN the system SHALL CONTINUE TO mark the user's email as verified and clear the emailVerifyToken

3.3 WHEN `resetPassword(token, newPassword)` is called with a valid token THEN the system SHALL CONTINUE TO update the user's password and clear the reset token

3.4 WHEN token generation occurs THEN the system SHALL CONTINUE TO use randomUUID() for generating secure tokens

3.5 WHEN password reset tokens are generated THEN the system SHALL CONTINUE TO set a 1-hour expiry time

3.6 WHEN any authentication operation occurs THEN the system SHALL CONTINUE TO function correctly regardless of whether email configuration is provided
