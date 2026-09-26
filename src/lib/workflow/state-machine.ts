/**
 * RFCTLARR Act 2013 — Legal State Machine
 *
 * Defines the legal stages of land acquisition per the
 * Right to Fair Compensation and Transparency in Land Acquisition,
 * Rehabilitation and Resettlement Act, 2013.
 *
 * Each stage maps to a projectStatusEnum value and defines:
 *   - the next stage(s) on approval
 *   - the task title created when the stage is entered
 *   - SLA in days
 *   - the minimum role required to advance
 */

import type { InferSelectModel } from 'drizzle-orm';
import type { projects } from '@/lib/db/schema';

export type ProjectStatus = InferSelectModel<typeof projects>['status'];

/** Describes a single stage in the acquisition lifecycle. */
export interface AcquisitionStage {
  /** projectStatusEnum value for this stage */
  status: ProjectStatus;
  /** Human-readable label */
  label: string;
  /** RFCTLARR Act section reference (for display) */
  section: string;
  /** Task title created when entering this stage */
  taskTitle: string;
  /** Task description */
  taskDescription: string;
  /** SLA in calendar days for the task */
  slaDays: number;
  /** Minimum role that may advance this stage */
  minimumRole: string;
  /** Status to transition to on approval */
  nextOnApproval: ProjectStatus | null;
  /** Status to transition to on rejection (null = stay) */
  nextOnRejection: ProjectStatus | null;
  /** Sort order for timeline display */
  sortOrder: number;
}

/**
 * The ordered lifecycle stages.
 *
 * draft → submitted → under_scrutiny → clarification_requested →
 * approved → notification_issued → award_declared →
 * compensation_assessed → possession_taken → closed
 *
 * `clarification_requested` is a loop-back to `under_scrutiny`.
 */
export const ACQUISITION_STAGES: AcquisitionStage[] = [
  {
    status: 'draft',
    label: 'Draft',
    section: '—',
    taskTitle: 'Prepare Proposal',
    taskDescription: 'Complete the land acquisition project proposal with all required details.',
    slaDays: 30,
    minimumRole: 'project_manager',
    nextOnApproval: 'submitted',
    nextOnRejection: null,
    sortOrder: 0,
  },
  {
    status: 'submitted',
    label: 'Submitted for Scrutiny',
    section: 'Section 4',
    taskTitle: 'Preliminary Notification & Scrutiny',
    taskDescription: 'Review the submitted proposal, verify documents, and issue preliminary notification under Section 4.',
    slaDays: 14,
    minimumRole: 'district_officer',
    nextOnApproval: 'under_scrutiny',
    nextOnRejection: 'rejected',
    sortOrder: 1,
  },
  {
    status: 'under_scrutiny',
    label: 'Under Scrutiny',
    section: 'Section 5-8',
    taskTitle: 'Social Impact Assessment & Scrutiny',
    taskDescription: 'Conduct Social Impact Assessment, public hearings, and expert appraisal under Sections 5-8.',
    slaDays: 60,
    minimumRole: 'state_officer',
    nextOnApproval: 'approved',
    nextOnRejection: 'clarification_requested',
    sortOrder: 2,
  },
  {
    status: 'clarification_requested',
    label: 'Clarification Requested',
    section: 'Section 8',
    taskTitle: 'Respond to Clarification',
    taskDescription: 'Address the clarifications raised during scrutiny and resubmit evidence.',
    slaDays: 14,
    minimumRole: 'project_manager',
    nextOnApproval: 'under_scrutiny', // loops back
    nextOnRejection: 'rejected',
    sortOrder: 3,
  },
  {
    status: 'approved',
    label: 'Approved – Section 11 Declaration',
    section: 'Section 11-14',
    taskTitle: 'Issue Section 11 Declaration',
    taskDescription: 'Issue declaration under Section 11 identifying land needed. Conduct survey & census of affected families.',
    slaDays: 30,
    minimumRole: 'state_officer',
    nextOnApproval: 'notification_issued',
    nextOnRejection: null,
    sortOrder: 4,
  },
  {
    status: 'notification_issued',
    label: 'Notification Issued – Section 19',
    section: 'Section 19',
    taskTitle: 'Issue Section 19 Final Decision',
    taskDescription: 'Issue notification under Section 19 confirming the final decision to acquire. Record objections.',
    slaDays: 21,
    minimumRole: 'state_officer',
    nextOnApproval: 'award_declared',
    nextOnRejection: null,
    sortOrder: 5,
  },
  {
    status: 'award_declared',
    label: 'Award Declared – Section 23-30',
    section: 'Section 23-30',
    taskTitle: 'Prepare & Declare Award',
    taskDescription: 'Determine compensation, prepare the final award under Section 23, and declare it. Calculate R&R entitlements.',
    slaDays: 30,
    minimumRole: 'district_officer',
    nextOnApproval: 'compensation_assessed',
    nextOnRejection: null,
    sortOrder: 6,
  },
  {
    status: 'compensation_assessed',
    label: 'Compensation Assessed – Section 31-37',
    section: 'Section 31-37',
    taskTitle: 'Disburse Compensation & R&R',
    taskDescription: 'Disburse compensation to landowners. Execute Rehabilitation & Resettlement entitlements per Section 31-37.',
    slaDays: 60,
    minimumRole: 'district_officer',
    nextOnApproval: 'possession_taken',
    nextOnRejection: null,
    sortOrder: 7,
  },
  {
    status: 'possession_taken',
    label: 'Possession Taken – Section 38',
    section: 'Section 38',
    taskTitle: 'Take Possession of Land',
    taskDescription: 'Take physical possession of the acquired land after completing all compensation and R&R obligations.',
    slaDays: 14,
    minimumRole: 'district_officer',
    nextOnApproval: 'closed',
    nextOnRejection: null,
    sortOrder: 8,
  },
  {
    status: 'closed',
    label: 'Acquisition Complete',
    section: '—',
    taskTitle: 'Archive Case',
    taskDescription: 'All obligations fulfilled. Land acquisition process is complete.',
    slaDays: 0,
    minimumRole: 'admin',
    nextOnApproval: null,
    nextOnRejection: null,
    sortOrder: 9,
  },
];

/** Look up stage definition by status. */
export function getStage(status: ProjectStatus): AcquisitionStage | undefined {
  return ACQUISITION_STAGES.find(s => s.status === status);
}

/** Get allowed transitions from a status. */
export function getNextStatus(
  currentStatus: ProjectStatus,
  action: 'approve' | 'reject'
): ProjectStatus | null {
  const stage = getStage(currentStatus);
  if (!stage) return null;
  return action === 'approve' ? stage.nextOnApproval : stage.nextOnRejection;
}

/** Get progress percentage (0-100) for a given status. */
export function getProgressPercentage(status: ProjectStatus): number {
  const stage = getStage(status);
  if (!stage) return 0;
  const total = ACQUISITION_STAGES.length - 1; // exclude 'closed' from denominator
  return Math.round((stage.sortOrder / total) * 100);
}

/** Get all stages up to and including the given status. */
export function getCompletedStages(status: ProjectStatus): AcquisitionStage[] {
  const stage = getStage(status);
  if (!stage) return [];
  return ACQUISITION_STAGES.filter(s => s.sortOrder <= stage.sortOrder);
}
