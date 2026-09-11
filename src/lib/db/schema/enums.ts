import { pgEnum } from 'drizzle-orm/pg-core';

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
