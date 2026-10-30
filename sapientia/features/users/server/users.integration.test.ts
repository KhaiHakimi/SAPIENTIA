import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as acceptInvite } from '@/app/api/auth/invites/accept/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/me/route';
import { GET as staff } from '@/app/api/staff/route';
import { GET as listUsers, POST as inviteUser } from '@/app/api/users/route';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { InviteUserResult, StaffUser } from '../interfaces/staff-user.interface';

const signIn = async (email: string, password = TEST_PASSWORD) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password } }));

const tokenOf = (inviteUrl: string) => decodeURIComponent(new URL(inviteUrl).hash.replace('#token=', ''));

describe('accounts, invites and roles (G2)', () => {
  let schoolA: string;
  let schoolB: string;

  beforeEach(async () => {
    await resetDatabase();
    schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    await createUser(schoolB, 'guru@b.test', 'teacher');
  });

  afterAll(closePool);

  it('G2: an administrator invites a teacher, who sets a password and signs in', async () => {
    const admin = await signIn('admin@a.test');
    const invited = await call(inviteUser, '/api/users', {
      method: 'POST',
      cookie: admin,
      body: { email: 'Cikgu.Baru@A.test', name: 'Cikgu Baru', role: 'teacher' },
    });
    expect(invited.status).toBe(201);
    const result = (await invited.json()) as InviteUserResult;
    expect(result.user).toMatchObject({ email: 'cikgu.baru@a.test', status: 'invited', role: 'teacher' });

    const accepted = await call(acceptInvite, '/api/auth/invites/accept', {
      method: 'POST',
      body: { token: tokenOf(result.inviteUrl), password: 'a-new-long-password' },
    });
    expect(accepted.status).toBe(204);
    expect((await (await call(me, '/api/me', { cookie: cookieFrom(accepted) })).json()).user.name).toBe('Cikgu Baru');

    const again = await call(login, '/api/auth/login', { method: 'POST', body: { email: 'cikgu.baru@a.test', password: 'a-new-long-password' } });
    expect(again.status).toBe(204);
  });

  it('accepts an invite link once only, and not after 48 hours', async () => {
    const admin = await signIn('admin@a.test');
    const first = (await (await call(inviteUser, '/api/users', {
      method: 'POST', cookie: admin, body: { email: 'satu@a.test', name: 'Satu', role: 'teacher' },
    })).json()) as InviteUserResult;
    const body = { token: tokenOf(first.inviteUrl), password: 'a-new-long-password' };
    expect((await call(acceptInvite, '/api/auth/invites/accept', { method: 'POST', body })).status).toBe(204);
    expect((await call(acceptInvite, '/api/auth/invites/accept', { method: 'POST', body })).status).toBe(404);

    const second = (await (await call(inviteUser, '/api/users', {
      method: 'POST', cookie: admin, body: { email: 'dua@a.test', name: 'Dua', role: 'teacher' },
    })).json()) as InviteUserResult;
    await getPool().query(`UPDATE invites SET expires_at = now() - interval '1 minute'`);
    const late = await call(acceptInvite, '/api/auth/invites/accept', {
      method: 'POST', body: { token: tokenOf(second.inviteUrl), password: 'a-new-long-password' },
    });
    expect(late.status).toBe(404);
  });

  it('a new invite makes the older link stop working', async () => {
    const admin = await signIn('admin@a.test');
    const invite = () => call(inviteUser, '/api/users', {
      method: 'POST', cookie: admin, body: { email: 'semula@a.test', name: 'Semula', role: 'teacher' },
    }).then((response) => response.json() as Promise<InviteUserResult>);
    const old = await invite();
    const fresh = await invite();
    const password = 'a-new-long-password';
    expect((await call(acceptInvite, '/api/auth/invites/accept', { method: 'POST', body: { token: tokenOf(old.inviteUrl), password } })).status).toBe(404);
    expect((await call(acceptInvite, '/api/auth/invites/accept', { method: 'POST', body: { token: tokenOf(fresh.inviteUrl), password } })).status).toBe(204);
  });

  it('refuses a short password when accepting', async () => {
    const admin = await signIn('admin@a.test');
    const result = (await (await call(inviteUser, '/api/users', {
      method: 'POST', cookie: admin, body: { email: 'pendek@a.test', name: 'Pendek', role: 'teacher' },
    })).json()) as InviteUserResult;
    const response = await call(acceptInvite, '/api/auth/invites/accept', {
      method: 'POST', body: { token: tokenOf(result.inviteUrl), password: 'short' },
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.password).toBe('too_short');
  });

  it('refusal: a teacher cannot list users or invite anyone (404, as if the endpoint did not exist)', async () => {
    const teacher = await signIn('guru@a.test');
    const list = await call(listUsers, '/api/users', { cookie: teacher });
    expect(list.status).toBe(404);
    const invite = await call(inviteUser, '/api/users', {
      method: 'POST', cookie: teacher, body: { email: 'x@a.test', name: 'X', role: 'admin' },
    });
    expect(invite.status).toBe(404);
    expect((await call(staff, '/api/staff', { cookie: teacher })).status).toBe(404);
  });

  it('refusal: signed-out callers get 401', async () => {
    expect(await errorCode(await call(listUsers, '/api/users'))).toBe('unauthenticated');
  });

  it('refusal: school A cannot read school B', async () => {
    const adminA = await signIn('admin@a.test');
    const page = (await (await call(listUsers, '/api/users?limit=100', { cookie: adminA })).json()) as { items: StaffUser[] };
    const emails = page.items.map((user) => user.email);
    expect(emails).toEqual(expect.arrayContaining(['admin@a.test', 'guru@a.test']));
    expect(emails.some((email) => email.endsWith('@b.test'))).toBe(false);

    const directory = (await (await call(staff, '/api/staff', { cookie: adminA })).json()) as { items: { id: string }[] };
    const { rows } = await getPool().query<{ id: string }>('SELECT id FROM users WHERE school_id = $1', [schoolB]);
    expect(directory.items.map((item) => item.id)).not.toEqual(expect.arrayContaining([rows[0].id]));
  });

  it('refusal: school A cannot take over an email that belongs to school B', async () => {
    const adminA = await signIn('admin@a.test');
    const response = await call(inviteUser, '/api/users', {
      method: 'POST', cookie: adminA, body: { email: 'guru@b.test', name: 'Curi', role: 'teacher' },
    });
    expect(response.status).toBe(409);
    const { rows } = await getPool().query<{ school_id: string }>('SELECT school_id FROM users WHERE email = $1', ['guru@b.test']);
    expect(rows[0].school_id).toBe(schoolB);
  });

  it('pages through users with a cursor', async () => {
    for (let index = 0; index < 4; index++) await createUser(schoolA, `extra${index}@a.test`, 'teacher');
    const admin = await signIn('admin@a.test');
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?limit=2&cursor=${cursor}` : '?limit=2';
      const page = (await (await call(listUsers, `/api/users${query}`, { cookie: admin })).json()) as { items: StaffUser[]; nextCursor: string | null };
      expect(page.items.length).toBeLessThanOrEqual(2);
      seen.push(...page.items.map((user) => user.email));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
  });
});
