import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as mcp } from '@/app/api/mcp/route';
import { DELETE as revokeToken } from '@/app/api/me/api-tokens/[id]/route';
import { GET as listTokens, POST as createToken } from '@/app/api/me/api-tokens/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_ORIGIN, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import { API_TOKENS_MAX } from '../constants/mcp.constants';
import type { ApiTokenList, NewApiToken } from '../interfaces/api-token.interface';

/** A Wednesday morning in working hours, so the tasks here are delivered at once. */
const WORKING_HOURS = '2026-11-04T10:00:00+08:00';
const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

interface RpcAnswer {
  result?: {
    tools?: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
    content?: Array<{ text: string }>;
    isError?: boolean;
  };
  error?: { message: string };
}

let rpcId = 0;
/** One JSON-RPC call to /api/mcp as an MCP client sends it. */
async function rpc(token: string | null, method: string, params: unknown = {}, headers: Record<string, string> = {}) {
  const response = await call(mcp, '/api/mcp', {
    method: 'POST',
    body: { jsonrpc: '2.0', id: ++rpcId, method, params },
    headers: { accept: 'application/json, text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
  return { status: response.status, body: (await response.json()) as RpcAnswer };
}
const toolJson = (answer: RpcAnswer) => JSON.parse(answer.result?.content?.[0]?.text ?? 'null');

/** The read-only MCP server and the access tokens behind it (plan Phase 6). */
describe('MCP server', () => {
  let guru: string;
  let pk: string;
  let task: TaskDetail;

  const newToken = async (cookie: string, name = 'Claude') => {
    const response = await call(createToken, '/api/me/api-tokens', { method: 'POST', cookie, body: { name, password: TEST_PASSWORD } });
    return { status: response.status, body: (await response.json()) as NewApiToken };
  };

  beforeEach(async () => {
    process.env.MCP_SERVER = 'on';
    setTestClock(fixedClock(WORKING_HOURS));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'pk@a.test', 'sender');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    const guru2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolB, 'guru@b.test', 'teacher');
    pk = await signIn('pk@a.test');
    guru = await signIn('guru@a.test');
    const guruId = (await getPool().query<{ id: string }>(`SELECT id FROM users WHERE email = 'guru@a.test'`)).rows[0].id;
    task = (await (await call(createTask, '/api/tasks', {
      method: 'POST', cookie: pk, body: { title: 'Hantar markah PBD', dueOn: '2026-11-20', assigneeIds: [guruId] },
    })).json()) as TaskDetail;
    await call(createTask, '/api/tasks', { method: 'POST', cookie: pk, body: { title: 'Bukan untuk guru', dueOn: '2026-11-20', assigneeIds: [guru2] } });
  });

  afterEach(() => {
    delete process.env.MCP_SERVER;
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  it('a teacher makes a token with their password; the token is shown once and only its hash is kept', async () => {
    const wrong = await call(createToken, '/api/me/api-tokens', { method: 'POST', cookie: guru, body: { name: 'x', password: 'wrong-password' } });
    expect(wrong.status).toBe(400);
    const { status, body } = await newToken(guru);
    expect(status).toBe(201);
    expect(body.token).toMatch(/^sap_[A-Za-z0-9_-]{43}$/);
    const list = (await (await call(listTokens, '/api/me/api-tokens', { cookie: guru })).json()) as ApiTokenList;
    expect(list).toMatchObject({ available: true, endpoint: `${TEST_ORIGIN}/api/mcp`, items: [{ id: body.item.id, name: 'Claude' }] });
    expect(JSON.stringify(list)).not.toContain(body.token);
    const { rows } = await getPool().query<{ token_hash: Buffer }>('SELECT token_hash FROM api_tokens');
    expect(rows[0].token_hash.toString('utf8')).not.toContain(body.token);
    // Someone else's list is their own.
    expect(((await (await call(listTokens, '/api/me/api-tokens', { cookie: pk })).json()) as ApiTokenList).items).toEqual([]);
  });

  it('lists read-only tools and answers as the token owner, never as anyone else', async () => {
    const { body: { token } } = await newToken(guru);
    const tools = await rpc(token, 'tools/list');
    expect(tools.status).toBe(200);
    expect(tools.body.result?.tools?.map((tool) => tool.name).sort()).toEqual(['get_task', 'list_my_relief', 'list_my_tasks', 'list_sent_tasks']);
    expect(tools.body.result?.tools?.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);

    const mine = await rpc(token, 'tools/call', { name: 'list_my_tasks', arguments: {} });
    expect(toolJson(mine.body).map((item: { title: string }) => item.title)).toEqual(['Hantar markah PBD']);
    const detail = await rpc(token, 'tools/call', { name: 'get_task', arguments: { taskId: task.id } });
    expect(toolJson(detail.body)).toMatchObject({ id: task.id, isSender: false });
    expect(toolJson((await rpc(token, 'tools/call', { name: 'list_sent_tasks', arguments: {} })).body)).toEqual([]);
  });

  it('a task the owner cannot see is "not found", and arguments are validated', async () => {
    const { body: { token } } = await newToken(guru);
    const other = (await getPool().query<{ id: string }>(`SELECT id FROM tasks WHERE title = 'Bukan untuk guru'`)).rows[0].id;
    const hidden = await rpc(token, 'tools/call', { name: 'get_task', arguments: { taskId: other } });
    expect(hidden.body.result).toMatchObject({ isError: true });
    expect(JSON.stringify(hidden.body)).not.toContain('Bukan untuk guru');
    const bad = await rpc(token, 'tools/call', { name: 'list_my_tasks', arguments: { limit: 5000 } });
    expect(JSON.stringify(bad.body)).not.toContain('Hantar markah PBD');
  });

  it('refuses no token, a cookie, an unknown, revoked or expired token, and another site\'s Origin', async () => {
    const { body: { token, item } } = await newToken(guru);
    expect((await rpc(null, 'tools/list')).status).toBe(401);
    const withCookie = await call(mcp, '/api/mcp', {
      method: 'POST', cookie: guru, body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }, headers: { accept: 'application/json, text/event-stream' },
    });
    expect(withCookie.status).toBe(401);
    expect(withCookie.headers.get('www-authenticate')).toContain('Bearer');
    expect((await rpc('sap_not-a-real-token-at-all-000000000000000000', 'tools/list')).status).toBe(401);
    expect((await rpc(token, 'tools/list', {}, { origin: 'https://evil.test' })).status).toBe(403);

    setTestClock(fixedClock('2027-02-03T10:00:00+08:00'));
    expect((await rpc(token, 'tools/list')).status).toBe(401);
    setTestClock(fixedClock(WORKING_HOURS));
    expect((await rpc(token, 'tools/list')).status).toBe(200);

    expect((await call(revokeToken, `/api/me/api-tokens/${item.id}`, { method: 'DELETE', cookie: pk, params: { id: item.id } })).status).toBe(404);
    expect((await call(revokeToken, `/api/me/api-tokens/${item.id}`, { method: 'DELETE', cookie: guru, params: { id: item.id } })).status).toBe(204);
    expect((await rpc(token, 'tools/list')).status).toBe(401);
  });

  it('stops working when the account is disabled, and is capped per person', async () => {
    for (let i = 0; i < API_TOKENS_MAX; i++) expect((await newToken(guru, `t${i}`)).status).toBe(201);
    expect((await newToken(guru, 'one too many')).status).toBe(409);
    const { rows } = await getPool().query<{ id: string }>('SELECT id FROM api_tokens LIMIT 1');
    expect(rows).toHaveLength(1);
    await call(revokeToken, `/api/me/api-tokens/${rows[0].id}`, { method: 'DELETE', cookie: guru, params: { id: rows[0].id } });
    const { body: { token } } = await newToken(guru, 'again');
    await getPool().query(`UPDATE users SET status = 'disabled' WHERE email = 'guru@a.test'`);
    expect((await rpc(token, 'tools/list')).status).toBe(401);
  });

  it('is switched off by default: no endpoint and no new tokens', async () => {
    delete process.env.MCP_SERVER;
    expect((await call(mcp, '/api/mcp', { method: 'POST', body: {} })).status).toBe(404);
    expect(await (await call(listTokens, '/api/me/api-tokens', { cookie: guru })).json()).toEqual({ available: false, endpoint: null, items: [] });
    expect((await newToken(guru)).status).toBe(404);
  });

  it('still lists a token while switched off, so it can be revoked before MCP comes back', async () => {
    const { body: { token, item } } = await newToken(guru);
    delete process.env.MCP_SERVER;
    const list = (await (await call(listTokens, '/api/me/api-tokens', { cookie: guru })).json()) as ApiTokenList;
    expect(list).toMatchObject({ available: false, endpoint: null, items: [{ id: item.id, name: 'Claude' }] });
    const revoked = await call(revokeToken, `/api/me/api-tokens/${item.id}`, { method: 'DELETE', cookie: guru, params: { id: item.id } });
    expect(revoked.status).toBe(204);

    process.env.MCP_SERVER = 'on';
    expect((await rpc(token, 'tools/list')).status).toBe(401);
  });
});
