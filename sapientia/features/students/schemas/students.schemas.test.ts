import { describe, expect, it } from 'vitest';
import { addStudentsSchema, updateStudentSchema } from './students.schemas';

const CLASS_ID = '00000000-0000-4000-8000-000000000001';

const reasons = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]));

describe('pupil schemas: no MyKad numbers', () => {
  it.each(['010203/14/5678', 'IC010203145678', '010203-14-5678'])('refuse %s as a school number', (schoolNumber) => {
    const result = addStudentsSchema.safeParse({ classId: CLASS_ID, students: [{ name: 'Ali', schoolNumber }] });
    expect(reasons(result)).toEqual({ 'students.0.schoolNumber': 'looks_like_mykad' });
    expect(reasons(updateStudentSchema.safeParse({ schoolNumber }))).toEqual({ schoolNumber: 'looks_like_mykad' });
  });

  it('keep normal school numbers', () => {
    const result = addStudentsSchema.safeParse({ classId: CLASS_ID, students: [{ name: 'Ali', schoolNumber: 'M2027/02' }] });
    expect(result.success).toBe(true);
  });
});
