import { connection } from 'next/server';
import { checkHealth } from '@/features/health/services/health.service';
import { pingDatabase } from '@/shared/server/database.service';

/** Liveness and database check (plan G1): 200 when the database answers, 503 when it does not. */
export async function GET(): Promise<Response> {
  // Run on every request; a prerendered health check would report the build's database, not today's.
  await connection();
  const report = await checkHealth(pingDatabase);
  return Response.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
