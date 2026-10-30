import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';

/** How many overdue tasks one sweep delivers; the next sweep a minute later takes the rest. */
const SWEEP_BATCH = 500;

/**
 * Delivers one held task if it is due and not yet delivered. The conditional UPDATE is the whole guard (plan Sprint 4):
 * a job that runs twice, or races the sweep, finds delivered_at already set and does nothing.
 */
export async function deliverTask(taskId: string, clock: Clock): Promise<boolean> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; school_id: string }>(
      `UPDATE tasks SET delivered_at = $2 WHERE id = $1 AND delivered_at IS NULL AND deliver_at <= $2 RETURNING id, school_id`,
      [taskId, clock.now()],
    );
    const task = rows[0];
    if (!task) return false;
    await writeAudit(client, task.school_id, [
      { actorId: null, action: 'task.delivered', entityType: 'task', entityId: task.id, metadata: { via: 'job' } },
    ]);
    logger.info('delivery.delivered', { taskId: task.id, schoolId: task.school_id, via: 'job' });
    return true;
  });
}

/** The safety net: delivers every held task whose time has passed, whatever happened to its job. Returns how many. */
export async function deliverDueTasks(clock: Clock): Promise<number> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; school_id: string }>(
      `UPDATE tasks SET delivered_at = $1
        WHERE id IN (
          SELECT id FROM tasks WHERE delivered_at IS NULL AND deliver_at <= $1 ORDER BY deliver_at LIMIT $2 FOR UPDATE SKIP LOCKED
        )
        RETURNING id, school_id`,
      [clock.now(), SWEEP_BATCH],
    );
    for (const task of rows) {
      await writeAudit(client, task.school_id, [
        { actorId: null, action: 'task.delivered', entityType: 'task', entityId: task.id, metadata: { via: 'sweep' } },
      ]);
    }
    if (rows.length > 0) logger.info('delivery.swept', { count: rows.length });
    return rows.length;
  });
}
