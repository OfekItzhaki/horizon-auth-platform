const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

async function applyMigration() {
  // Parse connection string and add SSL config
  const connectionString = process.env.DATABASE_URL.replace('?sslmode=require', '');
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    const sql = fs.readFileSync(path.join(__dirname, '../migrations/init.sql'), 'utf8');
    
    console.log('📝 Applying migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - users');
    console.log('  - refresh_tokens');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
