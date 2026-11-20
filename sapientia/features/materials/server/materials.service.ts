import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { CheckedUpload } from '@/shared/interfaces/stored-file.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { deleteStoredFile } from '@/shared/server/files/stored-files.repository';
import { discardBytes, storeUpload } from '@/shared/server/files/upload.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import type { Material, MaterialFilters, MaterialPage, NewMaterial } from '../interfaces/material.interface';
import { deleteMaterial, findMaterial, insertMaterial, listMaterials, type MaterialRow, subjectExists } from './materials.repository';

/**
 * The shared material bank (plan Phase 3): links, preferred so DELIMa content is linked rather than copied, and uploaded
 * files, tagged by subject, year or form, and topic. Every member of staff can read and add; the person who added an item
 * and administrators can remove it. The audit log records what was added or removed, not its title.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toMaterial(row: MaterialRow, actor: SessionUser): Material {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subject: row.subject_id && row.subject_name ? { id: row.subject_id, name: row.subject_name } : null,
    level: row.level,
    topic: row.topic,
    url: row.url,
    file: row.file_id && row.file_name && row.content_type && row.byte_size !== null
      ? { id: row.file_id, fileName: row.file_name, contentType: row.content_type, byteSize: row.byte_size }
      : null,
    createdBy: { id: row.created_by, name: row.creator_name },
    createdAt: row.created_at.toISOString(),
    canRemove: row.created_by === actor.id || actor.role === 'admin',
  };
}

/** The cursor came back from the client, so its contents are checked before they reach SQL. */
function readCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  const decoded = decodeCursor(cursor);
  if (!decoded) return null;
  if (Number.isNaN(Date.parse(decoded.sortValue)) || !UUID.test(decoded.id)) throw new ValidationError({ cursor: 'invalid_cursor' });
  return { createdAt: decoded.sortValue, id: decoded.id };
}

export async function listSchoolMaterials(
  actor: SessionUser,
  query: MaterialFilters & { limit: number; cursor?: string },
): Promise<MaterialPage> {
  const rows = await listMaterials(getPool(), actor.schoolId, query, readCursor(query.cursor), query.limit + 1);
  return toPage(rows, query.limit, (row) => toMaterial(row, actor), (row) => encodeCursor(row.created_at.toISOString(), row.id));
}

async function insertChecked(
  client: Queryable,
  actor: SessionUser,
  input: NewMaterial,
  source: { url: string | null; fileId: string | null },
  now: Date,
): Promise<Material> {
  if (input.subjectId && !(await subjectExists(client, actor.schoolId, input.subjectId))) {
    throw new ValidationError({ subjectId: 'invalid_subject' });
  }
  const id = await insertMaterial(client, actor.schoolId, {
    createdBy: actor.id, title: input.title, description: input.description ?? null, subjectId: input.subjectId ?? null,
    level: input.level ?? null, topic: input.topic ?? null, url: source.url, fileId: source.fileId, now,
  });
  await writeAudit(client, actor.schoolId, [{
    actorId: actor.id, action: 'material.added', entityType: 'material', entityId: id, metadata: { kind: source.url ? 'link' : 'file' },
  }]);
  return toMaterial((await findMaterial(client, actor.schoolId, id)) as MaterialRow, actor);
}

/** Adds a link to the bank. */
export async function addMaterialLink(actor: SessionUser, input: NewMaterial & { url: string }, clock: Clock): Promise<Material> {
  return withTransaction((client) => insertChecked(client, actor, input, { url: input.url, fileId: null }, clock.now()));
}

/** Adds an uploaded file to the bank, with its tags. */
export async function addMaterialFile(actor: SessionUser, input: NewMaterial, file: CheckedUpload, clock: Clock): Promise<Material> {
  const now = clock.now();
  return storeUpload(actor, { file, purpose: 'material', field: 'file', now }, (client, fileId) =>
    insertChecked(client, actor, input, { url: null, fileId }, now));
}

/** Removes a material and its file. Only the person who added it, or an administrator; anyone else gets 404. */
export async function removeMaterial(actor: SessionUser, materialId: string): Promise<void> {
  const key = await withTransaction(async (client) => {
    const material = await findMaterial(client, actor.schoolId, materialId);
    if (!material || !toMaterial(material, actor).canRemove) throw new NotFoundError();
    const removed = await deleteMaterial(client, actor.schoolId, materialId);
    const fileKey = removed?.fileId ? await deleteStoredFile(client, actor.schoolId, removed.fileId) : null;
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'material.removed', entityType: 'material', entityId: materialId,
      metadata: { kind: material.url ? 'link' : 'file' },
    }]);
    return fileKey;
  });
  await discardBytes([key]);
}
