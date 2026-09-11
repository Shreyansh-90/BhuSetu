-- =============================================================================
-- BhuSetu Initial Schema Migration
-- Enables PostGIS, creates all domain tables, spatial columns, indexes, and
-- enables RLS on every table (policies deferred to B3).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- 2. Custom Enum Types
-- ---------------------------------------------------------------------------
CREATE TYPE organization_type AS ENUM (
  'central_ministry',
  'state_government',
  'district_authority',
  'land_acquiring_authority',
  'land_requiring_body',
  'project_implementing_agency',
  'rehabilitation_authority'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'ministry_officer',
  'state_officer',
  'district_officer',
  'field_officer',
  'project_manager',
  'rehabilitation_officer',
  'viewer'
);

CREATE TYPE project_status AS ENUM (
  'draft',
  'submitted',
  'under_scrutiny',
  'clarification_requested',
  'approved',
  'rejected',
  'notification_issued',
  'award_declared',
  'compensation_assessed',
  'possession_taken',
  'closed',
  'archived'
);

CREATE TYPE acquisition_category AS ENUM (
  'urgent',
  'normal'
);

CREATE TYPE parcel_type AS ENUM (
  'private',
  'government',
  'forest',
  'tribal',
  'other'
);

CREATE TYPE milestone_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'skipped'
);

CREATE TYPE workflow_task_status AS ENUM (
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'rejected',
  'escalated'
);

CREATE TYPE geometry_verification_status AS ENUM (
  'unverified',
  'pending_review',
  'verified',
  'rejected',
  'stale'
);

-- ---------------------------------------------------------------------------
-- 3. Helper: auto-update updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 4. Tables
-- ---------------------------------------------------------------------------

-- 4.1 Organizations
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  org_type      organization_type NOT NULL,
  state_code    TEXT,           -- NULL for central bodies
  district_code TEXT,           -- NULL for state/central bodies
  parent_org_id UUID REFERENCES organizations(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ      -- soft archival
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_organizations_org_type ON organizations(org_type);
CREATE INDEX idx_organizations_state_code ON organizations(state_code) WHERE state_code IS NOT NULL;

-- 4.2 User Profiles (linked to Supabase Auth)
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID NOT NULL UNIQUE,  -- references auth.users(id); FK added after auth schema is confirmed
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'viewer',
  organization_id UUID REFERENCES organizations(id),
  state_code      TEXT,            -- administrative scope
  district_code   TEXT,            -- administrative scope
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_profiles_auth_user ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_user_profiles_state ON user_profiles(state_code) WHERE state_code IS NOT NULL;

-- 4.3 Projects
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  status            project_status NOT NULL DEFAULT 'draft',
  category          acquisition_category NOT NULL DEFAULT 'normal',
  purpose           TEXT,                          -- purpose of acquisition
  state_code        TEXT NOT NULL,
  district_code     TEXT NOT NULL,
  requesting_org_id UUID NOT NULL REFERENCES organizations(id),
  acquiring_org_id  UUID REFERENCES organizations(id),
  created_by        UUID NOT NULL REFERENCES user_profiles(id),
  estimated_area_sqm DOUBLE PRECISION,             -- estimated total area in sq metres
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at       TIMESTAMPTZ
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_state ON projects(state_code);
CREATE INDEX idx_projects_district ON projects(state_code, district_code);
CREATE INDEX idx_projects_requesting_org ON projects(requesting_org_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- 4.4 Acquisition Cases
-- Supports configurable legal processes per state/authority/category.
-- Do NOT hard-code one universal legal workflow.
CREATE TABLE acquisition_cases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id),
  case_reference          TEXT,               -- official case/file reference number
  applicable_legal_process TEXT,              -- e.g. 'LARR_2013', 'state_specific_act', etc.
  state_code              TEXT NOT NULL,
  authority_org_id        UUID REFERENCES organizations(id),
  status                  project_status NOT NULL DEFAULT 'draft',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at             TIMESTAMPTZ
);

CREATE TRIGGER trg_acquisition_cases_updated_at
  BEFORE UPDATE ON acquisition_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_acq_cases_project ON acquisition_cases(project_id);
CREATE INDEX idx_acq_cases_status ON acquisition_cases(status);
CREATE INDEX idx_acq_cases_state ON acquisition_cases(state_code);

-- 4.5 Parcels (descriptive records only; geometry stored separately)
CREATE TABLE parcels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_number   TEXT,
  village         TEXT,
  tehsil          TEXT,
  district        TEXT NOT NULL,
  state_code      TEXT NOT NULL,
  parcel_type     parcel_type NOT NULL DEFAULT 'private',
  area_sqm        DOUBLE PRECISION,       -- area in square metres
  owner_name      TEXT,                    -- current known owner/occupant (may be null)
  acquisition_case_id UUID REFERENCES acquisition_cases(id),
  project_id      UUID REFERENCES projects(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TRIGGER trg_parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_parcels_project ON parcels(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_parcels_acq_case ON parcels(acquisition_case_id) WHERE acquisition_case_id IS NOT NULL;
CREATE INDEX idx_parcels_state ON parcels(state_code);
CREATE INDEX idx_parcels_district ON parcels(state_code, district);
CREATE INDEX idx_parcels_type ON parcels(parcel_type);

-- 4.6 Project Geometries (spatial data stored separately from project descriptive data)
-- Source metadata fields satisfy: "Keep source, date, CRS, version, and confidence metadata"
CREATE TABLE project_geometries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id),
  geometry              geography(Geometry, 4326) NOT NULL,
  source_dataset        TEXT,             -- origin dataset name
  source_identifier     TEXT,             -- identifier within source
  source_version        TEXT,             -- version of source data
  source_date           DATE,             -- date of source data
  source_crs            TEXT DEFAULT 'EPSG:4326',
  confidence            DOUBLE PRECISION, -- 0.0-1.0 confidence score
  verification_status   geometry_verification_status NOT NULL DEFAULT 'unverified',
  verified_by           UUID REFERENCES user_profiles(id),
  verified_at           TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_project_geometries_updated_at
  BEFORE UPDATE ON project_geometries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_project_geom_project ON project_geometries(project_id);
CREATE INDEX idx_project_geom_spatial ON project_geometries USING GIST (geometry);
CREATE INDEX idx_project_geom_verification ON project_geometries(verification_status);

-- 4.7 Parcel Geometries (spatial data stored separately from parcel descriptive data)
CREATE TABLE parcel_geometries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id             UUID NOT NULL REFERENCES parcels(id),
  geometry              geography(Geometry, 4326) NOT NULL,
  source_dataset        TEXT,
  source_identifier     TEXT,
  source_version        TEXT,
  source_date           DATE,
  source_crs            TEXT DEFAULT 'EPSG:4326',
  confidence            DOUBLE PRECISION,
  verification_status   geometry_verification_status NOT NULL DEFAULT 'unverified',
  verified_by           UUID REFERENCES user_profiles(id),
  verified_at           TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_parcel_geometries_updated_at
  BEFORE UPDATE ON parcel_geometries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_parcel_geom_parcel ON parcel_geometries(parcel_id);
CREATE INDEX idx_parcel_geom_spatial ON parcel_geometries USING GIST (geometry);
CREATE INDEX idx_parcel_geom_verification ON parcel_geometries(verification_status);

-- 4.8 Milestones
CREATE TABLE milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          milestone_status NOT NULL DEFAULT 'pending',
  due_date        DATE,
  completed_date  DATE,
  sla_days        INTEGER,                  -- SLA in calendar days from project milestone start
  assigned_to     UUID REFERENCES user_profiles(id),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date) WHERE status NOT IN ('completed', 'skipped');

-- 4.9 Workflow Tasks
CREATE TABLE workflow_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  milestone_id    UUID REFERENCES milestones(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          workflow_task_status NOT NULL DEFAULT 'pending',
  assigned_to     UUID REFERENCES user_profiles(id),
  assigned_by     UUID REFERENCES user_profiles(id),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  resolution      TEXT,            -- notes on completion/rejection
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_workflow_tasks_updated_at
  BEFORE UPDATE ON workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workflow_tasks_project ON workflow_tasks(project_id);
CREATE INDEX idx_workflow_tasks_milestone ON workflow_tasks(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_assigned ON workflow_tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- 4.10 Audit Events (immutable, append-only)
CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,       -- e.g. 'project.submitted', 'parcel.verified', 'document.uploaded'
  entity_type     TEXT NOT NULL,       -- e.g. 'project', 'parcel', 'workflow_task'
  entity_id       UUID NOT NULL,       -- the record that was acted upon
  actor_id        UUID REFERENCES user_profiles(id),
  actor_role      user_role,
  actor_ip        INET,
  old_values      JSONB,               -- previous state (partial)
  new_values      JSONB,               -- new state (partial)
  metadata        JSONB,               -- additional context
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at: audit events are immutable
);

-- No update trigger on audit_events — they are immutable.
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_created ON audit_events(created_at);

-- ---------------------------------------------------------------------------
-- 5. Enable Row Level Security on all tables
-- Policies will be added in B3 after the authorization model is implemented.
-- With RLS enabled and no policies, all access is denied by default
-- (except for the service-role key which bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_cases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_geometries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_geometries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events        ENABLE ROW LEVEL SECURITY;

-- RLS policy notes for B3:
-- organizations:       Readable by all authenticated users. Writable by admin.
-- user_profiles:       Users can read their own profile. Admins can read/write all. Scoped by state/district.
-- projects:            Scoped by state/district/organization. Created by project_manager or higher.
-- acquisition_cases:   Scoped same as projects, plus authority scope.
-- parcels:             Scoped by project access.
-- project_geometries:  Scoped by project access.
-- parcel_geometries:   Scoped by parcel/project access.
-- milestones:          Scoped by project access.
-- workflow_tasks:      Scoped by assignment + project access.
-- audit_events:        Readable by admin, state_officer+. Never writable through RLS (insert via service role).
