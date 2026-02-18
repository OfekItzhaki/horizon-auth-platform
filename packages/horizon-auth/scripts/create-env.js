const fs = require('fs');
const path = require('path');

const envContent = `DATABASE_URL="postgresql://postgres.dtviwgnrszqgqsjqhlkf:Kurome%409890@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
`;

fs.writeFileSync(path.join(__dirname, '../.env'), envContent, 'utf8');
console.log('✅ .env file created successfully!');
