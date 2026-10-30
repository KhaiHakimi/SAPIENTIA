import type { StaffRole, StaffStatus } from '@/features/auth/interfaces/session-user.interface';

/** A row of GET /api/users (administrators only). */
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  lastSignInAt: string | null;
}

/** A row of GET /api/staff: what a sender needs to pick assignees. No email, no status. */
export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

export interface InviteUserRequest {
  email: string;
  name: string;
  role: StaffRole;
}

/** The link is shown once to the administrator to pass on; email sending arrives in Sprint 5. */
export interface InviteUserResult {
  user: StaffUser;
  inviteUrl: string;
  expiresAt: string;
}
