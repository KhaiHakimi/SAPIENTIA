import { describe, expect, it } from 'vitest';
import { addGuardianSchema, updateGuardianSchema } from './guardians.schemas';

const STUDENT_ID = '00000000-0000-4000-8000-000000000001';

describe('guardian name: no MyKad numbers', () => {
  it.each(['Rahman bin Ismail 850101-14-5566', 'Rahman IC 850101 14 5566', 'Rahman 8501 0114 5566'])('refuses %s', (name) => {
    const added = addGuardianSchema.safeParse({ name, studentId: STUDENT_ID, relationship: 'father' });
    expect(added.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([['name', 'name_has_mykad']]);
    const renamed = updateGuardianSchema.safeParse({ name });
    expect(renamed.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([['name', 'name_has_mykad']]);
  });

  it('keeps an ordinary name', () => {
    expect(addGuardianSchema.safeParse({ name: 'Rahman bin Ismail', studentId: STUDENT_ID, relationship: 'father' }).success).toBe(true);
  });
});
