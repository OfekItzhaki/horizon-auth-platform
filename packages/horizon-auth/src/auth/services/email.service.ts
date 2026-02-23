import { Injectable, Inject, Logger } from '@nestjs/common';
import { HorizonAuthConfig } from '../../lib/horizon-auth-config.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailConfig?: HorizonAuthConfig['email'];

  constructor(
    @Inject('HORIZON_AUTH_CONFIG') private readonly config: HorizonAuthConfig,
  ) {
    this.emailConfig = config.email;
  }

  /**
   * Send password reset email with reset token
   * @param email - User email address
   * @param resetToken - Password reset token
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!this.emailConfig) {
      // Fallback to console logging for backward compatibility
      console.log(`Password reset token for ${email}: ${resetToken}`);
      return;
    }

    const resetLink = `${this.getBaseUrl()}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = this.generatePasswordResetEmailHtml(resetLink);

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send email verification email with verification token
   * @param email - User email address
   * @param verificationToken - Email verification token
   */
  async sendEmailVerificationEmail(email: string, verificationToken: string): Promise<void> {
    if (!this.emailConfig) {
      // Fallback to console logging for backward compatibility
      console.log(`Email verification token for ${email}: ${verificationToken}`);
      return;
    }

    const verificationLink = `${this.getBaseUrl()}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = this.generateEmailVerificationHtml(verificationLink);

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send email using configured provider
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email HTML content
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailConfig) {
      throw new Error('Email configuration is not provided');
    }

    // Use customSender if provided
    if (this.emailConfig.customSender) {
      await this.emailConfig.customSender(to, subject, html);
      this.logger.log(`Email sent to ${to} using custom sender`);
      return;
    }

    // Use provider SDK
    if (this.emailConfig.provider === 'resend') {
      await this.sendWithResend(to, subject, html);
    } else if (this.emailConfig.provider === 'sendgrid') {
      await this.sendWithSendGrid(to, subject, html);
    } else {
      throw new Error(`Unsupported email provider: ${this.emailConfig.provider}`);
    }
  }

  /**
   * Send email using Resend SDK
   */
  private async sendWithResend(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailConfig?.apiKey) {
      throw new Error('Resend API key is not configured');
    }

    try {
      // Dynamic import to avoid requiring resend as a hard dependency
      // Using Function constructor to bypass TypeScript's static import checking
      const resendModule = await Function('return import("resend")')().catch(() => {
        throw new Error('Resend package is not installed. Install it with: npm install resend');
      });
      const Resend = resendModule.Resend;
      const resend = new Resend(this.emailConfig.apiKey);

      await resend.emails.send({
        from: this.emailConfig.from,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to} using Resend`);
    } catch (error) {
      this.logger.error(`Failed to send email via Resend: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email using SendGrid SDK
   */
  private async sendWithSendGrid(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailConfig?.apiKey) {
      throw new Error('SendGrid API key is not configured');
    }

    try {
      // Dynamic import to avoid requiring sendgrid as a hard dependency
      // Using Function constructor to bypass TypeScript's static import checking
      const sgMailModule = await Function('return import("@sendgrid/mail")')().catch(() => {
        throw new Error('SendGrid package is not installed. Install it with: npm install @sendgrid/mail');
      });
      const sgMail = sgMailModule.default;
      sgMail.setApiKey(this.emailConfig.apiKey);

      await sgMail.send({
        from: this.emailConfig.from,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to} using SendGrid`);
    } catch (error) {
      this.logger.error(`Failed to send email via SendGrid: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Get base URL for email links
   * This should be configured in the email config or derived from the application
   */
  private getBaseUrl(): string {
    // TODO: Make this configurable via email config
    return process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Generate HTML content for password reset email
   */
  private generatePasswordResetEmailHtml(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML content for email verification email
   */
  private generateEmailVerificationHtml(verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email Address</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #28a745;">${verificationLink}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }
}
