import { describe, expect, it } from 'vitest';
import type { ExtensionAnsweredNotice, ExtensionRequestedNotice, ReliefNotice } from '../interfaces/event-notice.interface';
import { buildEventEmail, buildEventPush } from './event-notice-content';

const TASK_ID = '7d1c1b8e-0000-4000-8000-000000000001';
const RELIEF_ID = '7d1c1b8e-0000-4000-8000-000000000002';

const requested: ExtensionRequestedNotice = {
  kind: 'extension.requested',
  taskId: TASK_ID,
  taskTitle: 'Lengkapkan borang data murid',
  requesterName: 'Cikgu Fiksyen',
  currentDueOn: '2026-11-20',
  requestedDueOn: '2026-11-25',
};

const answered: ExtensionAnsweredNotice = {
  kind: 'extension.answered', taskId: TASK_ID, taskTitle: 'Lengkapkan borang data murid', deciderName: 'Puan Contoh',
  outcome: 'countered', dueOn: '2026-11-24',
};

const relief: ReliefNotice = {
  kind: 'relief.assigned', reliefId: RELIEF_ID, absentTeacherName: 'Cikgu Ravi', onDate: '2026-11-16', startTime: '08:00',
  endTime: '08:40', period: '4 Bestari, Matematik',
};

describe('buildEventEmail', () => {
  it('tells the sender who asked for which date, with a link to answer, in Bahasa Melayu then English', () => {
    const email = buildEventEmail(requested, 'Puan Contoh', `https://sapientia.test/staff/tasks/${TASK_ID}`, 'pk@sekolah.test');
    expect(email.to).toBe('pk@sekolah.test');
    expect(email.subject).toBe('Permohonan lanjutan / Extension request: Lengkapkan borang data murid');
    expect(email.text).toContain('Cikgu Fiksyen meminta tarikh akhir yang lebih lewat');
    expect(email.text).toContain('Tarikh yang diminta: Rabu, 25 November 2026');
    expect(email.text.indexOf('Date asked for: Wednesday, 25 November 2026')).toBeGreaterThan(email.text.indexOf('Tarikh yang diminta'));
    expect(email.text).toContain(`Jawab permohonan: https://sapientia.test/staff/tasks/${TASK_ID}`);
    expect(email.html).toContain(`href="https://sapientia.test/staff/tasks/${TASK_ID}"`);
  });

  it('gives the teacher the new date, and says when it is not the date they asked for', () => {
    const email = buildEventEmail(answered, 'Cikgu Fiksyen', null, 'g@s.test');
    expect(email.subject).toBe('Tarikh akhir baharu / New due date: Lengkapkan borang data murid');
    expect(email.text).toContain('Puan Contoh menetapkan tarikh lain');
    expect(email.text).toContain('Your new due date: Tuesday, 24 November 2026');
    expect(buildEventEmail({ ...answered, outcome: 'approved' }, 'Cikgu Fiksyen', null, 'g@s.test').subject)
      .toBe('Lanjutan diluluskan / Extension approved: Lengkapkan borang data murid');
  });

  it('describes a relief class by date, time and class, and a cancellation as such', () => {
    const email = buildEventEmail(relief, 'Cikgu Aminah', 'https://sapientia.test/staff/relief', 'a@s.test');
    expect(email.subject).toBe('Kelas ganti baharu / New relief class');
    expect(email.text).toContain('Anda diminta mengganti kelas Cikgu Ravi.');
    expect(email.text).toContain('Masa: 08:00 hingga 08:40');
    expect(email.text).toContain('Class: 4 Bestari, Matematik');
    const cancelled = buildEventEmail({ ...relief, kind: 'relief.cancelled', period: null }, 'Cikgu Aminah', null, 'a@s.test');
    expect(cancelled.subject).toBe('Kelas ganti dibatalkan / Relief class cancelled');
    expect(cancelled.text).toContain('You no longer need to cover it.');
    expect(cancelled.text).not.toContain('Kelas:');
  });

  it('escapes typed text in the HTML and keeps the subject on one line', () => {
    const email = buildEventEmail(
      { ...requested, taskTitle: '<script>x</script>\r\nBcc: x@evil.test', requesterName: 'A & B' }, 'P', null, 'p@s.test',
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('A &amp; B');
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).not.toContain('<a ');
  });
});

describe('buildEventPush', () => {
  it('opens the task for extension messages and the relief page for relief', () => {
    expect(buildEventPush(requested)).toEqual({
      title: 'Permohonan lanjutan',
      body: 'Lengkapkan borang data murid · Cikgu Fiksyen minta hingga 25 November 2026',
      url: `/staff/tasks/${TASK_ID}`,
      tag: `extension-${TASK_ID}`,
    });
    expect(buildEventPush(answered).title).toBe('Tarikh akhir baharu');
    expect(buildEventPush(relief)).toEqual({
      title: 'Kelas ganti',
      body: 'Cikgu Ravi · 16 November 2026 · 08:00 hingga 08:40',
      url: '/staff/relief',
      tag: `relief-${RELIEF_ID}`,
    });
  });

  it('lets a cancellation replace the assignment on the device', () => {
    expect(buildEventPush({ ...relief, kind: 'relief.cancelled' }).tag).toBe(buildEventPush(relief).tag);
  });
});
