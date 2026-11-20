import { z } from 'zod';
import { requireUser } from '@/features/auth/server/current-user.service';
import { openFile } from '@/features/files/server/files.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { contentDisposition } from '@/shared/server/files/file-type.service';

/**
 * GET /api/files/:id: an uploaded file, after the check of who may see it (features/files/server/files.service.ts). Pictures
 * open in place; anything else downloads. The sandbox policy stops a file ever running as part of the site.
 */
export const GET = withApi(async (request, context: RouteContext<'/api/files/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const { file, bytes } = await openFile(actor, id.data);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': contentDisposition(file.fileName, file.contentType),
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
});
