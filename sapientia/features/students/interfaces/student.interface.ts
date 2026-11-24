export type StudentStatus = 'active' | 'disabled';

/** A pupil as the administrator sees them. No sign-in times: the school does not watch when a child uses the app. */
export interface SchoolStudent {
  id: string;
  name: string;
  schoolNumber: string | null;
  classId: string;
  className: string;
  username: string;
  status: StudentStatus;
  /** False until the pupil has replaced the starting password from their slip. */
  hasOwnPassword: boolean;
}

export interface NewStudentRow {
  name: string;
  schoolNumber?: string | null;
}

/** Why a pasted class-list line cannot be read; shown against the line, and nothing is sent until it is fixed. */
export type ClassListProblem = 'too_many_values';

/** One pupil read from a pasted line, with the line number (from 1) so problems can be shown against it. */
export interface ParsedPupil extends NewStudentRow {
  line: number;
  problem?: ClassListProblem;
}

/** Body of POST /api/students. */
export interface AddStudentsRequest {
  classId: string;
  students: NewStudentRow[];
}

/** What goes on a printed slip. The starting password is in this response only; the server keeps its hash. */
export interface StudentSlip {
  studentId: string;
  name: string;
  className: string;
  username: string;
  startingPassword: string;
  /** ISO time after which the starting password no longer works. */
  expiresAt: string;
}

export interface AddStudentsResult {
  students: SchoolStudent[];
  slips: StudentSlip[];
}

/** Body of PATCH /api/students/:id; any of the fields. */
export interface UpdateStudentRequest {
  name?: string;
  schoolNumber?: string | null;
  classId?: string;
  status?: StudentStatus;
}

/** The signed-in pupil, as the server resolves it from the pupil session cookie. */
export interface SessionStudent {
  id: string;
  schoolId: string;
  schoolName: string;
  timeZone: string;
  name: string;
  classId: string | null;
  className: string | null;
  username: string;
  mustChangePassword: boolean;
}

/** Body of GET /api/student/me. timeZone is the school's, so the board's "today" and "now" are the school's wherever the device is. */
export interface CurrentStudent {
  student: { id: string; name: string; className: string | null; schoolName: string; timeZone: string; username: string };
  mustChangePassword: boolean;
}

export interface StudentSignInRequest {
  username: string;
  password: string;
}

export interface ChangeStudentPasswordRequest {
  currentPassword: string;
  newPassword: string;
}
