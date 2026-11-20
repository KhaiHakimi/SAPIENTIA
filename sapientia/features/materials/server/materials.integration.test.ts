import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getFile } from '@/app/api/files/[id]/route';
import { DELETE as deleteMaterial } from '@/app/api/materials/[id]/route';
import { GET as listMaterials, POST as addMaterial } from '@/app/api/materials/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { uploadRoot } from '@/shared/server/files/file-storage.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { Material, MaterialPage } from '../interfaces/material.interface';

const NOW = '2026-11-13T10:00:00+08:00';
const PDF = new Uint8Array(Buffer.from('%PDF-1.4\n% Lembaran kerja\n%%EOF\n'));

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('material bank (Sprint 10)', () => {
  let schoolA: string;
  let guru: string;
  let ali: string;
  let admin: string;
  let outsider: string;
  let science: string;
  let otherSchoolSubject: string;

  const addLink = (body: Record<string, unknown>, cookie = guru) => call(addMaterial, '/api/materials', { method: 'POST', cookie, body });
  const addFile = (fields: Record<string, string>, bytes: Uint8Array = PDF, name = 'Lembaran Kerja.pdf', cookie = guru) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    form.set('file', new Blob([new Uint8Array(bytes)]), name);
    return call(addMaterial, '/api/materials', { method: 'POST', cookie, form });
  };
  const list = async (query = '', cookie = guru) => {
    const response = await call(listMaterials, `/api/materials${query}`, { cookie });
    expect(response.status).toBe(200);
    return (await response.json()) as MaterialPage;
  };
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  const remove = (id: string, cookie = guru) => call(deleteMaterial, `/api/materials/${id}`, { method: 'DELETE', cookie, params: { id } });
  const fetchFile = (id: string, cookie: string | null = guru) => call(getFile, `/api/files/${id}`, { cookie, params: { id } });
  /** Each add one second after the last, so "newest first" has a stable order. */
  let tick = 0;
  const later = () => setTestClock(fixedClock(new Date(new Date(NOW).getTime() + (tick += 1) * 1000)));

  beforeEach(async () => {
    tick = 0;
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolA, 'ali@a.test', 'teacher');
    await createUser(schoolB, 'guru@b.test', 'teacher');
    [admin, guru, ali, outsider] = await Promise.all(['admin@a.test', 'guru@a.test', 'ali@a.test', 'guru@b.test'].map(signIn));
    science = (await getPool().query<{ id: string }>(`INSERT INTO subjects (school_id, name) VALUES ($1, 'Sains') RETURNING id`, [schoolA]))
      .rows[0].id;
    otherSchoolSubject = (await getPool().query<{ id: string }>(`INSERT INTO subjects (school_id, name) VALUES ($1, 'Sains') RETURNING id`, [schoolB]))
      .rows[0].id;
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('adds a link with its tags, for everyone on the staff to find', async () => {
    const response = await addLink({
      title: '  Sistem Suria  ', url: 'https://delima.example.test/sains/suria', subjectId: science, level: 'tingkatan_2', topic: 'Bab 9',
    });
    expect(response.status).toBe(201);
    const material = (await response.json()) as Material;
    expect(material).toMatchObject({
      title: 'Sistem Suria', url: 'https://delima.example.test/sains/suria', file: null, subject: { id: science, name: 'Sains' },
      level: 'tingkatan_2', topic: 'Bab 9', canRemove: true,
    });
    const seenByColleague = await list('', ali);
    expect(seenByColleague.items.map((item) => [item.title, item.canRemove])).toEqual([['Sistem Suria', false]]);
    expect((await list('', outsider)).items).toEqual([]);
  });

  it('accepts only https links and subjects of the same school', async () => {
    expect(await fieldsOf(await addLink({ title: 'X', url: 'javascript:alert(1)' }))).toEqual({ url: 'invalid_url' });
    expect(await fieldsOf(await addLink({ title: 'X', url: 'http://delima.example.test' }))).toEqual({ url: 'invalid_url' });
    expect(await fieldsOf(await addLink({ title: 'X', url: 'https://a.test', subjectId: otherSchoolSubject }))).toEqual({ subjectId: 'invalid_subject' });
    expect(await fieldsOf(await addLink({ title: '', url: 'https://a.test' }))).toEqual({ title: 'required' });
    expect(await fieldsOf(await addLink({ title: 'X', url: 'https://a.test', level: 'tahun_9' }))).toEqual({ level: 'invalid_level' });
  });

  it('stores an uploaded file that any member of staff can download and no other school can', async () => {
    const response = await addFile({ title: 'Lembaran kerja fotosintesis', subjectId: science, level: '', topic: 'Fotosintesis' });
    expect(response.status).toBe(201);
    const material = (await response.json()) as Material;
    expect(material.url).toBeNull();
    expect(material.level).toBeNull();
    expect(material.file).toMatchObject({ fileName: 'Lembaran Kerja.pdf', contentType: 'application/pdf', byteSize: PDF.byteLength });

    const fileId = material.file?.id as string;
    const download = await fetchFile(fileId, ali);
    expect(download.status).toBe(200);
    expect(download.headers.get('content-disposition')).toMatch(/^attachment; filename="Lembaran Kerja.pdf"/);
    expect(Buffer.from(await download.arrayBuffer()).equals(Buffer.from(PDF))).toBe(true);
    expect((await fetchFile(fileId, outsider)).status).toBe(404);
    expect((await fetchFile(fileId, null)).status).toBe(401);
  });

  it('refuses files that are not documents or pictures, whatever they are called', async () => {
    const program = new Uint8Array(Buffer.from('MZ\x90\x00 this program cannot be run in DOS mode', 'latin1'));
    expect(await fieldsOf(await addFile({ title: 'Nota' }, program, 'nota.pdf'))).toEqual({ file: 'file_type' });
    expect(await fieldsOf(await addFile({ title: 'Nota' }, new Uint8Array(Buffer.from('<html></html>')), 'nota.docx'))).toEqual({ file: 'file_type' });
    // A form carrying an unknown field is refused like a JSON body would be.
    expect((await addFile({ title: 'Nota', createdBy: 'someone' })).status).toBe(400);
    expect((await getPool().query('SELECT 1 FROM stored_files')).rowCount).toBe(0);
  });

  it('filters by subject, level and words, and pages newest first', async () => {
    later();
    await addLink({ title: 'Peta minda sel', url: 'https://a.test/1', subjectId: science, level: 'tingkatan_1', topic: 'Sel' });
    later();
    await addLink({ title: 'Diskaun 50% kuiz', url: 'https://a.test/2', level: 'tingkatan_2' });
    later();
    await addLink({ title: 'Latihan pecahan', url: 'https://a.test/3', topic: 'Pecahan 100_peratus' });

    expect((await list()).items.map((item) => item.title)).toEqual(['Latihan pecahan', 'Diskaun 50% kuiz', 'Peta minda sel']);
    expect((await list(`?subjectId=${science}`)).items.map((item) => item.title)).toEqual(['Peta minda sel']);
    expect((await list('?level=tingkatan_2')).items.map((item) => item.title)).toEqual(['Diskaun 50% kuiz']);
    expect((await list('?q=SEL')).items.map((item) => item.title)).toEqual(['Peta minda sel']);
    // % and _ are searched for as themselves, not as wildcards.
    expect((await list('?q=50%25')).items.map((item) => item.title)).toEqual(['Diskaun 50% kuiz']);
    expect((await list('?q=0_p')).items.map((item) => item.title)).toEqual(['Latihan pecahan']);

    const first = await list('?limit=2');
    expect(first.items).toHaveLength(2);
    const second = await list(`?limit=2&cursor=${encodeURIComponent(first.nextCursor as string)}`);
    expect(second.items.map((item) => item.title)).toEqual(['Peta minda sel']);
    expect(second.nextCursor).toBeNull();
    const forged = Buffer.from(JSON.stringify(['not a date', 'x'])).toString('base64url');
    expect((await call(listMaterials, `/api/materials?cursor=${forged}`, { cookie: guru })).status).toBe(400);
  });

  it('lets the person who added a material, or an administrator, remove it, and removes its file', async () => {
    const link = (await (await addLink({ title: 'Pautan', url: 'https://a.test' })).json()) as Material;
    const upload = (await (await addFile({ title: 'Fail' })).json()) as Material;
    const { rows } = await getPool().query<{ storage_key: string }>('SELECT storage_key FROM stored_files WHERE id = $1', [upload.file?.id]);
    const path = join(uploadRoot(), rows[0].storage_key.slice(0, 2), rows[0].storage_key);
    expect(existsSync(path)).toBe(true);

    expect((await remove(upload.id, ali)).status).toBe(404);
    expect((await remove(upload.id, outsider)).status).toBe(404);
    expect((await remove(upload.id)).status).toBe(204);
    expect((await fetchFile(upload.file?.id as string)).status).toBe(404);
    expect(existsSync(path)).toBe(false);
    expect((await remove(link.id, admin)).status).toBe(204);
    expect((await list()).items).toEqual([]);

    const { rows: audit } = await getPool().query<{ action: string; metadata: Record<string, string> }>(
      `SELECT action, metadata FROM audit_logs WHERE school_id = $1 AND entity_type = 'material' ORDER BY id`,
      [schoolA],
    );
    expect(audit).toEqual([
      { action: 'material.added', metadata: { kind: 'link' } },
      { action: 'material.added', metadata: { kind: 'file' } },
      { action: 'material.removed', metadata: { kind: 'file' } },
      { action: 'material.removed', metadata: { kind: 'link' } },
    ]);
  });

  it('keeps a material when its subject is removed, without the tag', async () => {
    await addLink({ title: 'Pautan', url: 'https://a.test', subjectId: science });
    await getPool().query('DELETE FROM subjects WHERE id = $1', [science]);
    expect((await list()).items[0].subject).toBeNull();
  });
});
