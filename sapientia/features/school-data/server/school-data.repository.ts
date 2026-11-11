import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { NewSchoolDataItem, SchoolDataItem, SchoolDataKind } from '../interfaces/school-data.interface';

/**
 * Subjects, classes and task types are the same shape (a named row per school), so one repository serves all three. The
 * table name comes only from this fixed map, never from the request. Every function takes schoolId first and filters on it.
 */
const TABLES: Record<SchoolDataKind, { table: string; hasEstimate: boolean }> = {
  'subjects': { table: 'subjects', hasEstimate: false },
  'classes': { table: 'classes', hasEstimate: false },
  'task-types': { table: 'task_types', hasEstimate: true },
};

interface ItemRow {
  id: string;
  name: string;
  estimated_minutes: number | null;
}

const toItem = (row: ItemRow): SchoolDataItem => ({ id: row.id, name: row.name, estimatedMinutes: row.estimated_minutes });

/** The school's list by name. Archived task types are left out. */
export async function listItems(db: Queryable, schoolId: string, kind: SchoolDataKind, limit: number): Promise<SchoolDataItem[]> {
  const { table, hasEstimate } = TABLES[kind];
  const { rows } = await db.query<ItemRow>(
    `SELECT id, name, ${hasEstimate ? 'estimated_minutes' : 'NULL::integer AS estimated_minutes'} FROM ${table}
      WHERE school_id = $1 ${hasEstimate ? 'AND archived_at IS NULL' : ''}
      ORDER BY lower(name), id LIMIT $2`,
    [schoolId, limit],
  );
  return rows.map(toItem);
}

export async function insertItem(db: Queryable, schoolId: string, kind: SchoolDataKind, item: NewSchoolDataItem): Promise<SchoolDataItem> {
  const { table, hasEstimate } = TABLES[kind];
  const sql = hasEstimate
    ? `INSERT INTO ${table} (school_id, name, estimated_minutes) VALUES ($1, $2, $3) RETURNING id, name, estimated_minutes`
    : `INSERT INTO ${table} (school_id, name) VALUES ($1, $2) RETURNING id, name, NULL::integer AS estimated_minutes`;
  const { rows } = await db.query<ItemRow>(sql, hasEstimate ? [schoolId, item.name, item.estimatedMinutes] : [schoolId, item.name]);
  return toItem(rows[0]);
}

/**
 * Removes the row; true if one in this school went. A task type is archived instead, because tasks keep pointing at it.
 * A subject or class still on a timetable fails with a foreign-key error, which the service turns into a conflict.
 */
export async function removeItem(db: Queryable, schoolId: string, kind: SchoolDataKind, id: string, now: Date): Promise<boolean> {
  const { table, hasEstimate } = TABLES[kind];
  const { rowCount } = hasEstimate
    ? await db.query(`UPDATE ${table} SET archived_at = $3 WHERE school_id = $1 AND id = $2 AND archived_at IS NULL`, [schoolId, id, now])
    : await db.query(`DELETE FROM ${table} WHERE school_id = $1 AND id = $2`, [schoolId, id]);
  return (rowCount ?? 0) > 0;
}

/** The estimate of an active task type in this school, or null if there is no such type. */
export async function findTaskTypeEstimate(db: Queryable, schoolId: string, taskTypeId: string): Promise<number | null> {
  const { rows } = await db.query<{ estimated_minutes: number }>(
    'SELECT estimated_minutes FROM task_types WHERE school_id = $1 AND id = $2 AND archived_at IS NULL',
    [schoolId, taskTypeId],
  );
  return rows[0]?.estimated_minutes ?? null;
}
