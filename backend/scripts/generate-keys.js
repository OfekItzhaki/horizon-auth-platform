const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

const outDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(outDir, 'public.pem'), publicKey);

console.log('Keys generated successfully in backend/certs/');
