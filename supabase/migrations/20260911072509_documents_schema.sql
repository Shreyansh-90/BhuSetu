-- Add document enums
CREATE TYPE document_classification AS ENUM (
  'notice',
  'map',
  'schedule',
  'report',
  'evidence',
  'other'
);

CREATE TYPE document_status AS ENUM (
  'initiated',
  'uploaded',
  'verified',
  'rejected',
  'archived'
);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    classification document_classification NOT NULL,
    status document_status NOT NULL DEFAULT 'initiated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Versions Table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    minio_object_key TEXT NOT NULL,
    content_hash TEXT,
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);

-- Setup RLS (Basic)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read documents"
  ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read document_versions"
  ON document_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert documents"
  ON documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert document_versions"
  ON document_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update documents"
  ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
