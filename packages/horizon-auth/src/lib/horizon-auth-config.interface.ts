export interface HorizonAuthConfig {
  // Database configuration
  database: {
    url: string;
  };

  // Redis configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };

  // JWT configuration
  jwt: {
    privateKey: string; // RSA private key (PEM format)
    publicKey: string; // RSA public key (PEM format)
    accessTokenExpiry?: string; // Default: '15m'
    refreshTokenExpiry?: string; // Default: '7d'
    issuer?: string; // Default: 'horizon-auth'
    audience?: string; // Default: 'horizon-api'
    kid?: string; // Key ID for JWKS
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
    cookieSecure?: boolean; // Default: true in production
    cookieDomain?: string; // For SSO mode
  };

  // Global guards
  guards?: {
    applyJwtGuardGlobally?: boolean; // Default: false
  };
}
