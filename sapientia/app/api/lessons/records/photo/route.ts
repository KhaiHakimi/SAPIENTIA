import { requireUser } from '@/features/auth/server/current-user.service';
import { LESSON_PHOTO_MAX_BYTES } from '@/features/lessons/constants/lessons.constants';
import { lessonTargetSchema } from '@/features/lessons/schemas/lesson.schemas';
import { addLessonPhoto, removeLessonPhoto } from '@/features/lessons/server/lessons.service';
import { readFormFields, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { readUpload } from '@/shared/server/files/upload.service';

/**
 * POST /api/lessons/records/photo: a multipart form with slotId, onDate and photo (JPEG or PNG, up to 5 MB). Adds a photo to
 * a lesson record, replacing any photo there. Only the record's recorder, while it is still open; anyone else gets 404.
 */
export const POST = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  const { file, fields } = await readUpload(request, { field: 'photo', maxBytes: LESSON_PHOTO_MAX_BYTES, kinds: ['jpeg', 'png'] });
  const target = readFormFields(fields, lessonTargetSchema);
  return Response.json(await addLessonPhoto(actor, target, file, clock), { status: 201 });
});

/** DELETE /api/lessons/records/photo?slotId=&onDate=: removes the photo from a lesson record. */
export const DELETE = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  await removeLessonPhoto(actor, readQuery(request, lessonTargetSchema), clock);
  return new Response(null, { status: 204 });
});
