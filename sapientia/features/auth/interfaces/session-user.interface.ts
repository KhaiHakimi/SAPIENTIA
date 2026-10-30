export type StaffRole = 'admin' | 'sender' | 'teacher';
export type StaffStatus = 'invited' | 'active' | 'disabled';

/** The signed-in staff member, as the server resolves it from the session cookie. Body of GET /api/me. */
export interface SessionUser {
  id: string;
  schoolId: string;
  schoolName: string;
  email: string;
  name: string;
  role: StaffRole;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
}
