require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  // Supabase pooler connection. We use postgres with SSL.
  const client = postgres(connectionString, { max: 1, ssl: 'require' });

  console.log('Testing connection...');
  try {
    const res = await client`SELECT 1 as result`;
    console.log('Connection successful:', res);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
