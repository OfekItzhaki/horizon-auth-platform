const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, '../certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Write keys to files
fs.writeFileSync(path.join(certsDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(certsDir, 'public.pem'), publicKey);

console.log('✅ RSA keys generated successfully!');
console.log('📁 Private key: certs/private.pem');
console.log('📁 Public key: certs/public.pem');
console.log('\n⚠️  IMPORTANT: Never commit private.pem to version control!');
