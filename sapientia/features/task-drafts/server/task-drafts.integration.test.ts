import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as aiStatus } from '@/app/api/ai/status/route';
import { POST as taskDraft } from '@/app/api/ai/task-draft/route';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { LlmClient, LlmRequest } from '@/shared/interfaces/llm.interface';
import { AiBadOutputError, AiUnavailableError, RateLimitError } from '@/shared/server/app-errors';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { LlmFailure } from '@/shared/server/llm/llm-client.service';
import { call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import { TASK_DRAFTS_PER_HOUR } from '../constants/task-draft.constants';
import { draftTask } from './task-draft.service';

// Thursday 19 November 2026, 10:00 at the school.
const NOW = new Date('2026-11-19T02:00:00Z');
const clock = fixedClock(NOW);
const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** A model stand-in that records what it was sent and answers with a fixed text. */
function fakeModel(answer: string | Error): LlmClient & { sent: LlmRequest[] } {
  const sent: LlmRequest[] = [];
  return {
    provider: 'ollama',
    sent,
    complete: async (request) => {
      sent.push(request);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

/** Instruction to task (plan Phase 6): what leaves the server, what comes back, and who may ask. */
describe('task drafts', () => {
  let schoolA: string;
  let sender: SessionUser;

  beforeEach(async () => {
    delete process.env.AI_PROVIDER;
    setTestClock(clock);
    await resetDatabase();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    const senderId = await createUser(schoolA, 'pk@a.test', 'sender');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    await getPool().query(`UPDATE users SET name = 'Aminah binti Yusof' WHERE email = 'guru@a.test'`);
    await getPool().query(`INSERT INTO students (school_id, name, username, password_hash, must_change_password) VALUES ($1, 'Daniel Lim', 'daniel0001', 'x', false)`, [schoolA]);
    await createUser(schoolB, 'other@b.test', 'teacher');
    await getPool().query(`UPDATE users SET name = 'Kavitha Raman' WHERE email = 'other@b.test'`);
    sender = {
      id: senderId, schoolId: schoolA, schoolName: 'Sekolah A001', timeZone: 'Asia/Kuala_Lumpur', email: 'pk@a.test', name: 'pk',
      role: 'sender', mfaSetupRequired: false,
    };
  });

  afterAll(async () => {
    setTestClock(null);
    await closePool();
  });

  it('removes names the school holds, and contact numbers, before the model sees the instruction', async () => {
    const model = fakeModel(JSON.stringify({ title: 'Kumpul borang', dueOn: '2026-11-26', estimatedMinutes: 30, description: null }));
    const result = await draftTask(sender, 'Minta Cikgu Aminah kumpul borang Daniel Lim (tel 012-345 6789) sebelum Khamis depan. Kavitha juga.', clock, model);

    const sentText = model.sent[0].prompt;
    expect(sentText).not.toMatch(/Aminah|Daniel|Lim\b|345 6789/);
    // Kavitha is in another school: this school holds no such name, so it cannot be known (the screen warns about this).
    expect(sentText).toContain('Kavitha');
    expect(sentText).toContain('2026-11-19 Thursday (today)');
    expect(result).toEqual({
      draft: { title: 'Kumpul borang', description: null, dueOn: '2026-11-26', estimatedMinutes: 30 },
      removed: 3,
      dropped: [],
    });
    const { rows } = await getPool().query('SELECT feature, outcome FROM ai_requests');
    expect(rows).toEqual([{ feature: 'task_draft', outcome: 'ok' }]);
  });

  it('refuses an unusable answer, and says AI is unavailable when the model fails, counting both', async () => {
    await expect(draftTask(sender, 'Hantar markah', clock, fakeModel('Sure! Here is your task.'))).rejects.toBeInstanceOf(AiBadOutputError);
    await expect(draftTask(sender, 'Hantar markah', clock, fakeModel(new LlmFailure('temporary', 'down'))))
      .rejects.toBeInstanceOf(AiUnavailableError);
    await expect(draftTask(sender, 'Hantar markah', clock, null)).rejects.toBeInstanceOf(AiUnavailableError);
    const { rows } = await getPool().query('SELECT outcome FROM ai_requests ORDER BY outcome');
    expect(rows.map((row) => row.outcome)).toEqual(['bad_output', 'failed']);
  });

  it('holds each person to the hourly limit, which frees up an hour after the oldest request', async () => {
    const model = fakeModel(JSON.stringify({ title: 'T' }));
    for (let i = 0; i < TASK_DRAFTS_PER_HOUR; i++) await draftTask(sender, 'Hantar markah', clock, model);
    const refused = draftTask(sender, 'Hantar markah', clock, model);
    await expect(refused).rejects.toBeInstanceOf(RateLimitError);
    await expect(refused).rejects.toMatchObject({ retryAfterSeconds: 3600 });
    const later = fixedClock(new Date(NOW.getTime() + 3_600_001));
    await expect(draftTask(sender, 'Hantar markah', later, model)).resolves.toMatchObject({ draft: { title: 'T' } });
  });

  it('holds to the hourly limit when requests arrive at once, and counts each while the model is still working', async () => {
    const slow: LlmClient = {
      provider: 'ollama',
      complete: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return JSON.stringify({ title: 'T' });
      },
    };
    const results = await Promise.allSettled(
      Array.from({ length: TASK_DRAFTS_PER_HOUR + 5 }, () => draftTask(sender, 'Hantar markah', clock, slow)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(TASK_DRAFTS_PER_HOUR);
    const refused = results.filter((result) => result.status === 'rejected');
    expect(refused.every((result) => result.reason instanceof RateLimitError)).toBe(true);
    const { rows } = await getPool().query<{ count: number }>(`SELECT count(*)::int AS count FROM ai_requests WHERE outcome = 'ok'`);
    expect(rows[0].count).toBe(TASK_DRAFTS_PER_HOUR);
  });

  it('over HTTP: senders only, and 503 while AI is switched off', async () => {
    const teacher = await signIn('guru@a.test');
    expect(await (await call(aiStatus, '/api/ai/status', { cookie: teacher })).json()).toEqual({ taskDrafts: false });
    const refused = await call(taskDraft, '/api/ai/task-draft', { method: 'POST', cookie: teacher, body: { instruction: 'x' } });
    expect(refused.status).toBe(404);

    const pk = await signIn('pk@a.test');
    const off = await call(taskDraft, '/api/ai/task-draft', { method: 'POST', cookie: pk, body: { instruction: 'Hantar markah' } });
    expect(off.status).toBe(503);
    expect(await errorCode(off)).toBe('ai_unavailable');
    const empty = await call(taskDraft, '/api/ai/task-draft', { method: 'POST', cookie: pk, body: { instruction: ' ' } });
    expect(empty.status).toBe(400);
    expect((await call(aiStatus, '/api/ai/status')).status).toBe(401);
  });
});
