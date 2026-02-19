import { HorizonAuthConfig } from './horizon-auth-config.interface';

/**
 * Load Horizon Auth configuration from environment variables
 * This allows zero-code configuration - just set ENV variables!
 * 
 * @example
 * // Full Mode (Embedded Auth)
 * AUTH_MODE=full
 * DATABASE_URL=postgresql://...
 * REDIS_HOST=localhost
 * JWT_PRIVATE_KEY=...
 * JWT_PUBLIC_KEY=...
 * 
 * @example
 * // SSO Mode (Token Verification Only)
 * AUTH_MODE=sso
 * AUTH_SERVICE_URL=https://auth.yourdomain.com
 * JWT_PUBLIC_KEY=...
 */
export function loadConfigFromEnv(): Partial<HorizonAuthConfig> {
  const authMode = process.env.AUTH_MODE || 'full';
  const isSsoMode = authMode === 'sso';

  const config: Partial<HorizonAuthConfig> = {
    ssoMode: isSsoMode,
  };

  // SSO Mode Configuration
  if (isSsoMode) {
    config.authServiceUrl = process.env.AUTH_SERVICE_URL;
    
    if (!config.authServiceUrl) {
      throw new Error('AUTH_SERVICE_URL is required when AUTH_MODE=sso');
    }
  }

  // Full Mode Configuration (Database & Redis)
  if (!isSsoMode) {
    if (process.env.DATABASE_URL) {
      config.database = {
        url: process.env.DATABASE_URL,
      };
    }

    if (process.env.REDIS_HOST) {
      config.redis = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : undefined,
      };
    }
  }

  // JWT Configuration
  config.jwt = {
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY!,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'horizon-auth',
    audience: process.env.JWT_AUDIENCE || 'horizon-api',
    kid: process.env.JWT_KID,
  };

  // Validate JWT keys
  if (!isSsoMode && !config.jwt?.privateKey) {
    // Only throw if AUTH_MODE is explicitly set to 'full' in ENV
    // If AUTH_MODE is not set, user might be providing config via code
    if (process.env.AUTH_MODE === 'full') {
      throw new Error('JWT_PRIVATE_KEY is required when AUTH_MODE=full');
    }
  }
  if (!config.jwt?.publicKey) {
    // Only throw if AUTH_MODE is explicitly set
    if (process.env.AUTH_MODE) {
      throw new Error('JWT_PUBLIC_KEY is required');
    }
  }

  // Cookie Configuration
  if (process.env.COOKIE_DOMAIN || process.env.COOKIE_SECURE || process.env.COOKIE_SAME_SITE) {
    config.cookie = {
      domain: process.env.COOKIE_DOMAIN,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
    };
  }

  // Multi-Tenant Configuration
  if (process.env.MULTI_TENANT === 'true') {
    config.multiTenant = {
      enabled: true,
      tenantIdExtractor: (process.env.TENANT_EXTRACTOR as 'header' | 'subdomain') || 'header',
      defaultTenantId: process.env.DEFAULT_TENANT_ID || 'default',
    };
  }

  // Rate Limiting Configuration
  if (process.env.RATE_LIMIT_LOGIN || process.env.RATE_LIMIT_REGISTER || process.env.RATE_LIMIT_PASSWORD_RESET) {
    config.rateLimit = {};
    
    if (process.env.RATE_LIMIT_LOGIN) {
      const [limit, ttl] = process.env.RATE_LIMIT_LOGIN.split('/');
      config.rateLimit.login = { limit: parseInt(limit), ttl: parseInt(ttl) * 1000 };
    }
    
    if (process.env.RATE_LIMIT_REGISTER) {
      const [limit, ttl] = process.env.RATE_LIMIT_REGISTER.split('/');
      config.rateLimit.register = { limit: parseInt(limit), ttl: parseInt(ttl) * 1000 };
    }
    
    if (process.env.RATE_LIMIT_PASSWORD_RESET) {
      const [limit, ttl] = process.env.RATE_LIMIT_PASSWORD_RESET.split('/');
      config.rateLimit.passwordReset = { limit: parseInt(limit), ttl: parseInt(ttl) * 1000 };
    }
  }

  // Email Configuration
  if (process.env.EMAIL_PROVIDER) {
    config.email = {
      provider: process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'custom',
      apiKey: process.env.EMAIL_API_KEY,
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    };
  }

  // Global Guards
  if (process.env.APPLY_JWT_GUARD_GLOBALLY === 'true') {
    config.guards = {
      applyJwtGuardGlobally: true,
    };
  }

  // Enhanced Features Configuration
  const features: HorizonAuthConfig['features'] = {};

  // Two-Factor Authentication
  if (process.env.ENABLE_2FA === 'true') {
    features.twoFactor = {
      enabled: true,
      issuer: process.env.APP_NAME || process.env.TWO_FACTOR_ISSUER || 'MyApp',
    };
  }

  // Device Management
  if (process.env.ENABLE_DEVICE_MGMT === 'true') {
    features.deviceManagement = {
      enabled: true,
      maxDevicesPerUser: process.env.MAX_DEVICES ? parseInt(process.env.MAX_DEVICES) : 10,
    };
  }

  // Push Notifications
  if (process.env.ENABLE_PUSH === 'true') {
    features.pushNotifications = {
      enabled: true,
    };
  }

  // Account Management
  if (process.env.ENABLE_ACCOUNT_MGMT === 'true') {
    features.accountManagement = {
      enabled: true,
      allowReactivation: process.env.ALLOW_REACTIVATION !== 'false', // Default true
    };
  }

  // Social Login
  if (process.env.GOOGLE_CLIENT_ID || process.env.FACEBOOK_APP_ID) {
    features.socialLogin = {};

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      features.socialLogin.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL}/auth/google/callback`,
      };
    }

    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      features.socialLogin.facebook = {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
        callbackUrl: process.env.FACEBOOK_CALLBACK_URL || `${process.env.APP_URL}/auth/facebook/callback`,
      };
    }
  }

  // Only add features if any are enabled
  if (Object.keys(features).length > 0) {
    config.features = features;
  }

  return config;
}

/**
 * Merge environment config with user-provided config
 * User config takes precedence over environment variables
 */
export function mergeWithEnvConfig(userConfig: Partial<HorizonAuthConfig>): HorizonAuthConfig {
  const envConfig = loadConfigFromEnv();
  
  // Deep merge: user config overrides env config
  const merged = {
    ...envConfig,
    ...userConfig,
    jwt: {
      ...envConfig.jwt,
      ...userConfig.jwt,
    },
    cookie: {
      ...envConfig.cookie,
      ...userConfig.cookie,
    },
    features: {
      ...envConfig.features,
      ...userConfig.features,
      twoFactor: {
        ...envConfig.features?.twoFactor,
        ...userConfig.features?.twoFactor,
      },
      deviceManagement: {
        ...envConfig.features?.deviceManagement,
        ...userConfig.features?.deviceManagement,
      },
      pushNotifications: {
        ...envConfig.features?.pushNotifications,
        ...userConfig.features?.pushNotifications,
      },
      accountManagement: {
        ...envConfig.features?.accountManagement,
        ...userConfig.features?.accountManagement,
      },
      socialLogin: {
        ...envConfig.features?.socialLogin,
        ...userConfig.features?.socialLogin,
      },
    },
  } as HorizonAuthConfig;
  
  return merged;
}
