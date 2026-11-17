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

/** Body of GET /api/student/me. */
export interface CurrentStudent {
  student: { id: string; name: string; className: string | null; schoolName: string; username: string };
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
