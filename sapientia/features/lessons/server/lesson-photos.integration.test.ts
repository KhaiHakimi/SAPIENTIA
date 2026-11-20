import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getFile } from '@/app/api/files/[id]/route';
import { DELETE as removePhoto, POST as addPhoto } from '@/app/api/lessons/records/photo/route';
import { PUT as putRecord } from '@/app/api/lessons/records/route';
import { GET as getDay } from '@/app/api/lessons/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { uploadRoot } from '@/shared/server/files/file-storage.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import { GPS_MARKER, jpegWithExif, SAMPLE_JPEG, SAMPLE_PNG } from '@/shared/server/testing/sample-images';
import type { LessonDay, LessonRecord } from '../interfaces/lesson.interface';

/** Malaysia time. Wednesday 4 November 2026, 10:00: the 08:00 period has started. */
const NOW = '2026-11-04T10:00:00+08:00';
const WEDNESDAY = '2026-11-04';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('lesson photos (Sprint 10)', () => {
  let schoolA: string;
  let guruId: string;
  let aliId: string;
  let adminId: string;
  let guru: string;
  let ali: string;
  let admin: string;
  let outsider: string;
  let slot: TimetableSlot;

  const photoForm = (bytes: Uint8Array, name = 'IMG_0001.jpg', target: Record<string, string> = { slotId: slot.id, onDate: WEDNESDAY }) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(target)) form.set(key, value);
    form.set('photo', new Blob([new Uint8Array(bytes)]), name);
    return form;
  };
  const upload = (form: FormData, cookie = guru) => call(addPhoto, '/api/lessons/records/photo', { method: 'POST', cookie, form });
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  const fetchFile = (id: string, cookie: string | null = guru) => call(getFile, `/api/files/${id}`, { cookie, params: { id } });
  const keyOf = async (fileId: string) =>
    (await getPool().query<{ storage_key: string }>('SELECT storage_key FROM stored_files WHERE id = $1', [fileId])).rows[0]?.storage_key;
  const onDisk = (key: string) => existsSync(join(uploadRoot(), key.slice(0, 2), key));
  const recordHeld = (cookie = guru) =>
    call(putRecord, '/api/lessons/records', { method: 'PUT', cookie, body: { slotId: slot.id, onDate: WEDNESDAY, status: 'held' } });

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    adminId = await createUser(schoolA, 'admin@a.test', 'admin');
    guruId = await createUser(schoolA, 'guru@a.test', 'teacher');
    aliId = await createUser(schoolA, 'ali@a.test', 'teacher');
    await createUser(schoolB, 'guru@b.test', 'teacher');
    [admin, guru, ali, outsider] = await Promise.all(['admin@a.test', 'guru@a.test', 'ali@a.test', 'guru@b.test'].map(signIn));
    const response = await call(addSlot, '/api/timetable/slots', {
      method: 'POST', cookie: admin, body: { teacherId: guruId, weekday: 3, startTime: '08:00', endTime: '09:00', label: '4 Bestari' },
    });
    slot = (await response.json()) as TimetableSlot;
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('needs the lesson recorded first', async () => {
    const response = await upload(photoForm(SAMPLE_JPEG));
    expect(response.status).toBe(400);
    expect(await fieldsOf(response)).toEqual({ photo: 'record_first' });
    // The refused upload left nothing behind.
    expect((await getPool().query('SELECT 1 FROM stored_files')).rowCount).toBe(0);
  });

  it('stores the photo without its location data and shows it only to the people who can see the record', async () => {
    await recordHeld();
    const response = await upload(photoForm(jpegWithExif()));
    expect(response.status).toBe(201);
    const record = (await response.json()) as LessonRecord;
    expect(record.photoFileId).toEqual(expect.any(String));
    const fileId = record.photoFileId as string;

    const own = await fetchFile(fileId);
    expect(own.status).toBe(200);
    expect(own.headers.get('content-type')).toBe('image/jpeg');
    expect(own.headers.get('content-disposition')).toBe('inline; filename="IMG_0001.jpg"; filename*=UTF-8\'\'IMG_0001.jpg');
    expect(own.headers.get('content-security-policy')).toContain('sandbox');
    const bytes = Buffer.from(await own.arrayBuffer());
    expect(bytes.toString('latin1')).not.toContain(GPS_MARKER);
    expect(bytes.equals(Buffer.from(SAMPLE_JPEG))).toBe(true);

    // A colleague, an administrator and another school all get the same 404; no sign-in gets 401.
    expect((await fetchFile(fileId, ali)).status).toBe(404);
    expect((await fetchFile(fileId, admin)).status).toBe(404);
    expect((await fetchFile(fileId, outsider)).status).toBe(404);
    expect((await fetchFile(fileId, null)).status).toBe(401);
    expect((await call(getFile, '/api/files/not-a-uuid', { cookie: guru, params: { id: 'not-a-uuid' } })).status).toBe(404);

    const day = (await (await call(getDay, `/api/lessons?onDate=${WEDNESDAY}`, { cookie: guru })).json()) as LessonDay;
    expect(day.periods[0].record?.photoFileId).toBe(fileId);
  });

  it('lets only the recorder add or remove a photo', async () => {
    await recordHeld();
    expect((await upload(photoForm(SAMPLE_JPEG), ali)).status).toBe(404);
    expect((await upload(photoForm(SAMPLE_JPEG), admin)).status).toBe(404);
    expect((await upload(photoForm(SAMPLE_JPEG), outsider)).status).toBe(404);
    const remove = (cookie: string) =>
      call(removePhoto, `/api/lessons/records/photo?slotId=${slot.id}&onDate=${WEDNESDAY}`, { method: 'DELETE', cookie });
    expect((await upload(photoForm(SAMPLE_JPEG))).status).toBe(201);
    expect((await remove(ali)).status).toBe(404);
    expect((await getPool().query('SELECT 1 FROM stored_files')).rowCount).toBe(1);
  });

  it('replaces a photo and removes the old file, and removing the photo deletes it', async () => {
    await recordHeld();
    const first = ((await (await upload(photoForm(SAMPLE_JPEG))).json()) as LessonRecord).photoFileId as string;
    const firstKey = await keyOf(first);
    expect(onDisk(firstKey)).toBe(true);

    const second = ((await (await upload(photoForm(SAMPLE_PNG, 'papan.png'))).json()) as LessonRecord).photoFileId as string;
    expect(second).not.toBe(first);
    expect((await fetchFile(first)).status).toBe(404);
    expect(onDisk(firstKey)).toBe(false);
    expect((await fetchFile(second)).headers.get('content-type')).toBe('image/png');

    const secondKey = await keyOf(second);
    const removed = await call(removePhoto, `/api/lessons/records/photo?slotId=${slot.id}&onDate=${WEDNESDAY}`, { method: 'DELETE', cookie: guru });
    expect(removed.status).toBe(204);
    expect((await fetchFile(second)).status).toBe(404);
    expect(onDisk(secondKey)).toBe(false);
    expect((await getPool().query('SELECT 1 FROM stored_files')).rowCount).toBe(0);

    const { rows } = await getPool().query<{ action: string; metadata: Record<string, unknown> }>(
      `SELECT action, metadata FROM audit_logs WHERE action LIKE 'lesson.photo%' ORDER BY id`,
    );
    expect(rows).toEqual([
      { action: 'lesson.photo_added', metadata: { onDate: WEDNESDAY, replaced: false } },
      { action: 'lesson.photo_added', metadata: { onDate: WEDNESDAY, replaced: true } },
      { action: 'lesson.photo_removed', metadata: { onDate: WEDNESDAY } },
    ]);
  });

  it('refuses anything that is not a JPEG or PNG picture, whatever it is called, and pictures over 5 MB', async () => {
    await recordHeld();
    expect(await fieldsOf(await upload(photoForm(new Uint8Array(Buffer.from('%PDF-1.4 ...')), 'gambar.jpg')))).toEqual({ photo: 'file_type' });
    expect(await fieldsOf(await upload(photoForm(new Uint8Array(Buffer.from('<script>alert(1)</script>')), 'gambar.jpg'))))
      .toEqual({ photo: 'file_type' });
    const huge = new Uint8Array(5 * 1024 * 1024 + 1);
    huge.set(SAMPLE_JPEG);
    expect(await fieldsOf(await upload(photoForm(huge)))).toEqual({ photo: 'file_too_large' });
    const empty = new FormData();
    empty.set('slotId', slot.id);
    empty.set('onDate', WEDNESDAY);
    expect(await fieldsOf(await upload(empty))).toEqual({ photo: 'file_required' });
    expect((await getPool().query('SELECT 1 FROM stored_files')).rowCount).toBe(0);
  });

  it('lets the absent teacher see the photo the relief teacher took of their class', async () => {
    await getPool().query(
      `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by)
       VALUES ($1, $2, $3, $4, $5, '08:00', '09:00', $6, $7)`,
      [schoolA, slot.id, WEDNESDAY, guruId, aliId, new Date('2026-11-03T07:30:00+08:00'), adminId],
    );
    expect((await recordHeld(ali)).status).toBe(200);
    const fileId = ((await (await upload(photoForm(SAMPLE_JPEG), ali)).json()) as LessonRecord).photoFileId as string;
    expect((await fetchFile(fileId, ali)).status).toBe(200);
    expect((await fetchFile(fileId, guru)).status).toBe(200);
    expect((await fetchFile(fileId, admin)).status).toBe(404);
  });
});
