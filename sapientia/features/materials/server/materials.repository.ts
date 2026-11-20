import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { MaterialFilters, MaterialLevel } from '../interfaces/material.interface';

/** Every function takes schoolId first and filters on it. */

export interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  subject_name: string | null;
  level: MaterialLevel | null;
  topic: string | null;
  url: string | null;
  file_id: string | null;
  file_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  created_by: string;
  creator_name: string;
  created_at: Date;
}

const MATERIAL_SELECT = `SELECT m.id, m.title, m.description, m.subject_id, sub.name AS subject_name, m.level, m.topic, m.url,
    m.file_id, f.file_name, f.content_type, f.byte_size, m.created_by, u.name AS creator_name, m.created_at
  FROM materials m
  JOIN users u ON u.id = m.created_by AND u.school_id = m.school_id
  LEFT JOIN subjects sub ON sub.id = m.subject_id AND sub.school_id = m.school_id
  LEFT JOIN stored_files f ON f.id = m.file_id AND f.school_id = m.school_id`;

/** "50%_off" becomes a pattern that matches those characters literally, inside any longer text. */
const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;

/** Newest first, after a keyset cursor, optionally narrowed by subject, level and words in the title, topic or description. */
export async function listMaterials(
  db: Queryable,
  schoolId: string,
  filters: MaterialFilters,
  after: { createdAt: string; id: string } | null,
  limit: number,
): Promise<MaterialRow[]> {
  const { rows } = await db.query<MaterialRow>(
    `${MATERIAL_SELECT}
      WHERE m.school_id = $1
        AND ($2::uuid IS NULL OR m.subject_id = $2)
        AND ($3::material_level IS NULL OR m.level = $3)
        AND ($4::text IS NULL OR m.title ILIKE $4 OR m.topic ILIKE $4 OR m.description ILIKE $4)
        AND ($5::timestamptz IS NULL OR (m.created_at, m.id) < ($5, $6::uuid))
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $7`,
    [
      schoolId, filters.subjectId ?? null, filters.level ?? null, filters.q ? containsPattern(filters.q) : null,
      after?.createdAt ?? null, after?.id ?? null, limit,
    ],
  );
  return rows;
}

export async function findMaterial(db: Queryable, schoolId: string, materialId: string): Promise<MaterialRow | null> {
  const { rows } = await db.query<MaterialRow>(`${MATERIAL_SELECT} WHERE m.school_id = $1 AND m.id = $2`, [schoolId, materialId]);
  return rows[0] ?? null;
}

export interface NewMaterialRow {
  createdBy: string;
  title: string;
  description: string | null;
  subjectId: string | null;
  level: MaterialLevel | null;
  topic: string | null;
  url: string | null;
  fileId: string | null;
  now: Date;
}

export async function insertMaterial(db: Queryable, schoolId: string, material: NewMaterialRow): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO materials (school_id, created_by, title, description, subject_id, level, topic, url, file_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      schoolId, material.createdBy, material.title, material.description, material.subjectId, material.level, material.topic,
      material.url, material.fileId, material.now,
    ],
  );
  return rows[0].id;
}

/** Deletes a material and returns its file, if it had one, for the caller to delete as well. */
export async function deleteMaterial(db: Queryable, schoolId: string, materialId: string): Promise<{ fileId: string | null } | null> {
  const { rows } = await db.query<{ file_id: string | null }>(
    'DELETE FROM materials WHERE school_id = $1 AND id = $2 RETURNING file_id',
    [schoolId, materialId],
  );
  return rows[0] ? { fileId: rows[0].file_id } : null;
}

export async function subjectExists(db: Queryable, schoolId: string, subjectId: string): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM subjects WHERE school_id = $1 AND id = $2', [schoolId, subjectId]);
  return rows.length > 0;
}

/** Whether a stored file is a material's: then any staff member of the school may open it. */
export async function isMaterialFile(db: Queryable, schoolId: string, fileId: string): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM materials WHERE school_id = $1 AND file_id = $2', [schoolId, fileId]);
  return rows.length > 0;
}
