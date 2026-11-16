import { requireUser } from '@/features/auth/server/current-user.service';
import { addStudentsSchema, studentListQuerySchema } from '@/features/students/schemas/students.schemas';
import { addStudents, listSchoolStudents } from '@/features/students/server/students.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { pageQuerySchema } from '@/shared/server/pagination';

const listQuerySchema = pageQuerySchema.extend(studentListQuerySchema.shape);

/** GET /api/students?classId=&limit=&cursor=: the school's pupils by name. Administrators only; anyone else gets 404. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const { classId, limit, cursor } = readQuery(request, listQuerySchema);
  return Response.json(await listSchoolStudents(actor, classId ?? null, limit, cursor));
});

/**
 * POST /api/students: { classId, students: [{ name, schoolNumber? }] } → 201 with the pupils and a slip each. The starting
 * passwords are in this response only. Administrators only.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, addStudentsSchema);
  return Response.json(await addStudents(actor, input, appClock()), { status: 201 });
});
