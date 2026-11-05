import { describe, expect, it } from 'vitest';
import type { TaskNotice } from '../interfaces/notification.interface';
import { buildTaskEmail, buildTaskPush } from './notification-content';

const notice: TaskNotice = {
  taskId: '7d1c1b8e-0000-4000-8000-000000000001',
  title: 'Lengkapkan borang data murid',
  dueOn: '2026-11-20',
  senderName: 'Puan Contoh',
  recipientName: 'Cikgu Fiksyen',
  link: 'https://sapientia.test/staff/tasks/7d1c1b8e-0000-4000-8000-000000000001',
};

describe('buildTaskEmail', () => {
  it('says who sent what and when it is due, in Bahasa Melayu first and English after', () => {
    const email = buildTaskEmail(notice, 'guru@sekolah.test');
    expect(email.to).toBe('guru@sekolah.test');
    expect(email.subject).toBe('Tugas baharu / New task: Lengkapkan borang data murid');
    expect(email.text.indexOf('Tarikh akhir: Jumaat, 20 November 2026')).toBeGreaterThan(-1);
    expect(email.text.indexOf('Due: Friday, 20 November 2026')).toBeGreaterThan(email.text.indexOf('Tarikh akhir'));
    expect(email.text).toContain(`Buka tugas: ${notice.link}`);
    expect(email.html).toContain(`href="${notice.link}"`);
  });

  it('escapes typed text in the HTML and keeps the subject on one line', () => {
    const email = buildTaskEmail({ ...notice, title: '<img src=x onerror=alert(1)>\r\nBcc: x@evil.test', senderName: 'A & B' }, 'g@s.test');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('A &amp; B');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('leaves the link out when the public address is unknown', () => {
    const email = buildTaskEmail({ ...notice, link: null }, 'g@s.test');
    expect(email.text).not.toContain('Buka tugas');
    expect(email.html).not.toContain('<a ');
  });
});

describe('buildTaskPush', () => {
  it('opens the task page on this site and replaces an earlier notice for the same task', () => {
    expect(buildTaskPush(notice)).toEqual({
      title: 'Tugas baharu',
      body: 'Lengkapkan borang data murid · Tarikh akhir 20 November 2026',
      url: `/staff/tasks/${notice.taskId}`,
      tag: `task-${notice.taskId}`,
    });
  });
});
