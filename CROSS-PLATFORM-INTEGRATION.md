# Cross-Platform Integration Guide

Your Horizon Auth service can be used with **any backend language** - not just NestJS! This guide shows how to integrate with .NET, Python, Go, Java, and more.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              Polyglot SSO Architecture                           │
└─────────────────────────────────────────────────────────────────┘

                    auth.yourdomain.com
                    ┌──────────────────────┐
                    │   Horizon Auth       │
                    │   (NestJS)           │
                    │                      │
                    │  ✓ Issues JWT        │
                    │  ✓ JWKS Endpoint     │
                    │  ✓ User Management   │
                    └──────────┬───────────┘
                               │
                      JWT Token + JWKS
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   NestJS App    │   │   .NET App      │   │   Python App    │
│                 │   │                 │   │                 │
│  @ofeklabs/     │   │  JWT Bearer     │   │  PyJWT          │
│  horizon-auth   │   │  Auth           │   │                 │
│  (SSO Mode)     │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Go App        │   │   Java App      │   │   PHP App       │
│                 │   │                 │   │                 │
│  golang-jwt     │   │  Spring         │   │  Firebase JWT   │
│                 │   │  Security       │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## How It Works

1. **Auth Service** (Horizon Auth) runs in Full Mode
   - Handles login, registration, 2FA, etc.
   - Issues JWT tokens signed with RSA private key
   - Exposes JWKS endpoint: `/.well-known/jwks.json`

2. **Your Apps** (Any Language) verify tokens
   - Fetch public key from JWKS endpoint
   - Verify JWT signature
   - Extract user info from token payload
   - No database or Redis needed!

---

## .NET / C# Integration

### Option 1: Using JWKS Endpoint (Recommended)

**Install Package:**
```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

**Configure Authentication (Program.cs or Startup.cs):**

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // JWKS endpoint - automatically fetches and rotates keys
        options.MetadataAddress = "https://auth.yourdomain.com/.well-known/jwks.json";
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidIssuer = "horizon-auth",
            ValidateAudience = true,
            ValidAudience = "horizon-api",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
        
        // Optional: Handle authentication events
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine($"Token validated for user: {context.Principal?.Identity?.Name}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
```

**Use in Controllers:**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // Public endpoint - no authentication
    [HttpGet("public")]
    public IActionResult GetPublicData()
    {
        return Ok(new { message = "This is public" });
    }
    
    // Protected endpoint - requires authentication
    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        
        return Ok(new 
        { 
            userId, 
            email, 
            roles,
            claims = User.Claims.Select(c => new { c.Type, c.Value })
        });
    }
    
    // Role-based authorization
    [Authorize(Roles = "admin")]
    [HttpGet("admin")]
    public IActionResult AdminOnly()
    {
        return Ok(new { message = "Admin access granted" });
    }
    
    // Policy-based authorization
    [Authorize(Policy = "RequireAdminRole")]
    [HttpDelete("{id}")]
    public IActionResult DeleteUser(string id)
    {
        return Ok(new { message = $"User {id} deleted" });
    }
}
```

**Custom Authorization Policies:**

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdminRole", policy =>
        policy.RequireRole("admin"));
    
    options.AddPolicy("RequireVerifiedEmail", policy =>
        policy.RequireClaim("email_verified", "true"));
    
    options.AddPolicy("RequireTwoFactor", policy =>
        policy.RequireClaim("two_factor_enabled", "true"));
});
```

### Option 2: Manual JWT Verification

If you prefer not to use JWKS, you can manually verify with the public key:

```csharp
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Security.Claims;

public class JwtService
{
    private readonly string _publicKey;
    private readonly RsaSecurityKey _securityKey;
    
    public JwtService(IConfiguration config)
    {
        _publicKey = config["JWT_PUBLIC_KEY"];
        
        var rsa = RSA.Create();
        rsa.ImportFromPem(_publicKey);
        _securityKey = new RsaSecurityKey(rsa);
    }
    
    public ClaimsPrincipal ValidateToken(string token)
    {
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _securityKey,
            ValidateIssuer = true,
            ValidIssuer = "horizon-auth",
            ValidateAudience = true,
            ValidAudience = "horizon-api",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
        
        var handler = new JwtSecurityTokenHandler();
        
        try
        {
            var principal = handler.ValidateToken(token, validationParameters, out var validatedToken);
            return principal;
        }
        catch (SecurityTokenException ex)
        {
            throw new UnauthorizedAccessException("Invalid token", ex);
        }
    }
    
    public string GetUserId(ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? principal.FindFirst("sub")?.Value;
    }
    
    public string GetEmail(ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Email)?.Value 
            ?? principal.FindFirst("email")?.Value;
    }
}

// Custom Middleware
public class JwtMiddleware
{
    private readonly RequestDelegate _next;
    private readonly JwtService _jwtService;
    
    public JwtMiddleware(RequestDelegate next, JwtService jwtService)
    {
        _next = next;
        _jwtService = jwtService;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var token = context.Request.Headers["Authorization"]
            .FirstOrDefault()?.Split(" ").Last();
        
        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var principal = _jwtService.ValidateToken(token);
                context.User = principal;
            }
            catch (UnauthorizedAccessException)
            {
                // Invalid token - continue without user
            }
        }
        
        await _next(context);
    }
}

// Register in Program.cs
builder.Services.AddSingleton<JwtService>();
app.UseMiddleware<JwtMiddleware>();
```

**Configuration (appsettings.json):**

```json
{
  "JWT_PUBLIC_KEY": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

---

## Python Integration

### Using PyJWT with JWKS

**Install Dependencies:**
```bash
pip install pyjwt[crypto] requests
```

**Flask Example:**

```python
import jwt
import requests
from functools import wraps
from flask import Flask, request, jsonify
from jwt import PyJWKClient

app = Flask(__name__)

# JWKS Client - automatically fetches and caches public keys
jwks_url = "https://auth.yourdomain.com/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Get signing key from JWKS
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            # Verify and decode token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer="horizon-auth",
                audience="horizon-api"
            )
            
            # Attach user to request
            request.user = payload
            return f(*args, **kwargs)
            
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
    
    return decorated

def require_role(role):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user_roles = request.user.get('roles', [])
            if role not in user_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# Public endpoint
@app.route('/public')
def public():
    return jsonify({'message': 'This is public'})

# Protected endpoint
@app.route('/profile')
@require_auth
def profile():
    return jsonify({
        'userId': request.user['sub'],
        'email': request.user['email'],
        'roles': request.user.get('roles', [])
    })

# Admin-only endpoint
@app.route('/admin')
@require_role('admin')
def admin():
    return jsonify({'message': 'Admin access granted'})

if __name__ == '__main__':
    app.run(debug=True)
```

**FastAPI Example:**

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from typing import Optional

app = FastAPI()
security = HTTPBearer()

jwks_url = "https://auth.yourdomain.com/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return payload"""
    token = credentials.credentials
    
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer="horizon-auth",
            audience="horizon-api"
        )
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(role: str):
    """Dependency to require specific role"""
    def role_checker(user: dict = Depends(verify_token)) -> dict:
        user_roles = user.get('roles', [])
        if role not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker

# Public endpoint
@app.get("/public")
def public():
    return {"message": "This is public"}

# Protected endpoint
@app.get("/profile")
def profile(user: dict = Depends(verify_token)):
    return {
        "userId": user["sub"],
        "email": user["email"],
        "roles": user.get("roles", [])
    }

# Admin-only endpoint
@app.get("/admin")
def admin(user: dict = Depends(require_role("admin"))):
    return {"message": "Admin access granted"}
```

---

## Go Integration

**Install Dependencies:**
```bash
go get github.com/golang-jwt/jwt/v5
go get github.com/lestrrat-go/jwx/v2/jwk
```

**Implementation:**

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    
    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/v2/jwk"
)

const (
    jwksURL = "https://auth.yourdomain.com/.well-known/jwks.json"
    issuer  = "horizon-auth"
    audience = "horizon-api"
)

// JWTMiddleware validates JWT tokens
func JWTMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "No authorization header", http.StatusUnauthorized)
            return
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        // Parse and validate token
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            // Verify signing method
            if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            
            // Fetch JWKS
            set, err := jwk.Fetch(context.Background(), jwksURL)
            if err != nil {
                return nil, err
            }
            
            // Get key ID from token
            kid, ok := token.Header["kid"].(string)
            if !ok {
                return nil, fmt.Errorf("kid header not found")
            }
            
            // Find key in JWKS
            key, ok := set.LookupKeyID(kid)
            if !ok {
                return nil, fmt.Errorf("key not found in JWKS")
            }
            
            // Convert to RSA public key
            var rawKey interface{}
            if err := key.Raw(&rawKey); err != nil {
                return nil, err
            }
            
            return rawKey, nil
        })
        
        if err != nil || !token.Valid {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        // Validate claims
        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            http.Error(w, "Invalid claims", http.StatusUnauthorized)
            return
        }
        
        // Verify issuer and audience
        if claims["iss"] != issuer || claims["aud"] != audience {
            http.Error(w, "Invalid issuer or audience", http.StatusUnauthorized)
            return
        }
        
        // Add user to context
        ctx := context.WithValue(r.Context(), "user", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// GetUser extracts user from context
func GetUser(r *http.Request) (jwt.MapClaims, bool) {
    user, ok := r.Context().Value("user").(jwt.MapClaims)
    return user, ok
}

// Handlers
func publicHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{
        "message": "This is public",
    })
}

func profileHandler(w http.ResponseWriter, r *http.Request) {
    user, ok := GetUser(r)
    if !ok {
        http.Error(w, "User not found", http.StatusUnauthorized)
        return
    }
    
    json.NewEncoder(w).Encode(map[string]interface{}{
        "userId": user["sub"],
        "email":  user["email"],
        "roles":  user["roles"],
    })
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
    user, ok := GetUser(r)
    if !ok {
        http.Error(w, "User not found", http.StatusUnauthorized)
        return
    }
    
    // Check for admin role
    roles, ok := user["roles"].([]interface{})
    if !ok {
        http.Error(w, "Invalid roles", http.StatusForbidden)
        return
    }
    
    hasAdmin := false
    for _, role := range roles {
        if role == "admin" {
            hasAdmin = true
            break
        }
    }
    
    if !hasAdmin {
        http.Error(w, "Insufficient permissions", http.StatusForbidden)
        return
    }
    
    json.NewEncoder(w).Encode(map[string]string{
        "message": "Admin access granted",
    })
}

func main() {
    mux := http.NewServeMux()
    
    // Public route
    mux.HandleFunc("/public", publicHandler)
    
    // Protected routes
    protected := http.NewServeMux()
    protected.HandleFunc("/profile", profileHandler)
    protected.HandleFunc("/admin", adminHandler)
    
    mux.Handle("/", JWTMiddleware(protected))
    
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", mux)
}
```

---

## Java / Spring Boot Integration

**Add Dependencies (pom.xml):**

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
</dependencies>
```

**Security Configuration:**

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            );
        
        return http.build();
    }
    
    @Bean
    public JwtDecoder jwtDecoder() {
        // JWKS endpoint
        String jwksUri = "https://auth.yourdomain.com/.well-known/jwks.json";
        
        return NimbusJwtDecoder
            .withJwkSetUri(jwksUri)
            .build();
    }
}
```

**Controller:**

```java
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {
    
    // Public endpoint
    @GetMapping("/public")
    public Map<String, String> publicEndpoint() {
        return Map.of("message", "This is public");
    }
    
    // Protected endpoint
    @GetMapping("/profile")
    public Map<String, Object> getProfile(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "userId", jwt.getSubject(),
            "email", jwt.getClaim("email"),
            "roles", jwt.getClaim("roles")
        );
    }
    
    // Admin-only endpoint
    @GetMapping("/admin")
    @PreAuthorize("hasRole('admin')")
    public Map<String, String> adminOnly() {
        return Map.of("message", "Admin access granted");
    }
}
```

**Application Properties:**

```properties
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.yourdomain.com/.well-known/jwks.json
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://auth.yourdomain.com
```

---

## PHP Integration

**Install Dependencies:**
```bash
composer require firebase/php-jwt
```

**Implementation:**

```php
<?php
require 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

class JWTAuth {
    private $jwksUrl = 'https://auth.yourdomain.com/.well-known/jwks.json';
    private $issuer = 'horizon-auth';
    private $audience = 'horizon-api';
    private $jwks = null;
    
    public function __construct() {
        $this->loadJWKS();
    }
    
    private function loadJWKS() {
        $jwksJson = file_get_contents($this->jwksUrl);
        $this->jwks = json_decode($jwksJson, true);
    }
    
    public function verifyToken($token) {
        try {
            $keys = JWK::parseKeySet($this->jwks);
            $decoded = JWT::decode($token, $keys);
            
            // Verify issuer and audience
            if ($decoded->iss !== $this->issuer || $decoded->aud !== $this->audience) {
                throw new Exception('Invalid issuer or audience');
            }
            
            return $decoded;
        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage());
        }
    }
    
    public function getUserFromRequest() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (empty($authHeader)) {
            return null;
        }
        
        $token = str_replace('Bearer ', '', $authHeader);
        
        try {
            return $this->verifyToken($token);
        } catch (Exception $e) {
            return null;
        }
    }
}

// Middleware
function requireAuth() {
    $auth = new JWTAuth();
    $user = $auth->getUserFromRequest();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    
    return $user;
}

function requireRole($role) {
    $user = requireAuth();
    $roles = $user->roles ?? [];
    
    if (!in_array($role, $roles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }
    
    return $user;
}

// Routes
header('Content-Type: application/json');

$path = $_SERVER['REQUEST_URI'];

if ($path === '/public') {
    echo json_encode(['message' => 'This is public']);
} elseif ($path === '/profile') {
    $user = requireAuth();
    echo json_encode([
        'userId' => $user->sub,
        'email' => $user->email,
        'roles' => $user->roles ?? []
    ]);
} elseif ($path === '/admin') {
    $user = requireRole('admin');
    echo json_encode(['message' => 'Admin access granted']);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}
?>
```

---

## Testing Your Integration

### 1. Get a JWT Token

First, login to your auth service to get a token:

```bash
# Login
curl -X POST https://auth.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "...",
#   "user": { ... }
# }
```

### 2. Test Your Backend

```bash
# Test public endpoint (no auth)
curl https://your-backend.com/public

# Test protected endpoint
curl https://your-backend.com/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test admin endpoint
curl https://your-backend.com/admin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Verify JWKS Endpoint

```bash
curl https://auth.yourdomain.com/.well-known/jwks.json
```

Should return:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "horizon-auth-key-1",
      "n": "...",
      "e": "AQAB",
      "alg": "RS256"
    }
  ]
}
```

---

## JWT Token Structure

Your tokens will have this structure:

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "horizon-auth-key-1"
}
```

**Payload:**
```json
{
  "sub": "user-id-123",
  "email": "user@example.com",
  "roles": ["user"],
  "iss": "horizon-auth",
  "aud": "horizon-api",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Claims Available:**
- `sub` - User ID
- `email` - User email
- `roles` - Array of user roles
- `iss` - Issuer (always "horizon-auth")
- `aud` - Audience (always "horizon-api")
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

---

## Common Issues & Solutions

### Issue: "Invalid signature"
**Solution:** Make sure you're using the correct public key or JWKS endpoint URL.

### Issue: "Token expired"
**Solution:** Tokens expire after 15 minutes by default. Use the refresh token to get a new access token.

### Issue: "Invalid issuer or audience"
**Solution:** Verify that your validation checks for:
- Issuer: `horizon-auth`
- Audience: `horizon-api`

### Issue: "JWKS endpoint not accessible"
**Solution:** Ensure your auth service is running and accessible from your backend.

### Issue: "CORS errors"
**Solution:** If calling from browser, ensure your auth service has CORS configured properly.

---

## Best Practices

1. **Use JWKS Endpoint** - Automatically handles key rotation
2. **Cache JWKS** - Don't fetch on every request (most libraries cache automatically)
3. **Validate All Claims** - Always check issuer, audience, and expiration
4. **Handle Token Expiration** - Implement refresh token logic in your frontend
5. **Use HTTPS** - Always use HTTPS in production
6. **Set Clock Skew** - Allow 5 minutes of clock skew for distributed systems
7. **Log Authentication Failures** - Monitor for security issues

---

## Summary

Your `@ofeklabs/horizon-auth` package works with **any backend language**:

✅ **NestJS** - Use the package directly in SSO mode  
✅ **.NET** - Use JWT Bearer authentication with JWKS  
✅ **Python** - Use PyJWT with JWKS client  
✅ **Go** - Use golang-jwt with JWKS  
✅ **Java** - Use Spring Security OAuth2 Resource Server  
✅ **PHP** - Use Firebase JWT library  

The key is the **JWKS endpoint** (`/.well-known/jwks.json`) which allows any language to verify your JWT tokens!

---

**Need Help?**
- [ENV-CONFIGURATION.md](./ENV-CONFIGURATION.md) - Environment variable reference
- [DEPLOYMENT-EXAMPLES.md](./DEPLOYMENT-EXAMPLES.md) - Deployment scenarios
- [GitHub Issues](https://github.com/OfekItzhaki/horizon-auth-platform/issues) - Report issues
