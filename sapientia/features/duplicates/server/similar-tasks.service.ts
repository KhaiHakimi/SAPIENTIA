import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool } from '@/shared/server/database.service';
import { SIMILAR_CANDIDATES_MAX, SIMILAR_LOOKBACK_DAYS, SIMILAR_SHOWN_MAX } from '../constants/duplicates.constants';
import type { SimilarTasksRequest, SimilarTasksResult } from '../interfaces/similar-task.interface';
import { SIMILARITY_THRESHOLD, titleSimilarity } from '../services/task-similarity.service';
import { listCandidateTasks } from './similar-tasks.repository';

const DAY_MS = 86_400_000;

/**
 * Duplicate detection (plan Phase 6): open tasks from the last 30 days whose title is close to the one being written, sent by
 * the caller or already given to someone the caller has chosen. It warns and never blocks. Works with AI switched off.
 */
export async function findSimilarTasks(actor: SessionUser, input: SimilarTasksRequest, clock: Clock): Promise<SimilarTasksResult> {
  const since = new Date(clock.now().getTime() - SIMILAR_LOOKBACK_DAYS * DAY_MS);
  const candidates = await listCandidateTasks(getPool(), actor.schoolId, actor.id, input.assigneeIds, since, SIMILAR_CANDIDATES_MAX);
  const items = candidates
    .map((row) => ({ row, score: titleSimilarity(input.title, row.title) }))
    .filter(({ score }) => score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, SIMILAR_SHOWN_MAX)
    .map(({ row }) => {
      const isMe = row.created_by === actor.id;
      return {
        taskId: isMe ? row.id : null,
        title: row.title,
        dueOn: row.due_on,
        sentBy: { name: row.creator_name, isMe },
        sharedAssignees: row.shared_assignees,
      };
    });
  return { items };
}
