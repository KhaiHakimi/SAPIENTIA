import { apiFetch } from '@/shared/api/api-client';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type {
  AddStudentsRequest,
  AddStudentsResult,
  SchoolStudent,
  StudentSlip,
  UpdateStudentRequest,
} from '../interfaces/student.interface';

export const STUDENTS_ROOT_KEY = ['students'] as const;
export const studentsKey = (classId: string) => [...STUDENTS_ROOT_KEY, classId] as const;

/** One page of pupils; the guardian form's pupil list asks for a whole class at once (limit 100, the API's maximum). */
export function fetchStudentsPage(classId: string, cursor: string | null, limit = 25): Promise<Page<SchoolStudent>> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (classId) query.set('classId', classId);
  if (cursor) query.set('cursor', cursor);
  return apiFetch(`/api/students?${query.toString()}`);
}

export function addStudents(input: AddStudentsRequest): Promise<AddStudentsResult> {
  return apiFetch('/api/students', { method: 'POST', body: input });
}

export function updateStudent(id: string, input: UpdateStudentRequest): Promise<SchoolStudent> {
  return apiFetch(`/api/students/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export function resetStudentPassword(id: string): Promise<StudentSlip> {
  return apiFetch(`/api/students/${encodeURIComponent(id)}/password-reset`, { method: 'POST' });
}

export function removeStudent(id: string): Promise<void> {
  return apiFetch(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
