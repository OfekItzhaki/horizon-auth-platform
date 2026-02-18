# Cross-Language JWT Verification

The @ofeklabs/horizon-auth package uses RS256 (RSA with SHA-256) for JWT signing, which enables any programming language to verify tokens using the public key from the JWKS endpoint.

## JWT Payload Structure

All access tokens contain these standard claims:

```json
{
  "sub": "user-id-here",           // Subject (User ID)
  "email": "user@example.com",     // User email
  "tenantId": "default",           // Tenant ID
  "roles": ["user", "admin"],      // User roles
  "iat": 1705320000,               // Issued at (Unix timestamp)
  "exp": 1705320900,               // Expires at (Unix timestamp)
  "iss": "horizon-auth",           // Issuer
  "aud": "horizon-api"             // Audience
}
```

## JWKS Endpoint

Fetch public keys from:
```
GET http://your-auth-service/.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "horizon-auth-key-1",
      "n": "base64-encoded-modulus",
      "e": "AQAB"
    }
  ]
}
```

## C# (.NET) Example

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Text.Json;

public class HorizonAuthVerifier
{
    private readonly HttpClient _httpClient;
    private readonly string _authServiceUrl;

    public HorizonAuthVerifier(string authServiceUrl)
    {
        _httpClient = new HttpClient();
        _authServiceUrl = authServiceUrl;
    }

    public async Task<ClaimsPrincipal> VerifyTokenAsync(string token)
    {
        // Fetch JWKS
        var jwksUrl = $"{_authServiceUrl}/.well-known/jwks.json";
        var jwksJson = await _httpClient.GetStringAsync(jwksUrl);
        var jwks = new JsonWebKeySet(jwksJson);

        // Configure validation parameters
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = jwks.Keys,
            ValidateIssuer = true,
            ValidIssuer = "horizon-auth",
            ValidateAudience = true,
            ValidAudience = "horizon-api",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        // Verify token
        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

        return principal;
    }

    public string GetUserId(ClaimsPrincipal principal)
    {
        return principal.FindFirst("sub")?.Value;
    }

    public string GetEmail(ClaimsPrincipal principal)
    {
        return principal.FindFirst("email")?.Value;
    }

    public string[] GetRoles(ClaimsPrincipal principal)
    {
        return principal.FindAll("roles")
            .Select(c => c.Value)
            .ToArray();
    }
}

// Usage
var verifier = new HorizonAuthVerifier("http://localhost:3000");
var principal = await verifier.VerifyTokenAsync(token);
var userId = verifier.GetUserId(principal);
var email = verifier.GetEmail(principal);
var roles = verifier.GetRoles(principal);
```

## Python Example

```python
import jwt
import requests
from typing import Dict, Any

class HorizonAuthVerifier:
    def __init__(self, auth_service_url: str):
        self.auth_service_url = auth_service_url
        self.jwks_client = None

    def _get_jwks_client(self):
        """Lazy load JWKS client"""
        if self.jwks_client is None:
            from jwt import PyJWKClient
            jwks_url = f"{self.auth_service_url}/.well-known/jwks.json"
            self.jwks_client = PyJWKClient(jwks_url)
        return self.jwks_client

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return decoded payload"""
        try:
            # Get signing key from JWKS
            jwks_client = self._get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            # Verify and decode token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer="horizon-auth",
                audience="horizon-api",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "verify_aud": True
                }
            )

            return payload

        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {str(e)}")

    def get_user_id(self, payload: Dict[str, Any]) -> str:
        return payload.get("sub")

    def get_email(self, payload: Dict[str, Any]) -> str:
        return payload.get("email")

    def get_roles(self, payload: Dict[str, Any]) -> list:
        return payload.get("roles", [])

    def get_tenant_id(self, payload: Dict[str, Any]) -> str:
        return payload.get("tenantId")

# Usage
verifier = HorizonAuthVerifier("http://localhost:3000")
payload = verifier.verify_token(token)
user_id = verifier.get_user_id(payload)
email = verifier.get_email(payload)
roles = verifier.get_roles(payload)
```

## Go Example

```go
package auth

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/v2/jwk"
)

type HorizonAuthVerifier struct {
    authServiceURL string
    jwksCache      jwk.Set
    cacheExpiry    time.Time
}

type TokenClaims struct {
    Sub      string   `json:"sub"`
    Email    string   `json:"email"`
    TenantID string   `json:"tenantId"`
    Roles    []string `json:"roles"`
    jwt.RegisteredClaims
}

func NewHorizonAuthVerifier(authServiceURL string) *HorizonAuthVerifier {
    return &HorizonAuthVerifier{
        authServiceURL: authServiceURL,
    }
}

func (v *HorizonAuthVerifier) getJWKS(ctx context.Context) (jwk.Set, error) {
    // Return cached JWKS if still valid
    if v.jwksCache != nil && time.Now().Before(v.cacheExpiry) {
        return v.jwksCache, nil
    }

    // Fetch JWKS
    jwksURL := fmt.Sprintf("%s/.well-known/jwks.json", v.authServiceURL)
    set, err := jwk.Fetch(ctx, jwksURL)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
    }

    // Cache for 1 hour
    v.jwksCache = set
    v.cacheExpiry = time.Now().Add(1 * time.Hour)

    return set, nil
}

func (v *HorizonAuthVerifier) VerifyToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
    // Parse token
    token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }

        // Get JWKS
        jwks, err := v.getJWKS(ctx)
        if err != nil {
            return nil, err
        }

        // Get key ID from token header
        kid, ok := token.Header["kid"].(string)
        if !ok {
            return nil, fmt.Errorf("kid not found in token header")
        }

        // Find key in JWKS
        key, found := jwks.LookupKeyID(kid)
        if !found {
            return nil, fmt.Errorf("key %s not found in JWKS", kid)
        }

        // Convert to RSA public key
        var rawKey interface{}
        if err := key.Raw(&rawKey); err != nil {
            return nil, fmt.Errorf("failed to get raw key: %w", err)
        }

        return rawKey, nil
    })

    if err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)
    }

    // Extract claims
    claims, ok := token.Claims.(*TokenClaims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token")
    }

    // Verify issuer and audience
    if claims.Issuer != "horizon-auth" {
        return nil, fmt.Errorf("invalid issuer: %s", claims.Issuer)
    }

    if len(claims.Audience) == 0 || claims.Audience[0] != "horizon-api" {
        return nil, fmt.Errorf("invalid audience")
    }

    return claims, nil
}

// Usage
func main() {
    verifier := NewHorizonAuthVerifier("http://localhost:3000")
    
    claims, err := verifier.VerifyToken(context.Background(), token)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("User ID: %s\n", claims.Sub)
    fmt.Printf("Email: %s\n", claims.Email)
    fmt.Printf("Roles: %v\n", claims.Roles)
    fmt.Printf("Tenant: %s\n", claims.TenantID)
}
```

## Java Example

```java
import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.UrlJwkProvider;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

import java.net.URL;
import java.security.interfaces.RSAPublicKey;
import java.util.List;

public class HorizonAuthVerifier {
    private final String authServiceUrl;
    private final JwkProvider jwkProvider;

    public HorizonAuthVerifier(String authServiceUrl) throws Exception {
        this.authServiceUrl = authServiceUrl;
        String jwksUrl = authServiceUrl + "/.well-known/jwks.json";
        this.jwkProvider = new UrlJwkProvider(new URL(jwksUrl));
    }

    public DecodedJWT verifyToken(String token) throws Exception {
        // Decode token to get key ID
        DecodedJWT jwt = JWT.decode(token);
        String kid = jwt.getKeyId();

        // Get public key from JWKS
        Jwk jwk = jwkProvider.get(kid);
        RSAPublicKey publicKey = (RSAPublicKey) jwk.getPublicKey();

        // Verify token
        Algorithm algorithm = Algorithm.RSA256(publicKey, null);
        JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer("horizon-auth")
                .withAudience("horizon-api")
                .build();

        return verifier.verify(token);
    }

    public String getUserId(DecodedJWT jwt) {
        return jwt.getSubject();
    }

    public String getEmail(DecodedJWT jwt) {
        return jwt.getClaim("email").asString();
    }

    public List<String> getRoles(DecodedJWT jwt) {
        return jwt.getClaim("roles").asList(String.class);
    }

    public String getTenantId(DecodedJWT jwt) {
        return jwt.getClaim("tenantId").asString();
    }
}

// Usage
HorizonAuthVerifier verifier = new HorizonAuthVerifier("http://localhost:3000");
DecodedJWT jwt = verifier.verifyToken(token);
String userId = verifier.getUserId(jwt);
String email = verifier.getEmail(jwt);
List<String> roles = verifier.getRoles(jwt);
```

## Best Practices

1. **Cache JWKS**: Don't fetch the JWKS on every request. Cache it for at least 1 hour.

2. **Verify All Claims**: Always verify:
   - Signature (using public key)
   - Expiration (exp)
   - Issuer (iss)
   - Audience (aud)
   - Not before (nbf, if present)

3. **Handle Clock Skew**: Allow 5 minutes of clock skew for exp/nbf validation

4. **Secure Transport**: Always use HTTPS in production

5. **Error Handling**: Distinguish between expired tokens and invalid tokens

6. **Token Refresh**: Implement automatic token refresh on 401 responses

## Testing

Test your verification with a real token:

```bash
# Get a token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the accessToken in your verification code
```
