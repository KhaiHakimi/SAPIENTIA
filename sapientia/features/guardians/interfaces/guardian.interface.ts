import type { ClassHomework, PupilHomework } from '@/features/homework/interfaces/homework.interface';
import type { StudentStatus } from '@/features/students/interfaces/student.interface';
import type { ClassWeek } from '@/features/timetable/interfaces/timetable.interface';
import type {
  GUARDIAN_RELATIONSHIPS,
  LINK_REFUSAL_REASONS,
  LINK_REMOVAL_REASONS,
} from '../constants/guardians.constants';

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
export type LinkRefusalReason = (typeof LINK_REFUSAL_REASONS)[number];
export type LinkRemovalReason = (typeof LINK_REMOVAL_REASONS)[number];
export type LinkStatus = 'active' | 'refused' | 'removed';

/** One link as the administrator sees it, including ones that ended (with the reason code). */
export interface GuardianLink {
  id: string;
  student: { id: string; name: string; className: string };
  relationship: GuardianRelationship;
  status: LinkStatus;
  endReason: LinkRefusalReason | LinkRemovalReason | null;
  /** ISO time the link was refused or removed; null while active. */
  endedAt: string | null;
}

/** A guardian as the administrator sees them. No sign-in times. */
export interface SchoolGuardian {
  id: string;
  name: string;
  username: string;
  status: StudentStatus;
  /** False until the guardian has replaced the starting password from their slip. */
  hasOwnPassword: boolean;
  links: GuardianLink[];
}

/** POST /api/guardians: a guardian always starts with one link. */
export interface AddGuardianRequest {
  name: string;
  studentId: string;
  relationship: GuardianRelationship;
}

/** PATCH /api/guardians/:id. */
export interface UpdateGuardianRequest {
  name?: string;
  status?: StudentStatus;
}

/** POST /api/guardians/:id/links. */
export interface AddLinkRequest {
  studentId: string;
  relationship: GuardianRelationship;
}

/** PATCH /api/guardians/:id/links/:linkId: the administrator removes a link. */
export interface RemoveLinkRequest {
  reason: LinkRemovalReason;
}

/** POST /api/guardian/links/:linkId/refusal: the guardian refuses a link. */
export interface RefuseLinkRequest {
  reason: LinkRefusalReason;
}

/** A guardian's printed slip. The starting password is in this response only; the server keeps its hash. */
export interface GuardianSlip {
  guardianId: string;
  name: string;
  /** The children linked when the slip was made, so the guardian knows which school account this is. */
  children: string[];
  username: string;
  startingPassword: string;
  expiresAt: string;
}

export interface AddGuardianResult {
  guardian: SchoolGuardian;
  slip: GuardianSlip;
}

/** The signed-in guardian, as the server resolves it from the guardian session cookie. */
export interface SessionGuardian {
  id: string;
  schoolId: string;
  schoolName: string;
  timeZone: string;
  name: string;
  username: string;
  mustChangePassword: boolean;
}

/** GET /api/guardian/me. */
export interface CurrentGuardian {
  guardian: { id: string; name: string; schoolName: string; timeZone: string; username: string };
  mustChangePassword: boolean;
}

export interface GuardianSignInRequest {
  username: string;
  password: string;
}

export interface ChangeGuardianPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * One child as their guardian sees them. linkId is the handle for this child in every guardian request: the pupil's own id
 * is never sent to a guardian.
 */
export interface GuardianChild {
  linkId: string;
  name: string;
  className: string | null;
  relationship: GuardianRelationship;
  homework: PupilHomework[];
}

/** GET /api/guardian/children. */
export interface GuardianChildren {
  children: GuardianChild[];
}

/** One child on the printed summary: the class's homework (no hand-ins) and one week's timetable. */
export interface GuardianSummaryChild {
  name: string;
  className: string | null;
  homework: ClassHomework[];
  week: ClassWeek;
}

/**
 * GET /api/guardians/:id/summary: a sheet an administrator prints for a guardian without a smartphone. Hand-ins are left out:
 * they stay with the teacher who set the work, and the guardian sees them when they sign in.
 */
export interface GuardianSummary {
  guardianName: string;
  schoolName: string;
  timeZone: string;
  generatedAt: string;
  homeworkFrom: string;
  homeworkTo: string;
  children: GuardianSummaryChild[];
}
