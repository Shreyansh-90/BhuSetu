import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Creating documents table...');
  await db.execute(sql`
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
  `);
  console.log('Table created.');
}

run().catch(console.error).finally(() => process.exit(0));
