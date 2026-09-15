/**
 * Canonical Drizzle schema for the current BhuSetu database.
 *
 * The Supabase SQL migration remains the source of truth for database changes.
 * This file is the single TypeScript representation consumed by the
 * application and Drizzle. Do not use drizzle-kit push against the shared
 * Supabase project; create and apply Supabase SQL migrations instead.
 */

import {
  customType,
  date,
  doublePrecision,
  inet,
  integer,
  bigint,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const organizationTypeEnum = pgEnum('organization_type', [
  'central_ministry',
  'state_government',
  'district_authority',
  'land_acquiring_authority',
  'land_requiring_body',
  'project_implementing_agency',
  'rehabilitation_authority',
]);

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'ministry_officer',
  'state_officer',
  'district_officer',
  'field_officer',
  'project_manager',
  'rehabilitation_officer',
  'viewer',
]);

export const projectStatusEnum = pgEnum('project_status', [
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
  'archived',
]);

export const awardStatusEnum = pgEnum('award_status', [
  'draft',
  'assessed',
  'approved',
  'disbursed',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'reconciled',
  'disputed',
  'failed',
]);

export const acquisitionCategoryEnum = pgEnum('acquisition_category', [
  'urgent',
  'normal',
]);

export const parcelTypeEnum = pgEnum('parcel_type', [
  'private',
  'government',
  'forest',
  'tribal',
  'other',
]);

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'skipped',
]);

export const workflowTaskStatusEnum = pgEnum('workflow_task_status', [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'rejected',
  'escalated',
]);

export const geometryVerificationStatusEnum = pgEnum('geometry_verification_status', [
  'unverified',
  'pending_review',
  'verified',
  'rejected',
  'stale',
]);

export const documentClassificationEnum = pgEnum('document_classification', [
  'notice',
  'map',
  'schedule',
  'report',
  'evidence',
  'other',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'initiated',
  'uploaded',
  'verified',
  'rejected',
  'archived',
]);

export const notificationCategoryEnum = pgEnum('notification_category', [
  'workflow',
  'milestone',
  'general',
  'alert',
]);

// Drizzle does not provide a built-in PostGIS geography type.
const geography = customType<{ data: string }>({
  dataType() {
    return 'geography(Geometry, 4326)';
  },
});

// ---------------------------------------------------------------------------
// Core tables
// ---------------------------------------------------------------------------

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  orgType: organizationTypeEnum('org_type').notNull(),
  stateCode: text('state_code'),
  districtCode: text('district_code'),
  parentOrgId: uuid('parent_org_id').references((): AnyPgColumn => organizations.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  organizationId: uuid('organization_id').references(() => organizations.id),
  stateCode: text('state_code'),
  districtCode: text('district_code'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('draft'),
  category: acquisitionCategoryEnum('category').notNull().default('normal'),
  purpose: text('purpose'),
  stateCode: text('state_code').notNull(),
  districtCode: text('district_code').notNull(),
  requestingOrgId: uuid('requesting_org_id').notNull().references(() => organizations.id),
  acquiringOrgId: uuid('acquiring_org_id').references(() => organizations.id),
  createdBy: uuid('created_by').notNull().references(() => userProfiles.id),
  estimatedAreaSqm: doublePrecision('estimated_area_sqm'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const acquisitionCases = pgTable('acquisition_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  caseReference: text('case_reference'),
  applicableLegalProcess: text('applicable_legal_process'),
  stateCode: text('state_code').notNull(),
  authorityOrgId: uuid('authority_org_id').references(() => organizations.id),
  status: projectStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const parcels = pgTable('parcels', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyNumber: text('survey_number'),
  village: text('village'),
  tehsil: text('tehsil'),
  district: text('district').notNull(),
  stateCode: text('state_code').notNull(),
  parcelType: parcelTypeEnum('parcel_type').notNull().default('private'),
  areaSqm: doublePrecision('area_sqm'),
  ownerName: text('owner_name'),
  acquisitionCaseId: uuid('acquisition_case_id').references(() => acquisitionCases.id),
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Spatial tables
// ---------------------------------------------------------------------------

export const projectGeometries = pgTable('project_geometries', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  geometry: geography('geometry').notNull(),
  sourceDataset: text('source_dataset'),
  sourceIdentifier: text('source_identifier'),
  sourceVersion: text('source_version'),
  sourceDate: date('source_date'),
  sourceCrs: text('source_crs').default('EPSG:4326'),
  confidence: doublePrecision('confidence'),
  verificationStatus: geometryVerificationStatusEnum('verification_status')
    .notNull()
    .default('unverified'),
  verifiedBy: uuid('verified_by').references(() => userProfiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const parcelGeometries = pgTable('parcel_geometries', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: uuid('parcel_id').notNull().references(() => parcels.id),
  geometry: geography('geometry').notNull(),
  sourceDataset: text('source_dataset'),
  sourceIdentifier: text('source_identifier'),
  sourceVersion: text('source_version'),
  sourceDate: date('source_date'),
  sourceCrs: text('source_crs').default('EPSG:4326'),
  confidence: doublePrecision('confidence'),
  verificationStatus: geometryVerificationStatusEnum('verification_status')
    .notNull()
    .default('unverified'),
  verifiedBy: uuid('verified_by').references(() => userProfiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Workflow and audit tables
// ---------------------------------------------------------------------------

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  status: milestoneStatusEnum('status').notNull().default('pending'),
  dueDate: date('due_date'),
  completedDate: date('completed_date'),
  slaDays: integer('sla_days'),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workflowTasks = pgTable('workflow_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  milestoneId: uuid('milestone_id').references(() => milestones.id),
  title: text('title').notNull(),
  description: text('description'),
  status: workflowTaskStatusEnum('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id),
  assignedBy: uuid('assigned_by').references(() => userProfiles.id),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  actorId: uuid('actor_id').references(() => userProfiles.id),
  actorRole: userRoleEnum('actor_role'),
  actorIp: inet('actor_ip'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Document tables
// ---------------------------------------------------------------------------

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  classification: documentClassificationEnum('classification').notNull(),
  status: documentStatusEnum('status').notNull().default('initiated'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  minioObjectKey: text('minio_object_key').notNull(),
  contentHash: text('content_hash'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => userProfiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Notification tables
// ---------------------------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  category: notificationCategoryEnum('category').notNull().default('general'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Award tables
// ---------------------------------------------------------------------------

export const awards = pgTable('awards', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parcelId: uuid('parcel_id').notNull().references(() => parcels.id, { onDelete: 'cascade' }),
  assessedAmount: doublePrecision('assessed_amount'),
  awardDate: date('award_date'),
  status: awardStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Payment tables
// ---------------------------------------------------------------------------

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  awardId: uuid('award_id').notNull().references(() => awards.id, { onDelete: 'cascade' }),
  paidAmount: doublePrecision('paid_amount'),
  externalReference: text('external_reference'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
