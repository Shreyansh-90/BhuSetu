require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString, { max: 1 });

  console.log('Creating documents table...');
  await client`
    CREATE TABLE IF NOT EXISTS project_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      compensation_id UUID REFERENCES compensations(id) ON DELETE SET NULL,
      file_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      url TEXT NOT NULL,
      document_hash TEXT,
      version TEXT DEFAULT '1',
      status TEXT DEFAULT 'active',
      uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Table created.');
  await client.end();
}

run().catch(console.error);
