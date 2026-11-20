import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { canSeeLessonPhoto } from '@/features/lessons/server/lessons.repository';
import { isMaterialFile } from '@/features/materials/server/materials.repository';
import type { StoredFile } from '@/shared/interfaces/stored-file.interface';
import { NotFoundError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { readBytes } from '@/shared/server/files/file-storage.service';
import { findStoredFile } from '@/shared/server/files/stored-files.repository';

/**
 * Who may open an uploaded file depends on what it is for. A material is for everyone on the school's staff. A lesson photo
 * is for the same people as its lesson record: whoever recorded it and the period's own teacher. Anyone else, another
 * school included, gets 404, as does a file that is not attached to anything (yet).
 */
async function maySee(db: Queryable, actor: SessionUser, file: StoredFile): Promise<boolean> {
  switch (file.purpose) {
    case 'material':
      return isMaterialFile(db, actor.schoolId, file.id);
    case 'lesson_photo':
      return canSeeLessonPhoto(db, actor.schoolId, file.id, actor.id);
  }
}

export async function openFile(actor: SessionUser, fileId: string): Promise<{ file: StoredFile; bytes: Buffer }> {
  const db = getPool();
  const file = await findStoredFile(db, actor.schoolId, fileId);
  if (!file || !(await maySee(db, actor, file))) throw new NotFoundError();
  return { file, bytes: await readBytes(file.storageKey) };
}
