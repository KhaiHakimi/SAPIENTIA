import 'server-only';
import type { StoredFile, StoredFilePurpose } from '@/shared/interfaces/stored-file.interface';
import type { Queryable } from '@/shared/server/database.service';

/** Every function takes schoolId first and filters on it. */

interface StoredFileRow {
  id: string;
  purpose: StoredFilePurpose;
  storage_key: string;
  content_type: string;
  byte_size: number;
  file_name: string;
}

const toStoredFile = (row: StoredFileRow): StoredFile => ({
  id: row.id,
  purpose: row.purpose,
  storageKey: row.storage_key,
  contentType: row.content_type,
  byteSize: row.byte_size,
  fileName: row.file_name,
});

export interface NewStoredFileRow {
  uploadedBy: string;
  purpose: StoredFilePurpose;
  storageKey: string;
  contentType: string;
  byteSize: number;
  fileName: string;
  sha256: Buffer;
  now: Date;
}

export async function insertStoredFile(db: Queryable, schoolId: string, file: NewStoredFileRow): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO stored_files (school_id, uploaded_by, purpose, storage_key, content_type, byte_size, file_name, sha256, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [schoolId, file.uploadedBy, file.purpose, file.storageKey, file.contentType, file.byteSize, file.fileName, file.sha256, file.now],
  );
  return rows[0].id;
}

export async function findStoredFile(db: Queryable, schoolId: string, fileId: string): Promise<StoredFile | null> {
  const { rows } = await db.query<StoredFileRow>(
    'SELECT id, purpose, storage_key, content_type, byte_size, file_name FROM stored_files WHERE school_id = $1 AND id = $2',
    [schoolId, fileId],
  );
  return rows[0] ? toStoredFile(rows[0]) : null;
}

/** Deletes a file's record and returns its storage key, so the bytes can be removed once the transaction commits. */
export async function deleteStoredFile(db: Queryable, schoolId: string, fileId: string): Promise<string | null> {
  const { rows } = await db.query<{ storage_key: string }>(
    'DELETE FROM stored_files WHERE school_id = $1 AND id = $2 RETURNING storage_key',
    [schoolId, fileId],
  );
  return rows[0]?.storage_key ?? null;
}

/** Bytes the school has stored, for the storage limit. */
export async function sumSchoolBytes(db: Queryable, schoolId: string): Promise<number> {
  const { rows } = await db.query<{ total: string }>('SELECT COALESCE(sum(byte_size), 0)::text AS total FROM stored_files WHERE school_id = $1', [schoolId]);
  return Number(rows[0].total);
}
