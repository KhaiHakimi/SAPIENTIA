import { apiFetch } from '@/shared/api/api-client';
import type { ChangeStudentPasswordRequest, CurrentStudent, StudentSignInRequest } from '../interfaces/student.interface';

/** Browser side of pupil sign-in: the server sets the HttpOnly pupil cookie, then /api/student/me says who is signed in. */

export const CURRENT_STUDENT_KEY = ['student', 'me'] as const;

export async function signInStudent(input: StudentSignInRequest): Promise<CurrentStudent> {
  await apiFetch<void>('/api/auth/student-login', { method: 'POST', body: input });
  return fetchCurrentStudent();
}

export function fetchCurrentStudent(): Promise<CurrentStudent> {
  return apiFetch<CurrentStudent>('/api/student/me');
}

export function changeStudentPassword(input: ChangeStudentPasswordRequest): Promise<void> {
  return apiFetch<void>('/api/student/password', { method: 'PUT', body: input });
}

export function signOutStudent(): Promise<void> {
  return apiFetch<void>('/api/auth/student-logout', { method: 'POST' });
}
