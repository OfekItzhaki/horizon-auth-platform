import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { ConfigModule } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';

/**
 * Bug Condition Exploration Test - Property 1: Fault Condition
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This test demonstrates the email sending bug where:
 * - Email configuration is provided (customSender or provider with apiKey)
 * - Password reset tokens are only logged to console, not sent via email
 * - Email verification tokens are generated but never sent to users
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **EXPECTED OUTCOME**: Test FAILS because email sending functions are not called
 * 
 * The test encodes the expected behavior:
 * - When email config is provided, emails SHOULD be sent
 * - customSender function SHOULD be invoked
 * - Email SHOULD contain the token
 * - Email SHOULD have correct recipient
 */
describe('Bug Condition Exploration - Email Sending Not Implemented', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let mockCustomSender: jest.Mock;

  beforeAll(async () => {
    // Set environment variables for testing
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth';
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

    // Create a mock customSender function to track email sending
    mockCustomSender = jest.fn().mockResolvedValue(undefined);

    try {
      // Create test module with email configuration
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          PrismaModule,
          HorizonAuthModule.forRoot({
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            jwt: {
              privateKey: readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8'),
              publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
            },
            cookie: {
              domain: '.localhost',
              secure: false,
            },
            // Email configuration - this is the bug condition
            email: {
              provider: 'custom',
              from: 'noreply@example.com',
              customSender: mockCustomSender,
            },
            features: {
              twoFactor: {
                enabled: true,
                issuer: 'HorizonAuth',
              },
              deviceManagement: {
                enabled: true,
                maxDevicesPerUser: 10,
              },
              pushNotifications: {
                enabled: true,
              },
              accountManagement: {
                enabled: true,
                allowReactivation: true,
              },
            },
          }),
        ],
      })
        .overrideProvider(PrismaClient)
        .useClass(PrismaService)
        .compile();

      app = moduleFixture.createNestApplication();
      
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      );
      app.use(cookieParser());
      app.setGlobalPrefix('v1');

      await app.init();
    } catch (error) {
      console.error('Module initialization failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    // Reset mock before each test
    mockCustomSender.mockClear();
  });

  /**
   * Property 1: Password Reset Email Sending Test
   * 
   * **Validates: Requirements 1.1, 1.3**
   * 
   * This test verifies that when email configuration is provided,
   * password reset emails are sent using the configured email service.
   * 
   * On unfixed code: customSender is NEVER called (only console.log)
   * On fixed code: customSender is called with correct parameters
   */
  it('should send password reset email when email config is provided (Property 1 - Password Reset)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid email addresses
        fc.emailAddress(),
        async (email) => {
          // First, create a user so password reset can work
          const prisma = moduleFixture.get(PrismaService);
          await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              passwordHash: 'dummy-hash',
              emailVerified: true,
            },
          });

          // Request password reset via HTTP endpoint
          const response = await request(app.getHttpServer())
            .post('/v1/auth/password-reset')
            .send({ email });

          // Should succeed (200 or 201)
          expect([200, 201]).toContain(response.status);

          // BUG CONDITION: On unfixed code, customSender is NEVER called
          // EXPECTED BEHAVIOR: customSender SHOULD be called with:
          // - to: the user's email
          // - subject: containing "password reset" or similar
          // - html: containing the reset token
          
          if (mockCustomSender.mock.calls.length === 0) {
            throw new Error(
              `BUG DETECTED: customSender was not called for password reset. ` +
              `Email configuration is provided but emails are not being sent. ` +
              `Expected: customSender(to, subject, html) to be called. ` +
              `Actual: customSender was never invoked (only console.log executed).`
            );
          }

          // Verify customSender was called with correct parameters
          expect(mockCustomSender).toHaveBeenCalledTimes(1);
          
          const [to, subject, html] = mockCustomSender.mock.calls[0];
          
          // Verify recipient
          expect(to).toBe(email);
          
          // Verify subject mentions password reset
          expect(subject.toLowerCase()).toMatch(/password.*reset|reset.*password/);
          
          // Verify HTML contains a token (UUID format)
          expect(html).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        }
      ),
      {
        numRuns: 2, // Run 2 test cases to surface counterexamples quickly
        verbose: true,
      }
    );
  });

  /**
   * Property 1: Registration Email Verification Test
   * 
   * **Validates: Requirements 1.2, 1.3**
   * 
   * This test verifies that when email configuration is provided,
   * email verification emails are sent during user registration.
   * 
   * On unfixed code: customSender is NEVER called (token generated but not sent)
   * On fixed code: customSender is called with verification email
   */
  it('should send email verification email when email config is provided (Property 1 - Registration)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid registration data
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 20 }),
          fullName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (userData) => {
          // Ensure user doesn't exist
          const prisma = moduleFixture.get(PrismaService);
          await prisma.user.deleteMany({ where: { email: userData.email } });

          // Register user via HTTP endpoint
          const response = await request(app.getHttpServer())
            .post('/v1/auth/register')
            .send(userData);

          // Should succeed (200 or 201)
          expect([200, 201]).toContain(response.status);

          // BUG CONDITION: On unfixed code, customSender is NEVER called
          // EXPECTED BEHAVIOR: customSender SHOULD be called with:
          // - to: the user's email
          // - subject: containing "verify" or "verification"
          // - html: containing the verification token
          
          if (mockCustomSender.mock.calls.length === 0) {
            throw new Error(
              `BUG DETECTED: customSender was not called for email verification. ` +
              `Email configuration is provided but verification emails are not being sent. ` +
              `Expected: customSender(to, subject, html) to be called during registration. ` +
              `Actual: customSender was never invoked (token generated but not sent).`
            );
          }

          // Verify customSender was called with correct parameters
          expect(mockCustomSender).toHaveBeenCalledTimes(1);
          
          const [to, subject, html] = mockCustomSender.mock.calls[0];
          
          // Verify recipient
          expect(to).toBe(userData.email);
          
          // Verify subject mentions email verification
          expect(subject.toLowerCase()).toMatch(/verify|verification|confirm/);
          
          // Verify HTML contains a token (UUID format)
          expect(html).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        }
      ),
      {
        numRuns: 2, // Run 2 test cases to surface counterexamples quickly
        verbose: true,
      }
    );
  });
});
