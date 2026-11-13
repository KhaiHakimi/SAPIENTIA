import { describe, expect, it } from 'vitest';
import { renderReportPdf } from '../server/report-pdf.renderer';
import { renderReportXlsx } from '../server/report-xlsx.renderer';
import type { MonthlyReport } from '../interfaces/monthly-report.interface';
import { buildReportDocument } from './report-document.service';

const report = (overrides: Partial<MonthlyReport> = {}): MonthlyReport => ({
  month: '2026-10',
  schoolName: 'SK Taman Ilmu',
  period: { from: '2026-10-01', to: '2026-10-31' },
  generatedAt: '2026-11-13T02:00:00.000Z',
  timeZone: 'Asia/Kuala_Lumpur',
  lessons: {
    scheduled: 40, held: 30, notHeld: 4, notRecorded: 6,
    reasons: { official_duty: 3, leave: 0, school_programme: 1, pupils_away: 0, examination: 0, other: 0 },
    bySubject: [{ subject: 'Matematik', scheduled: 40, held: 30, notHeld: 4, notRecorded: 6 }],
    relief: { arranged: 5, recordedHeld: 4 },
  },
  tasks: {
    delivered: 12, due: 10, doneOnTime: 7, doneLate: 2, notDone: 1, flaggedDeadlines: 1,
    urgentOverrides: { count: 3, listed: [{ onDate: '2026-10-05', reason: '=HYPERLINK("https://example.test")' }] },
    extensions: { requested: 2, approved: 1, countered: 1, pending: 0 },
  },
  wellbeing: {
    teachingStaff: 8, workingDays: 21, averagesShown: true, averageFreeMinutesPerDay: 150, averageTaskMinutes: 300,
    flaggedDeadlines: 1, extensionRequests: 2,
  },
  sharedHours: [{ userId: 'u1', name: 'Cikgu Aminah', minutes: 600, sharedAt: '2026-10-31T10:00:00.000Z' }],
  ...overrides,
});

describe('buildReportDocument', () => {
  it('words the report in the chosen language, in a fixed section order', () => {
    const document = buildReportDocument(report(), 'en');
    expect(document.title).toBe('School Monthly Report: October 2026');
    expect(document.heading[1]).toBe('Covers 1 October 2026 to 31 October 2026.');
    expect(document.sections.map((section) => section.id)).toEqual([
      'lessons', 'reasons', 'subjects', 'relief', 'tasks', 'overrides', 'wellbeing', 'sharedHours',
    ]);
    const lessons = document.sections[0];
    expect(lessons.facts).toContainEqual({ label: 'Share held', value: '75%' });
    expect(buildReportDocument(report(), 'ms').title).toBe('Laporan Bulanan Sekolah: Oktober 2026');
  });

  it('lists only the reasons that were given, and says when the urgent list is cut short', () => {
    const document = buildReportDocument(report(), 'en');
    expect(document.sections.find((section) => section.id === 'reasons')?.table?.rows).toEqual([['Official duty', 3], ['School programme', 1]]);
    expect(document.sections.find((section) => section.id === 'overrides')?.notes).toContain('Showing the first 1 of 3.');
  });

  it('leaves the averages out, and says why, when they would single people out', () => {
    const wellbeing = {
      ...report().wellbeing, teachingStaff: 3, averagesShown: false, averageFreeMinutesPerDay: null, averageTaskMinutes: null,
    };
    const section = buildReportDocument(report({ wellbeing }), 'en').sections.find((part) => part.id === 'wellbeing');
    expect(section?.facts.map((fact) => fact.label)).not.toContain('Average free time per teacher per day');
    expect(section?.notes.join(' ')).toContain('fewer than 5 staff teach');
  });

  it('says so when no day of the month has finished', () => {
    expect(buildReportDocument(report({ period: null }), 'ms').heading[1]).toContain('Belum ada hari');
  });
});

describe('report files', () => {
  it('renders a PDF', async () => {
    const bytes = await renderReportPdf(buildReportDocument(report(), 'ms'));
    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('renders a PDF even when a name is in a script Helvetica cannot draw', async () => {
    const sharedHours = [{ userId: 'u2', name: '陈老师 சுந்தரி', minutes: 60, sharedAt: '2026-10-31T10:00:00.000Z' }];
    const bytes = await renderReportPdf(buildReportDocument(report({ sharedHours }), 'en'));
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('renders an Excel workbook', async () => {
    const bytes = await renderReportXlsx(buildReportDocument(report(), 'en'), 'en');
    // An .xlsx file is a zip archive.
    expect(Buffer.from(bytes.subarray(0, 2)).toString('latin1')).toBe('PK');
  });
});
