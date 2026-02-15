import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    async sendVerificationEmail(email: string, otp: string, name?: string): Promise<void> {
        this.logger.log(`[EmailService] Sending OTP email to: ${email} (OTP: ${otp})`);

        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM || 'Horizon Flux <onboarding@resend.dev>';

        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY is not set. Email not sent.');
            return;
        }

        try {
            const { default: axios } = await import('axios');
            await axios.post(
                'https://api.resend.com/emails',
                {
                    from,
                    to: [email],
                    subject: 'Verify your Horizon Flux account',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>Welcome to Horizon Flux!</h2>
                            <p>Please use the following code to verify your email address:</p>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">${otp}</span>
                            </div>
                            <p>This code will expire in 15 minutes.</p>
                        </div>
                    `,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            this.logger.log(`[EmailService] Email sent successfully to ${email}`);
        } catch (error: any) {
            this.logger.error(`[EmailService] Failed to send email: ${error.message}`, error.response?.data);
            // Don't throw, just log. We can still verify via the logs in dev.
        }
    }
}
