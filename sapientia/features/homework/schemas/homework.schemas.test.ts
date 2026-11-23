import { describe, expect, it } from 'vitest';
import { addCommentSchema } from './homework.schemas';

const STUDENT_ID = '00000000-0000-4000-8000-000000000001';

describe('addCommentSchema', () => {
  it.each(['IC 010203 14 5678', '010203.14.5678', '010203–14–5678', 'IC010203145678', '010203-14-5678'])(
    'refuses a note holding %s',
    (number) => {
      const result = addCommentSchema.safeParse({ studentId: STUDENT_ID, body: `Nombor ibu ${number}` });
      expect(result.error?.issues.map((issue) => issue.message)).toEqual(['looks_like_mykad']);
    },
  );

  it('keeps an ordinary note with numbers in it', () => {
    expect(addCommentSchema.safeParse({ studentId: STUDENT_ID, body: 'Semak soalan 4 hingga 12, hantar 24/03/2027.' }).success).toBe(true);
  });
});
