import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly resend: Resend;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendVerificationEmail(email: string, otp: string, name?: string) {
        this.logger.log(`[EmailService] Sending verification OTP ${otp} to ${email}`);

        try {
            const data = await this.resend.emails.send({
                from: process.env.RESEND_EMAIL_FROM || 'onboarding@resend.dev',
                to: email,
                subject: 'Verify your Horizon Account',
                html: `
                    <h1>Welcome to Horizon Auth</h1>
                    <p>Hi ${name || 'there'},</p>
                    <p>Your verification code is: <strong>${otp}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                `,
            });
            this.logger.log(`[EmailService] Resend response: ${JSON.stringify(data)}`);

            if ((data as any).error) {
                this.logger.error(`[EmailService] Resend failed: ${JSON.stringify((data as any).error)}`);
            }
        } catch (error) {
            this.logger.error(`[EmailService] Unexpected error sending email: ${error}`);
            if (error instanceof Error) {
                this.logger.error(error.stack);
            }
        }
    }

    async sendPasswordResetEmail(email: string, otp: string, name?: string) {
        this.logger.log(`[EmailService] Sending password reset OTP ${otp} to ${email}`);

        try {
            await this.resend.emails.send({
                from: process.env.RESEND_EMAIL_FROM || 'onboarding@resend.dev',
                to: email,
                subject: 'Reset your Horizon Password',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>Hi ${name || 'there'},</p>
                    <p>You requested a password reset. Your code is: <strong>${otp}</strong></p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
            });
        } catch (error) {
            this.logger.error(`Failed to send password reset email: ${error}`);
        }
    }
}
