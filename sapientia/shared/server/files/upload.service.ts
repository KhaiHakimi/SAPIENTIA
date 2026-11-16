import 'server-only';
import { createHash } from 'node:crypto';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { CheckedUpload, FileKind, StoredFilePurpose } from '@/shared/interfaces/stored-file.interface';
import { ValidationError } from '@/shared/server/app-errors';
import { withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { PoolClient } from 'pg';
import { CONTENT_TYPES, cleanFileName, detectFileKind } from './file-type.service';
import { MalformedImageError, stripJpegMetadata, stripPngMetadata } from './image-metadata.service';
import { removeBytes, saveBytes } from './file-storage.service';
import { insertStoredFile, sumSchoolBytes } from './stored-files.repository';

/** All uploads together, per school. A judgement for a pilot; revisit with hosting (D5). */
export const SCHOOL_STORAGE_LIMIT_BYTES = 2 * 1024 ** 3;
/** Room for the form's other fields and the multipart framing around the file. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

export interface UploadRules {
  /** The form field holding the file; refusals are reported against it. */
  field: string;
  maxBytes: number;
  kinds: readonly FileKind[];
}

export interface UploadForm {
  file: CheckedUpload;
  /** The form's other fields, as text, for the caller's own schema. */
  fields: Record<string, string>;
}

/**
 * Reads a multipart form with one file and checks the file: size (from the Content-Length before anything is read, and
 * again from the file), kind (from the bytes), and a clean name. Metadata is removed from pictures. Nothing is stored yet.
 */
export async function readUpload(request: Request, rules: UploadRules): Promise<UploadForm> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
    throw new ValidationError({ body: 'multipart_required' }, 'Send the file as multipart/form-data.');
  }
  const declared = Number(request.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared <= 0) throw new ValidationError({ body: 'length_required' }, 'The request has no length.');
  if (declared > rules.maxBytes + FORM_OVERHEAD_BYTES) throw new ValidationError({ [rules.field]: 'file_too_large' });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ValidationError({ body: 'invalid_form' }, 'The form could not be read.');
  }
  const entry = form.get(rules.field);
  if (!(entry instanceof File) || entry.size === 0) throw new ValidationError({ [rules.field]: 'file_required' });
  if (entry.size > rules.maxBytes) throw new ValidationError({ [rules.field]: 'file_too_large' });

  const raw = new Uint8Array(await entry.arrayBuffer());
  const kind = detectFileKind(raw, entry.name);
  if (!kind || !rules.kinds.includes(kind)) throw new ValidationError({ [rules.field]: 'file_type' });
  let bytes: Uint8Array = raw;
  try {
    if (kind === 'jpeg') bytes = stripJpegMetadata(raw);
    if (kind === 'png') bytes = stripPngMetadata(raw);
  } catch (error) {
    if (error instanceof MalformedImageError) throw new ValidationError({ [rules.field]: 'file_type' });
    throw error;
  }

  const fields: Record<string, string> = {};
  for (const [name, value] of form.entries()) if (name !== rules.field && typeof value === 'string') fields[name] = value;
  return { file: { bytes, kind, contentType: CONTENT_TYPES[kind], fileName: cleanFileName(entry.name, kind) }, fields };
}

/**
 * Stores a checked upload and runs `attach` in the same transaction, with the new file's id. The bytes are written first; if
 * the school's storage limit is reached, or `attach` or the commit fails, they are removed again, so no file is left without a
 * record.
 */
export async function storeUpload<T>(
  actor: SessionUser,
  upload: { file: CheckedUpload; purpose: StoredFilePurpose; field: string; now: Date },
  attach: (client: PoolClient, fileId: string) => Promise<T>,
): Promise<T> {
  const { file } = upload;
  const key = await saveBytes(file.bytes);
  try {
    return await withTransaction(async (client) => {
      if ((await sumSchoolBytes(client, actor.schoolId)) + file.bytes.byteLength > SCHOOL_STORAGE_LIMIT_BYTES) {
        throw new ValidationError({ [upload.field]: 'school_storage_full' });
      }
      const fileId = await insertStoredFile(client, actor.schoolId, {
        uploadedBy: actor.id, purpose: upload.purpose, storageKey: key, contentType: file.contentType, byteSize: file.bytes.byteLength,
        fileName: file.fileName, sha256: createHash('sha256').update(file.bytes).digest(), now: upload.now,
      });
      return attach(client, fileId);
    });
  } catch (error) {
    await discardBytes([key]);
    throw error;
  }
}

/**
 * Removes the bytes of files whose records are already gone. A failure is logged, not thrown: the change the user asked
 * for has been committed, and an unreferenced file on disk is unreachable through the app.
 */
export async function discardBytes(keys: readonly (string | null)[]): Promise<void> {
  for (const key of keys) {
    if (!key) continue;
    try {
      await removeBytes(key);
    } catch (error) {
      logger.error('files.remove_failed', { error });
    }
  }
}
