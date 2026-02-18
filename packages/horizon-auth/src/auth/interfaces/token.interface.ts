export interface AccessTokenPayload {
  sub: string;        // User ID
  email: string;      // User email
  tenantId: string;   // Tenant ID
  roles: string[];    // User roles
  iat: number;        // Issued at
  exp: number;        // Expires at
  iss: string;        // Issuer
  aud: string;        // Audience
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;        // User ID
  jti: string;        // JWT ID (token identifier)
  iat: number;        // Issued at
  exp: number;        // Expires at
}
