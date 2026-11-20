import { requireUser } from '@/features/auth/server/current-user.service';
import { MATERIAL_FILE_KINDS, MATERIAL_FILE_MAX_BYTES } from '@/features/materials/constants/materials.constants';
import {
  materialListQuerySchema, newMaterialFileFieldsSchema, newMaterialLinkSchema,
} from '@/features/materials/schemas/material.schemas';
import { addMaterialFile, addMaterialLink, listSchoolMaterials } from '@/features/materials/server/materials.service';
import { readFormFields, readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { readUpload } from '@/shared/server/files/upload.service';

/** GET /api/materials?subjectId=&level=&q=&limit=&cursor=: the school's material bank, newest first. Any member of staff. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await listSchoolMaterials(actor, readQuery(request, materialListQuerySchema)));
});

/**
 * POST /api/materials. As JSON, { title, url, description?, subjectId?, level?, topic? } adds a link. As a multipart form,
 * the same fields without url plus `file` (PDF, Word, Excel, PowerPoint, JPEG or PNG, up to 10 MB) add a file.
 */
export const POST = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  if (request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
    const { file, fields } = await readUpload(request, { field: 'file', maxBytes: MATERIAL_FILE_MAX_BYTES, kinds: MATERIAL_FILE_KINDS });
    const input = readFormFields(fields, newMaterialFileFieldsSchema);
    return Response.json(await addMaterialFile(actor, input, file, clock), { status: 201 });
  }
  const input = await readJson(request, newMaterialLinkSchema);
  return Response.json(await addMaterialLink(actor, input, clock), { status: 201 });
});
