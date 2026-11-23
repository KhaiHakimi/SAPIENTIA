import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as finishMfa } from '@/app/api/auth/mfa/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as confirm } from '@/app/api/me/mfa/confirm/route';
import { POST as newCodes } from '@/app/api/me/mfa/recovery-codes/route';
import { DELETE as disable, GET as status } from '@/app/api/me/mfa/route';
import { POST as setup } from '@/app/api/me/mfa/setup/route';
import { GET as me } from '@/app/api/me/route';
import { PUT as requirement } from '@/app/api/school/mfa/route';
import { DELETE as resetMfa } from '@/app/api/users/[id]/mfa/route';
import { GET as listUsers } from '@/app/api/users/route';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import { MFA_CHALLENGE_COOKIE } from '../constants/mfa.constants';
import type { MfaRecoveryCodes, MfaSetup, MfaStatus } from '../interfaces/mfa.interface';
import { fromBase32, hotp, totpStep } from './totp.service';

// Monday 22 March 2027, 09:00 at the school.
let now = new Date('2027-03-22T01:00:00Z');
const tick = (seconds: number) => {
  now = new Date(now.getTime() + seconds * 1000);
  setTestClock(fixedClock(now));
};

const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields: Record<string, string> } }).error.fields;
const passwordStep = (email: string) => call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } });
const challengeFrom = (response: Response) => response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${MFA_CHALLENGE_COOKIE}=`))?.split(';')[0];
const codeStep = (challenge: string, body: Record<string, string>) => call(finishMfa, '/api/auth/mfa', { method: 'POST', cookie: challenge, body });
const codeFor = (key: string, offsetSteps = 0) => hotp(fromBase32(key), totpStep(now) + offsetSteps);

/** Two-step sign-in (plan gate G6): setting it up, signing in with it, requiring it for administrators, and resetting it. */
describe('two-step sign-in', () => {
  let guruId: string;

  const signIn = async (email: string) => cookieFrom(await passwordStep(email));
  /** Turns it on for an account signed in with this cookie; returns the key and the recovery codes. */
  const enrol = async (cookie: string) => {
    const started = await call(setup, '/api/me/mfa/setup', { method: 'POST', cookie, body: { password: TEST_PASSWORD } });
    expect(started.status).toBe(201);
    const { key } = (await started.json()) as MfaSetup;
    const confirmed = await call(confirm, '/api/me/mfa/confirm', { method: 'POST', cookie, body: { code: codeFor(key) } });
    expect(confirmed.status).toBe(200);
    return { key, ...((await confirmed.json()) as MfaRecoveryCodes) };
  };
  /** Password, then the code: the session cookie. */
  const signInWithCode = async (email: string, key: string) => {
    tick(30);
    const challenge = challengeFrom(await passwordStep(email)) ?? '';
    return cookieFrom(await codeStep(challenge, { code: codeFor(key) }));
  };

  beforeEach(async () => {
    now = new Date('2027-03-22T01:00:00Z');
    setTestClock(fixedClock(now));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'admin2@a.test', 'admin');
    guruId = await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
  });

  afterEach(() => setTestClock(null));
  afterAll(closePool);

  it('is set up with the password and a first code, and keeps the secret encrypted', async () => {
    const guru = await signIn('guru@a.test');
    const wrongPassword = await call(setup, '/api/me/mfa/setup', { method: 'POST', cookie: guru, body: { password: 'not-it' } });
    expect(await fieldsOf(wrongPassword)).toEqual({ password: 'wrong_password' });

    const started = (await (await call(setup, '/api/me/mfa/setup', { method: 'POST', cookie: guru, body: { password: TEST_PASSWORD } })).json()) as MfaSetup;
    expect(started.key).toMatch(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/);
    expect(started.otpauthUri).toMatch(/^otpauth:\/\/totp\/Sapientia%20\(Sekolah%20A001\)%3Aguru%40a\.test\?secret=/);
    const wrongCode = await call(confirm, '/api/me/mfa/confirm', { method: 'POST', cookie: guru, body: { code: '000000' } });
    expect(await fieldsOf(wrongCode)).toEqual({ code: 'wrong_code' });

    const confirmed = await call(confirm, '/api/me/mfa/confirm', { method: 'POST', cookie: guru, body: { code: codeFor(started.key) } });
    const { recoveryCodes } = (await confirmed.json()) as MfaRecoveryCodes;
    expect(recoveryCodes).toHaveLength(10);
    expect(new Set(recoveryCodes).size).toBe(10);
    expect(((await (await call(status, '/api/me/mfa', { cookie: guru })).json()) as MfaStatus))
      .toEqual({ available: true, enabled: true, recoveryCodesLeft: 10, requiredForAdmins: false });

    const { rows } = await getPool().query<{ secret_encrypted: Buffer }>('SELECT secret_encrypted FROM user_mfa WHERE user_id = $1', [guruId]);
    expect(rows[0].secret_encrypted.includes(fromBase32(started.key))).toBe(false);
    const codes = await getPool().query<{ code_hash: Buffer }>('SELECT code_hash FROM user_mfa_recovery_codes WHERE user_id = $1', [guruId]);
    expect(codes.rows.some((row) => row.code_hash.toString('utf8').includes(recoveryCodes[0]))).toBe(false);
    // Once on, setup cannot replace it.
    expect((await call(setup, '/api/me/mfa/setup', { method: 'POST', cookie: guru, body: { password: TEST_PASSWORD } })).status).toBe(409);
  });

  it('asks for a code after the password; a used code, a wrong code or a spent challenge never signs in', async () => {
    const { key, recoveryCodes } = await enrol(await signIn('guru@a.test'));
    tick(30);

    const password = await passwordStep('guru@a.test');
    expect(password.status).toBe(200);
    expect(await password.json()).toEqual({ mfaRequired: true });
    expect(password.headers.getSetCookie().some((cookie) => cookie.startsWith('sapientia_session='))).toBe(false);
    const challenge = challengeFrom(password) ?? '';
    expect(challenge).not.toBe('');

    expect(await fieldsOf(await codeStep(challenge, { code: '123456' }))).toEqual({ code: 'wrong_code' });
    const code = codeFor(key);
    const done = await codeStep(challenge, { code });
    expect(done.status).toBe(204);
    const session = cookieFrom(done);
    expect(((await (await call(me, '/api/me', { cookie: session })).json()) as { user: SessionUser }).user.email).toBe('guru@a.test');
    // The challenge is spent, and the same code cannot be used again on a new one.
    expect((await codeStep(challenge, { code })).status).toBe(401);
    const again = challengeFrom(await passwordStep('guru@a.test')) ?? '';
    expect(await fieldsOf(await codeStep(again, { code }))).toEqual({ code: 'wrong_code' });

    // A recovery code works once, typed any way.
    expect((await codeStep(again, { recoveryCode: recoveryCodes[0].toUpperCase() })).status).toBe(204);
    const third = challengeFrom(await passwordStep('guru@a.test')) ?? '';
    expect(await fieldsOf(await codeStep(third, { recoveryCode: recoveryCodes[0] }))).toEqual({ code: 'wrong_code' });

    // Five wrong codes use the challenge up; the sixth try is told to sign in again.
    for (let attempt = 1; attempt < 5; attempt += 1) expect((await codeStep(third, { code: '000000' })).status).toBe(400);
    expect((await codeStep(third, { code: codeFor(key, 1) })).status).toBe(401);
    // An expired challenge does not work either.
    const late = challengeFrom(await passwordStep('guru@a.test')) ?? '';
    tick(301);
    expect((await codeStep(late, { code: codeFor(key) })).status).toBe(401);
  });

  it('can be required for administrators: one without it must set it up before anything else', async () => {
    const admin = await signIn('admin@a.test');
    const early = await call(requirement, '/api/school/mfa', { method: 'PUT', cookie: admin, body: { requiredForAdmins: true, password: TEST_PASSWORD } });
    expect(await fieldsOf(early)).toEqual({ requiredForAdmins: 'enrol_first' });
    await enrol(admin);
    const turnedOn = await call(requirement, '/api/school/mfa', { method: 'PUT', cookie: admin, body: { requiredForAdmins: true, password: TEST_PASSWORD } });
    expect(((await turnedOn.json()) as MfaStatus).requiredForAdmins).toBe(true);
    const keepOn = await call(disable, '/api/me/mfa', { method: 'DELETE', cookie: admin, body: { password: TEST_PASSWORD } });
    expect(await fieldsOf(keepOn)).toEqual({ password: 'required_for_admins' });

    const admin2 = await signIn('admin2@a.test');
    expect(((await (await call(me, '/api/me', { cookie: admin2 })).json()) as { user: SessionUser }).user.mfaSetupRequired).toBe(true);
    const blocked = await call(listUsers, '/api/users', { cookie: admin2 });
    expect(blocked.status).toBe(403);
    expect(await errorCode(blocked)).toBe('mfa_setup_required');
    tick(30);
    await enrol(admin2);
    expect((await call(listUsers, '/api/users', { cookie: admin2 })).status).toBe(200);

    // Teachers are not affected by the rule.
    const guru = await signIn('guru@a.test');
    expect(((await (await call(me, '/api/me', { cookie: guru })).json()) as { user: SessionUser }).user.mfaSetupRequired).toBe(false);
    const { rows } = await getPool().query("SELECT action FROM audit_logs WHERE action LIKE 'mfa.%' OR action LIKE 'school.mfa%' ORDER BY id");
    expect(rows.map((row) => row.action)).toEqual(['mfa.enabled', 'school.mfa_required', 'mfa.enabled']);
  });

  it('asks the administrator for their password again to change the school rule or reset a colleague\'s', async () => {
    const admin = await signIn('admin@a.test');
    await enrol(admin);
    const put = (body: Record<string, unknown>) => call(requirement, '/api/school/mfa', { method: 'PUT', cookie: admin, body });
    expect((await put({ requiredForAdmins: true, password: TEST_PASSWORD })).status).toBe(200);

    expect(await fieldsOf(await put({ requiredForAdmins: false }))).toEqual({ password: 'required' });
    expect(await fieldsOf(await put({ requiredForAdmins: false, password: 'not-it' }))).toEqual({ password: 'wrong_password' });
    expect(((await (await call(status, '/api/me/mfa', { cookie: admin })).json()) as MfaStatus).requiredForAdmins).toBe(true);
    expect(((await (await put({ requiredForAdmins: false, password: TEST_PASSWORD })).json()) as MfaStatus).requiredForAdmins).toBe(false);

    const guru = await signIn('guru@a.test');
    await enrol(guru);
    const reset = (body?: Record<string, unknown>) =>
      call(resetMfa, `/api/users/${guruId}/mfa`, { params: { id: guruId }, method: 'DELETE', cookie: admin, body });
    expect(await fieldsOf(await reset())).toEqual({ body: 'json_required' });
    expect(await fieldsOf(await reset({ password: 'not-it' }))).toEqual({ password: 'wrong_password' });
    expect((await call(me, '/api/me', { cookie: guru })).status).toBe(200);
    expect((await reset({ password: TEST_PASSWORD })).status).toBe(204);
  });

  it('turns off with the password, gives new recovery codes, and an administrator can reset a colleague\'s', async () => {
    const guru = await signIn('guru@a.test');
    const { key, recoveryCodes } = await enrol(guru);
    const guruSession = await signInWithCode('guru@a.test', key);
    const replaced = await call(newCodes, '/api/me/mfa/recovery-codes', { method: 'POST', cookie: guruSession, body: { password: TEST_PASSWORD } });
    const fresh = ((await replaced.json()) as MfaRecoveryCodes).recoveryCodes;
    expect(fresh).not.toContain(recoveryCodes[0]);

    // Lost phone: an administrator clears it; the teacher is signed out and signs in with the password alone.
    const admin = await signIn('admin@a.test');
    expect((await call(resetMfa, `/api/users/${guruId}/mfa`, { params: { id: guruId }, method: 'DELETE', cookie: await signIn('admin@b.test'), body: { password: TEST_PASSWORD } })).status)
      .toBe(404);
    expect((await call(resetMfa, `/api/users/${guruId}/mfa`, { params: { id: guruId }, method: 'DELETE', cookie: admin, body: { password: TEST_PASSWORD } })).status).toBe(204);
    expect((await call(me, '/api/me', { cookie: guruSession })).status).toBe(401);
    expect((await passwordStep('guru@a.test')).status).toBe(204);
    expect((await call(resetMfa, `/api/users/${guruId}/mfa`, { params: { id: guruId }, method: 'DELETE', cookie: admin, body: { password: TEST_PASSWORD } })).status).toBe(404);

    // Turning it off needs the password.
    const again = await signIn('guru@a.test');
    const second = await enrol(again);
    const session = await signInWithCode('guru@a.test', second.key);
    expect(await fieldsOf(await call(disable, '/api/me/mfa', { method: 'DELETE', cookie: session, body: { password: 'nope' } })))
      .toEqual({ password: 'wrong_password' });
    expect((await call(disable, '/api/me/mfa', { method: 'DELETE', cookie: session, body: { password: TEST_PASSWORD } })).status).toBe(204);
    expect((await passwordStep('guru@a.test')).status).toBe(204);
  });
});
