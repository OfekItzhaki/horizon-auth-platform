export interface HorizonAuthConfig {
  // SSO Mode (optional) - for apps that only verify tokens
  ssoMode?: boolean;
  authServiceUrl?: string; // URL of the auth service (required if ssoMode is true)

  /**
   * @deprecated Database configuration is no longer used by HorizonAuth.
   * Applications must provide their own @Global() PrismaModule that exports PrismaService.
   * See the migration guide in the HorizonAuthModule documentation.
   */
  database?: {
    url: string;
  };

  // Redis configuration (required unless ssoMode is true)
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };

  // JWT configuration
  jwt: {
    privateKey?: string; // RSA private key (PEM format) - required for auth service
    publicKey: string; // RSA public key (PEM format) - required for all apps
    accessTokenExpiry?: string; // Default: '15m'
    refreshTokenExpiry?: string; // Default: '7d'
    issuer?: string; // Default: 'horizon-auth'
    audience?: string; // Default: 'horizon-api'
    kid?: string; // Key ID for JWKS
  };

  // Cookie configuration (for SSO)
  cookie?: {
    domain?: string; // Cookie domain (e.g., '.yourdomain.com')
    secure?: boolean; // HTTPS only (default: true in production)
    sameSite?: 'strict' | 'lax' | 'none'; // Default: 'lax'
  };

  // Multi-tenant configuration
  multiTenant?: {
    enabled: boolean;
    tenantIdExtractor?: 'header' | 'subdomain' | 'custom';
    customExtractor?: (req: any) => string;
    defaultTenantId?: string; // Default: 'default'
  };

  // Rate limiting configuration
  rateLimit?: {
    login?: { limit: number; ttl: number }; // Default: 5/min
    register?: { limit: number; ttl: number }; // Default: 3/min
    passwordReset?: { limit: number; ttl: number }; // Default: 3/hour
  };

  // Email configuration
  email?: {
    provider: 'resend' | 'sendgrid' | 'custom';
    apiKey?: string;
    from: string;
    customSender?: (to: string, subject: string, html: string) => Promise<void>;
  };

  // Security configuration
  security?: {
    bcryptMigration?: boolean; // Enable bcrypt to Argon2id migration
    cookieSecure?: boolean; // Default: true in production (deprecated - use cookie.secure)
    cookieDomain?: string; // For SSO mode (deprecated - use cookie.domain)
  };

  // Global guards
  guards?: {
    applyJwtGuardGlobally?: boolean; // Default: false
  };

  // Enhanced authentication features (optional)
  features?: {
    // Social login configuration
    socialLogin?: {
      google?: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
      };
      facebook?: {
        appId: string;
        appSecret: string;
        callbackUrl: string;
      };
    };

    // Device management configuration
    deviceManagement?: {
      enabled: boolean;
      maxDevicesPerUser?: number; // Optional limit on devices per user
    };

    // Push notifications configuration
    pushNotifications?: {
      enabled: boolean;
    };

    // Two-factor authentication configuration
    twoFactor?: {
      enabled: boolean;
      issuer?: string; // For TOTP QR codes (e.g., "MyApp")
    };

    // Account management configuration
    accountManagement?: {
      enabled: boolean;
      allowReactivation?: boolean; // Allow users to reactivate deactivated accounts
    };
  };
}
