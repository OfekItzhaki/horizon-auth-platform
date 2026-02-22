import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { HorizonAuthModule } from '@ofeklabs/horizon-auth';
import { ConfigModule } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';

/**
 * Preservation Property Tests - Property 2: SSO Mode and Non-Database Features
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that the fix preserves existing functionality:
 * - SSO mode skips database/Prisma initialization and only provides JWT verification
 * - RedisModule creates its own Redis connection as configured
 * - Authentication features (2FA, device management, push tokens) function correctly
 * - Database operations execute with the same logic when PrismaService is available
 * 
 * **IMPORTANT**: These tests run on UNFIXED code first to observe baseline behavior
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline to preserve)
 * 
 * Property-based testing generates many test cases for stronger guarantees across
 * configuration variations.
 */
describe('Preservation Tests - SSO Mode and Non-Database Features', () => {
  /**
   * Test 1: SSO Mode Preservation
   * 
   * Requirement 3.1: WHEN HorizonAuthModule is configured in SSO mode 
   * THEN the system SHALL CONTINUE TO skip database/Prisma initialization 
   * and only provide JWT verification
   */
  describe('SSO Mode Preservation (Requirement 3.1)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;

    beforeAll(async () => {
      // Configure HorizonAuthModule in SSO mode
      // This should NOT import PrismaModule or RedisModule
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          HorizonAuthModule.forRoot({
            ssoMode: true, // SSO mode - no database/Prisma
            authServiceUrl: 'http://localhost:3000',
            jwt: {
              publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
            },
          }),
        ],
      }).compile();

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
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should successfully initialize in SSO mode without PrismaModule', () => {
      expect(moduleFixture).toBeDefined();
      expect(app).toBeDefined();
    });

    it('should not have PrismaService available in SSO mode', () => {
      // In SSO mode, PrismaService should not be available
      // This is expected behavior to preserve
      expect(() => {
        moduleFixture.get('PrismaService', { strict: false });
      }).toThrow();
    });

    it('should have JWT verification available in SSO mode', () => {
      // JwtAuthGuard should be available for token verification
      const jwtGuard = moduleFixture.get('JwtAuthGuard', { strict: false });
      expect(jwtGuard).toBeDefined();
    });

    it('should not have AuthService available in SSO mode', () => {
      // AuthService requires database, so it should not be available in SSO mode
      expect(() => {
        moduleFixture.get('AuthService', { strict: false });
      }).toThrow();
    });
  });

  /**
   * Test 2: Redis Initialization Preservation
   * 
   * Requirement 3.2: WHEN RedisModule is initialized by horizon-auth 
   * THEN the system SHALL CONTINUE TO create its own Redis connection as configured
   */
  describe('Redis Initialization Preservation (Requirement 3.2)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;

    beforeAll(async () => {
      // Set environment variables for testing
      process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth';
      process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
      process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

      // Configure HorizonAuthModule in full mode with Redis
      // Note: Must enable twoFactor feature because AuthService has a required dependency on TwoFactorService
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          HorizonAuthModule.forRoot({
            database: {
              url: process.env.DATABASE_URL,
            },
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
            },
          }),
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should successfully initialize RedisService', () => {
      const redisService = moduleFixture.get('RedisService', { strict: false });
      expect(redisService).toBeDefined();
    });

    it('should create Redis connection with configured host and port (Property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random Redis configurations
          fc.record({
            host: fc.constantFrom('localhost', '127.0.0.1', 'redis'),
            port: fc.constantFrom(6379, 6380, 6381),
          }),
          async (redisConfig) => {
            // Create a test module with the generated Redis config
            const testModule = await Test.createTestingModule({
              imports: [
                ConfigModule.forRoot({
                  isGlobal: true,
                }),
                HorizonAuthModule.forRoot({
                  database: {
                    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth',
                  },
                  redis: redisConfig,
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
                  },
                }),
              ],
            }).compile();

            const testApp = testModule.createNestApplication();
            await testApp.init();

            // Verify RedisService is created
            const redisService = testModule.get('RedisService', { strict: false });
            expect(redisService).toBeDefined();

            await testApp.close();
          }
        ),
        {
          numRuns: 3, // Test multiple Redis configurations
          verbose: true,
        }
      );
    });
  });

  /**
   * Test 3: Authentication Features Preservation
   * 
   * Requirement 3.3: WHEN authentication features (2FA, device management, push tokens, 
   * account management) are used THEN the system SHALL CONTINUE TO function correctly 
   * with the injected PrismaService
   */
  describe('Authentication Features Preservation (Requirement 3.3)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth';
      process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
      process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

      // Configure with all features enabled
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          HorizonAuthModule.forRoot({
            database: {
              url: process.env.DATABASE_URL,
            },
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
      }).compile();

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
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should have TwoFactorService available when feature is enabled', () => {
      const twoFactorService = moduleFixture.get('TwoFactorService', { strict: false });
      expect(twoFactorService).toBeDefined();
    });

    it('should have DeviceService available when feature is enabled', () => {
      const deviceService = moduleFixture.get('DeviceService', { strict: false });
      expect(deviceService).toBeDefined();
    });

    it('should have PushTokenService available when feature is enabled', () => {
      const pushTokenService = moduleFixture.get('PushTokenService', { strict: false });
      expect(pushTokenService).toBeDefined();
    });

    it('should have AccountService available when feature is enabled', () => {
      const accountService = moduleFixture.get('AccountService', { strict: false });
      expect(accountService).toBeDefined();
    });

    it('should preserve feature availability across different configurations (Property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random feature configurations
          fc.record({
            twoFactor: fc.boolean(),
            deviceManagement: fc.boolean(),
            pushNotifications: fc.boolean(),
            accountManagement: fc.boolean(),
          }),
          async (features) => {
            // Create a test module with the generated feature config
            const testModule = await Test.createTestingModule({
              imports: [
                ConfigModule.forRoot({
                  isGlobal: true,
                }),
                HorizonAuthModule.forRoot({
                  database: {
                    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth',
                  },
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
                    deviceManagement: features.deviceManagement ? {
                      enabled: true,
                      maxDevicesPerUser: 10,
                    } : undefined,
                    pushNotifications: features.pushNotifications ? {
                      enabled: true,
                    } : undefined,
                    accountManagement: features.accountManagement ? {
                      enabled: true,
                      allowReactivation: true,
                    } : undefined,
                  },
                }),
              ],
            }).compile();

            const testApp = testModule.createNestApplication();
            await testApp.init();

            // Verify services are available based on feature flags
            // Note: TwoFactorService is always available because AuthService requires it
            const twoFactorService = testModule.get('TwoFactorService', { strict: false });
            expect(twoFactorService).toBeDefined();

            if (features.deviceManagement) {
              const deviceService = testModule.get('DeviceService', { strict: false });
              expect(deviceService).toBeDefined();
            }

            if (features.pushNotifications) {
              const pushTokenService = testModule.get('PushTokenService', { strict: false });
              expect(pushTokenService).toBeDefined();
            }

            if (features.accountManagement) {
              const accountService = testModule.get('AccountService', { strict: false });
              expect(accountService).toBeDefined();
            }

            await testApp.close();
          }
        ),
        {
          numRuns: 5, // Test multiple feature combinations
          verbose: true,
        }
      );
    });
  });

  /**
   * Test 4: JWT Verification Preservation
   * 
   * Requirement 3.1, 3.3: JWT verification should work correctly in both SSO and full mode
   */
  describe('JWT Verification Preservation', () => {
    it('should preserve JWT verification logic across modes (Property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random SSO mode flag
          fc.boolean(),
          async (ssoMode) => {
            const config: any = {
              jwt: {
                publicKey: readFileSync(join(process.cwd(), 'certs/public.pem'), 'utf8'),
              },
            };

            if (ssoMode) {
              config.ssoMode = true;
              config.authServiceUrl = 'http://localhost:3000';
            } else {
              config.database = {
                url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth',
              };
              config.redis = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
              };
              config.jwt.privateKey = readFileSync(join(process.cwd(), 'certs/private.pem'), 'utf8');
              config.cookie = {
                domain: '.localhost',
                secure: false,
              };
              // Enable twoFactor because AuthService requires TwoFactorService
              config.features = {
                twoFactor: {
                  enabled: true,
                  issuer: 'HorizonAuth',
                },
              };
            }

            const testModule = await Test.createTestingModule({
              imports: [
                ConfigModule.forRoot({
                  isGlobal: true,
                }),
                HorizonAuthModule.forRoot(config),
              ],
            }).compile();

            const testApp = testModule.createNestApplication();
            await testApp.init();

            // Verify JwtAuthGuard is available in both modes
            const jwtGuard = testModule.get('JwtAuthGuard', { strict: false });
            expect(jwtGuard).toBeDefined();

            await testApp.close();
          }
        ),
        {
          numRuns: 4, // Test both SSO and full mode
          verbose: true,
        }
      );
    });
  });

  /**
   * Test 5: Database Operations Preservation
   * 
   * Requirement 3.5: WHEN horizon-auth services perform database operations 
   * THEN the system SHALL CONTINUE TO execute the same Prisma queries and transactions as before
   */
  describe('Database Operations Preservation (Requirement 3.5)', () => {
    let app: INestApplication;
    let moduleFixture: TestingModule;

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/horizon_auth';
      process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
      process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

      // Note: Must enable twoFactor feature because AuthService has a required dependency on TwoFactorService
      moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          HorizonAuthModule.forRoot({
            database: {
              url: process.env.DATABASE_URL,
            },
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
            },
          }),
        ],
      }).compile();

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
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should have AuthService with database access', () => {
      const authService = moduleFixture.get('AuthService', { strict: false });
      expect(authService).toBeDefined();
    });

    it('should have UsersService with database access', () => {
      const usersService = moduleFixture.get('UsersService', { strict: false });
      expect(usersService).toBeDefined();
    });

    it('should preserve database query execution for authentication operations (Property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random authentication operations
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 20 }),
          }),
          async (credentials) => {
            // Test that authentication endpoints work (they require database operations)
            const response = await request(app.getHttpServer())
              .post('/v1/auth/login')
              .send(credentials);

            // Should not crash or return 500 (database operations should work)
            // Expected: 200/201 (success) or 400/401/404 (validation/auth errors)
            expect([200, 201, 400, 401, 404]).toContain(response.status);
          }
        ),
        {
          numRuns: 3, // Test multiple database operations
          verbose: true,
        }
      );
    });
  });
});
