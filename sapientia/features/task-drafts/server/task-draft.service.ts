import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { LlmClient } from '@/shared/interfaces/llm.interface';
import { AiBadOutputError, AiUnavailableError, RateLimitError } from '@/shared/server/app-errors';
import { getPool } from '@/shared/server/database.service';
import { getLlmClient, LlmFailure } from '@/shared/server/llm/llm-client.service';
import { redactPersonalData } from '@/shared/server/llm/redaction.service';
import { logger } from '@/shared/server/logger.service';
import { TASK_DRAFTS_PER_HOUR } from '../constants/task-draft.constants';
import type { AiStatus, TaskDraftResult } from '../interfaces/task-draft.interface';
import { buildDraftRequest, parseModelDraft } from './model-draft.service';
import { countRecentRequests, insertRequest, listSchoolNames } from './task-drafts.repository';

const HOUR_MS = 3_600_000;

export function getAiStatus(client: LlmClient | null = getLlmClient()): AiStatus {
  return { taskDrafts: client !== null };
}

/**
 * Instruction to task (plan Phase 6). The sender's instruction has every name the school holds, and any email, MyKad-like
 * or phone number, removed before it leaves the server; the model's answer is checked with the task rules and comes back
 * as a draft for the create-task form. Nothing is saved and nothing is sent to anyone: the person reads the draft, picks the
 * assignees and presses Send themselves. Each request is counted (who, when, outcome; never the text) against an hourly limit.
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
  const recent = await countRecentRequests(db, actor.schoolId, actor.id, new Date(now.getTime() - HOUR_MS));
  if (recent.count >= TASK_DRAFTS_PER_HOUR) {
    const freesAt = (recent.oldest?.getTime() ?? now.getTime()) + HOUR_MS;
    throw new RateLimitError(Math.max(1, Math.ceil((freesAt - now.getTime()) / 1000)));
  }

  const { text, removed } = redactPersonalData(instruction, await listSchoolNames(db, actor.schoolId));
  let answer: string;
  try {
    answer = await client.complete(buildDraftRequest(text, now, actor.timeZone));
  } catch (error) {
    await insertRequest(db, actor.schoolId, actor.id, 'failed', now);
    if (error instanceof LlmFailure) {
      logger.warn('ai.task_draft_failed', { provider: client.provider, kind: error.kind, detail: error.message });
      throw new AiUnavailableError();
    }
    throw error;
  }

  const parsed = parseModelDraft(answer, now, actor.timeZone);
  await insertRequest(db, actor.schoolId, actor.id, parsed ? 'ok' : 'bad_output', now);
  if (!parsed) throw new AiBadOutputError();
  return { ...parsed, removed };
}
