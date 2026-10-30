import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Actions written so far. Metadata carries ids and states only: never names, emails or free text. */
export type AuditAction =
  | 'task.created'
  | 'task.assigned'
  | 'task.held'
  | 'task.urgent_override'
  | 'task.delivered'
  | 'assignment.status_changed'
  | 'comment.added'
  | 'settings.updated'
  | 'calendar.event_added'
  | 'calendar.event_removed';

export interface AuditEntry {
  actorId: string | null;
  action: AuditAction;
  entityType: 'task' | 'school' | 'calendar_event';
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/** Writes in the caller's transaction, so the log entry exists exactly when the change does. */
export async function writeAudit(db: Queryable, schoolId: string, entries: readonly AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const values: unknown[] = [];
  const rows = entries.map((entry, index) => {
    const base = index * 6;
    values.push(schoolId, entry.actorId, entry.action, entry.entityType, entry.entityId, JSON.stringify(entry.metadata ?? {}));
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`;
  });
  await db.query(
    `INSERT INTO audit_logs (school_id, actor_id, action, entity_type, entity_id, metadata) VALUES ${rows.join(', ')}`,
    values,
  );
}

export interface AuditRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

/** The entity's history, oldest first. The actor's name is looked up now; a removed account shows as unknown. */
export async function listEntityAudit(db: Queryable, schoolId: string, entityType: string, entityId: string, limit = 500) {
  const { rows } = await db.query<AuditRow>(
    `SELECT a.id::text, a.action, a.actor_id, u.name AS actor_name, a.metadata, a.created_at
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id AND u.school_id = a.school_id
      WHERE a.school_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
      ORDER BY a.id LIMIT $4`,
    [schoolId, entityType, entityId, limit],
  );
  return rows;
}
