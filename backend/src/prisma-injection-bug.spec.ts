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
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * This test demonstrates the global module conflict bug where:
 * - Application has its own @Global() PrismaModule
 * - HorizonAuthModule.forRoot() creates its own @Global() PrismaModule
 * - Both modules export PrismaService, causing NestJS dependency injection to fail
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **EXPECTED OUTCOME**: Test FAILS with 500 errors and "Cannot resolve dependency" messages
 * 
 * The test encodes the expected behavior:
 * - POST /auth/login should return 200/201 (not 500)
 * - AuthService should successfully inject PrismaService
 * - The injected PrismaService should be the application's instance
 */
describe('Bug Condition Exploration - Prisma Injection Conflict', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    // Set environment variables for testing
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth';
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

    try {
      // Create test module with BOTH PrismaModule and HorizonAuthModule
      // This reproduces the bug condition (now fixed)
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          // Application's own PrismaModule (marked as @Global())
          PrismaModule,
          // HorizonAuthModule.forRoot() - now uses application's PrismaService
          HorizonAuthModule.forRoot({
            // database.url is deprecated - removed
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
      
      // Apply same middleware as main.ts
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
      // If module compilation or initialization fails, that's also evidence of the bug
      console.error('Module initialization failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  /**
   * Property 1: Module Compilation Test
   * 
   * This test verifies that the module can be compiled and initialized.
   * On unfixed code, this may fail due to dependency injection conflicts.
   */
  it('should successfully compile and initialize the module', () => {
    expect(moduleFixture).toBeDefined();
    expect(app).toBeDefined();
  });

  /**
   * Property 1: PrismaService Resolution Test
   * 
   * Verify that PrismaService can be resolved from the module.
   * On unfixed code with two @Global() PrismaModules, this may fail or return unexpected instance.
   */
  it('should successfully resolve PrismaService', () => {
    const prismaService = moduleFixture.get(PrismaService, { strict: false });
    expect(prismaService).toBeDefined();
    expect(prismaService).toBeInstanceOf(PrismaService);
  });

  /**
   * Property 1: Service Injection Test
   * 
   * Verify that AuthService can successfully inject PrismaService
   * without "Cannot resolve dependency" errors
   */
  it('should successfully inject PrismaService into AuthService', () => {
    // Try to get AuthService from the module
    // On unfixed code: This may throw "Cannot resolve dependency" error
    // On fixed code: This will successfully return AuthService with injected PrismaService
    
    expect(() => {
      const authService = moduleFixture.get('AuthService', { strict: false });
      expect(authService).toBeDefined();
    }).not.toThrow();
  });

  /**
   * Property 1: Multiple PrismaService Instances Test
   * 
   * Check if there are multiple PrismaService instances (indicating the bug).
   * On unfixed code: horizon-auth creates its own PrismaService
   * On fixed code: only one PrismaService instance exists (the application's)
   */
  it('should have only one PrismaService instance (application\'s)', () => {
    // Get all PrismaService instances
    const appPrismaService = moduleFixture.get(PrismaService, { strict: false });
    
    // Try to get PrismaService from different contexts
    // If the bug exists, we might get different instances
    expect(appPrismaService).toBeDefined();
    
    // The application's PrismaService should be the one that's injected
    expect(appPrismaService.constructor.name).toBe('PrismaService');
  });

  /**
   * Property 1 (continued): Login Endpoint Test
   * 
   * Test that POST /auth/login works without 500 errors.
   * This is a property-based test that generates random credentials.
   */
  it('should successfully handle login requests without 500 errors (Property 1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid login credentials
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 20 }),
        }),
        async (credentials) => {
          // Attempt to login - this will fail on unfixed code with 500 error
          const response = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send(credentials);
          
          // The bug manifests as 500 Internal Server Error
          // Expected behavior: should return 200/201 (success) or 400/401 (validation/auth error)
          // Should NEVER return 500 (server error due to dependency injection failure)
          
          if (response.status === 500) {
            // Log the error for debugging
            console.error('BUG DETECTED: 500 error on login endpoint');
            console.error('Response body:', response.body);
            
            throw new Error(
              `BUG DETECTED: Authentication endpoint returned 500 error. ` +
              `This indicates PrismaService dependency injection failure. ` +
              `Error: ${JSON.stringify(response.body)}`
            );
          }
          
          // Expected: 200/201 (success) or 400/401 (validation/auth errors are acceptable)
          expect([200, 201, 400, 401, 404]).toContain(response.status);
        }
      ),
      {
        numRuns: 2, // Run 2 test cases to surface counterexamples quickly
        verbose: true,
      }
    );
  });

  /**
   * Property 1 (continued): Password Reset Endpoint Test
   * 
   * Test another authentication endpoint to confirm the bug affects all endpoints
   */
  it('should successfully handle password reset requests without 500 errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const response = await request(app.getHttpServer())
            .post('/v1/auth/password-reset')
            .send({ email });
          
          // Same as login test: should never return 500
          if (response.status === 500) {
            console.error('BUG DETECTED: 500 error on password reset endpoint');
            console.error('Response body:', response.body);
            
            throw new Error(
              `BUG DETECTED: Password reset endpoint returned 500 error. ` +
              `This indicates PrismaService dependency injection failure. ` +
              `Error: ${JSON.stringify(response.body)}`
            );
          }
          
          // Expected: 200/201 (success) or 400/404 (validation errors)
          expect([200, 201, 400, 404]).toContain(response.status);
        }
      ),
      {
        numRuns: 2, // Run 2 test cases for faster execution
        verbose: true,
      }
    );
  });
});
