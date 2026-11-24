import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { LlmClient } from '@/shared/interfaces/llm.interface';
import { AiBadOutputError, AiUnavailableError, RateLimitError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { getLlmClient, LlmFailure } from '@/shared/server/llm/llm-client.service';
import { redactPersonalData } from '@/shared/server/llm/redaction.service';
import { logger } from '@/shared/server/logger.service';
import { TASK_DRAFTS_PER_HOUR } from '../constants/task-draft.constants';
import type { AiStatus, TaskDraftResult } from '../interfaces/task-draft.interface';
import { buildDraftRequest, parseModelDraft } from './model-draft.service';
import { countRecentRequests, insertRequest, listSchoolNames, lockRequester, setRequestOutcome } from './task-drafts.repository';

const HOUR_MS = 3_600_000;

export function getAiStatus(client: LlmClient | null = getLlmClient()): AiStatus {
  return { taskDrafts: client !== null };
}

/**
 * Instruction to task (plan Phase 6). The sender's instruction has every name the school holds, and any email, MyKad-like
 * or phone number, removed before it leaves the server; the model's answer is checked with the task rules and comes back
 * as a draft for the create-task form. Nothing is saved and nothing is sent to anyone: the person reads the draft, picks the
 * assignees and presses Send themselves. Each request is counted (who, when, outcome; never the text) against an hourly limit.
 * The request is recorded before the model is called, under a lock on the person, so requests sent in parallel cannot all
 * pass the count; the lock is not held while the model works. It stays recorded as failed unless the model answers.
 */
export async function draftTask(
  actor: SessionUser,
  instruction: string,
  clock: Clock,
  client: LlmClient | null = getLlmClient(),
): Promise<TaskDraftResult> {
  if (!client) throw new AiUnavailableError();
  const db = getPool();
  const now = clock.now();
  const requestId = await withTransaction(async (tx) => {
    await lockRequester(tx, actor.schoolId, actor.id);
    const recent = await countRecentRequests(tx, actor.schoolId, actor.id, new Date(now.getTime() - HOUR_MS));
    if (recent.count >= TASK_DRAFTS_PER_HOUR) {
      const freesAt = (recent.oldest?.getTime() ?? now.getTime()) + HOUR_MS;
      throw new RateLimitError(Math.max(1, Math.ceil((freesAt - now.getTime()) / 1000)));
    }
    return insertRequest(tx, actor.schoolId, actor.id, 'failed', now);
  });

  const { text, removed } = redactPersonalData(instruction, await listSchoolNames(db, actor.schoolId));
  let answer: string;
  try {
    answer = await client.complete(buildDraftRequest(text, now, actor.timeZone));
  } catch (error) {
    if (error instanceof LlmFailure) {
      logger.warn('ai.task_draft_failed', { provider: client.provider, kind: error.kind, detail: error.message });
      throw new AiUnavailableError();
    }
    throw error;
  }

  const parsed = parseModelDraft(answer, now, actor.timeZone);
  await setRequestOutcome(db, actor.schoolId, requestId, parsed ? 'ok' : 'bad_output');
  if (!parsed) throw new AiBadOutputError();
  return { ...parsed, removed };
}
