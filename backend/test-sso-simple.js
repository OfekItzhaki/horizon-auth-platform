const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Read the public key
const publicKey = fs.readFileSync(path.join(__dirname, 'certs/public.pem'), 'utf8');

console.log('🔑 Public Key loaded successfully\n');

// Create a test token (you would normally get this from the auth service)
const privateKey = fs.readFileSync(path.join(__dirname, 'certs/private.pem'), 'utf8');

const testPayload = {
  sub: '123',
  email: 'test@example.com',
  roles: ['user'],
};

const token = jwt.sign(testPayload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'horizon-auth',
  audience: 'horizon-api',
});

console.log('✅ Test JWT Token created:');
console.log(token);
console.log('\n');

// Verify the token using only the public key (SSO mode simulation)
try {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'horizon-auth',
    audience: 'horizon-api',
  });

  console.log('✅ Token verified successfully in SSO mode!');
  console.log('\nDecoded payload:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('\n🎉 SSO Mode works! The backend can verify tokens using only the public key.');
} catch (error) {
  console.error('❌ Token verification failed:');
  console.error(error.message);
}
