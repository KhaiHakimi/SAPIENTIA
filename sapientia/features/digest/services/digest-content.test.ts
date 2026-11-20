import { describe, expect, it } from 'vitest';
import type { WeeklyDigest } from '../interfaces/digest.interface';
import { buildDigestEmail, isDigestEmpty } from './digest-content';

const EMPTY: WeeklyDigest = {
  recipientName: 'Mei Ling',
  week: { weekOf: '2026-11-23', weekEndsOn: '2026-11-29', today: '2026-11-23' },
  overdue: [], dueThisWeek: [], overdueCount: 0, dueThisWeekCount: 0, relief: [], extensionsWaiting: 0, boardLink: null,
};

describe('the weekly digest email', () => {
  it('is empty with nothing due, overdue, no relief and no requests waiting', () => {
    expect(isDigestEmpty(EMPTY)).toBe(true);
    expect(isDigestEmpty({ ...EMPTY, extensionsWaiting: 1 })).toBe(false);
    expect(isDigestEmpty({ ...EMPTY, relief: [{ onDate: '2026-11-24', startTime: '08:00', endTime: '08:30', className: '4 Bestari' }] })).toBe(false);
  });

  it('lists the work in both languages, with a count of what did not fit', () => {
    const email = buildDigestEmail({
      ...EMPTY,
      overdue: [{ taskId: 't1', title: 'Rekod PBD', dueOn: '2026-11-20' }],
      overdueCount: 1,
      dueThisWeek: [{ taskId: 't2', title: 'Laporan kokurikulum', dueOn: '2026-11-26' }],
      dueThisWeekCount: 4,
      relief: [{ onDate: '2026-11-24', startTime: '08:00', endTime: '08:30', className: null }],
      extensionsWaiting: 2,
      boardLink: 'https://sapientia.test/staff',
    }, 'meiling@sekolah.test');
    expect(email.to).toBe('meiling@sekolah.test');
    expect(email.text).toContain('Sudah lewat (1):');
    expect(email.text).toContain('- Rekod PBD');
    expect(email.text).toContain('Tarikh akhir minggu ini (4):');
    expect(email.text).toContain('…dan 3 lagi');
    expect(email.text).toContain('Due this week (4):');
    expect(email.text).toContain('…and 3 more');
    expect(email.text).toContain('08:00-08:30: kelas tidak dinyatakan');
    expect(email.text).toContain('2 permohonan tambahan masa');
    expect(email.text).toContain('Open the task board: https://sapientia.test/staff');
    expect(email.html).toContain('<a href="https://sapientia.test/staff">');
  });

  it('escapes typed text in HTML and keeps the subject to one line', () => {
    const email = buildDigestEmail({
      ...EMPTY, recipientName: '<b>x</b>', dueThisWeek: [{ taskId: 't', title: 'A <script>\nB', dueOn: '2026-11-26' }], dueThisWeekCount: 1,
    }, 'a@b.test');
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>x</b>');
    expect(email.text).toContain('A <script> B');
    expect(email.subject).not.toMatch(/\n/);
  });
});
