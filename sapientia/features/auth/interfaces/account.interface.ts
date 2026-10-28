import type { ProgressBaseline, Student } from '@/features/student-dashboard/interfaces/student.interface';

export type AccountRole = 'student' | 'teacher';

interface AccountBase {
  id: string;
  email: string;
  /** Demo only: kept in plain text in the bundle. The real check happens on the server once the API exists. */
  password: string;
}

export interface StudentAccount extends AccountBase {
  role: 'student';
  student: Student;
  /** Where this student's XP, coins and streak start on each visit. */
  baseline: ProgressBaseline;
}

export interface TeacherAccount extends AccountBase {
  role: 'teacher';
  name: string;
}

export type DemoAccount = StudentAccount | TeacherAccount;

export type LoginFieldError = 'emailRequired' | 'emailInvalid' | 'passwordRequired';

export interface LoginFieldErrors {
  email?: LoginFieldError;
  password?: LoginFieldError;
}
