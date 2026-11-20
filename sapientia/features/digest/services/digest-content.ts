import type { EmailMessage } from '@/features/notifications/interfaces/notification.interface';
import { escapeHtml, oneLine } from '@/features/notifications/services/message-text';
import { formatDay } from '@/shared/i18n/format-date';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { DigestRelief, DigestTask, WeeklyDigest } from '../interfaces/digest.interface';

const FOOTER: readonly string[] = [
  'Anda menerima e-mel ini kerana ringkasan mingguan dihidupkan. Matikannya di halaman Pemberitahuan.',
  'You receive this email because the weekly summary is on. Turn it off on the Notifications page.',
];

interface Section {
  heading: string;
  lines: string[];
}

const WORDS = {
  ms: {
    hello: (name: string) => `Salam ${name},`,
    intro: (from: string, to: string) => `Ini ringkasan kerja anda untuk minggu ${from} hingga ${to}.`,
    overdue: (count: number) => `Sudah lewat (${count})`,
    dueThisWeek: (count: number) => `Tarikh akhir minggu ini (${count})`,
    relief: 'Kelas ganti minggu ini',
    extensions: (count: number) => `${count} permohonan tambahan masa menunggu jawapan anda.`,
    more: (count: number) => `…dan ${count} lagi`,
    due: (day: string) => `tarikh akhir ${day}`,
    noClass: 'kelas tidak dinyatakan',
    open: 'Buka papan tugas',
  },
  en: {
    hello: (name: string) => `Hello ${name},`,
    intro: (from: string, to: string) => `Here is your work for the week of ${from} to ${to}.`,
    overdue: (count: number) => `Overdue (${count})`,
    dueThisWeek: (count: number) => `Due this week (${count})`,
    relief: 'Relief classes this week',
    extensions: (count: number) => `${count} request(s) for more time are waiting for your answer.`,
    more: (count: number) => `…and ${count} more`,
    due: (day: string) => `due ${day}`,
    noClass: 'class not given',
    open: 'Open the task board',
  },
} satisfies Record<Lang, unknown>;

/** True when there is nothing to tell this person this week: no email is sent then. */
export function isDigestEmpty(digest: WeeklyDigest): boolean {
  return digest.overdueCount === 0 && digest.dueThisWeekCount === 0 && digest.relief.length === 0 && digest.extensionsWaiting === 0;
}

function sections(digest: WeeklyDigest, lang: Lang): Section[] {
  const words = WORDS[lang];
  const taskLines = (tasks: DigestTask[], total: number) => [
    ...tasks.map((task) => `${oneLine(task.title)} (${words.due(formatDay(task.dueOn, lang, { weekday: true }))})`),
    ...(total > tasks.length ? [words.more(total - tasks.length)] : []),
  ];
  const reliefLine = (relief: DigestRelief) =>
    `${formatDay(relief.onDate, lang, { weekday: true })}, ${relief.startTime}-${relief.endTime}: ${relief.className ? oneLine(relief.className) : words.noClass}`;
  return [
    ...(digest.overdueCount > 0
      ? [{ heading: words.overdue(digest.overdueCount), lines: taskLines(digest.overdue, digest.overdueCount) }]
      : []),
    ...(digest.dueThisWeekCount > 0
      ? [{ heading: words.dueThisWeek(digest.dueThisWeekCount), lines: taskLines(digest.dueThisWeek, digest.dueThisWeekCount) }]
      : []),
    ...(digest.relief.length > 0 ? [{ heading: words.relief, lines: digest.relief.map(reliefLine) }] : []),
  ];
}

function textBlock(digest: WeeklyDigest, lang: Lang): string[] {
  const words = WORDS[lang];
  const from = formatDay(digest.week.weekOf, lang);
  const to = formatDay(digest.week.weekEndsOn, lang);
  return [
    words.hello(digest.recipientName),
    words.intro(from, to),
    ...sections(digest, lang).flatMap((section) => ['', `${section.heading}:`, ...section.lines.map((line) => `- ${line}`)]),
    ...(digest.extensionsWaiting > 0 ? ['', words.extensions(digest.extensionsWaiting)] : []),
    ...(digest.boardLink ? ['', `${words.open}: ${digest.boardLink}`] : []),
  ];
}

function htmlBlock(digest: WeeklyDigest, lang: Lang): string {
  const words = WORDS[lang];
  const from = formatDay(digest.week.weekOf, lang);
  const to = formatDay(digest.week.weekEndsOn, lang);
  const list = (section: Section) =>
    `<h3>${escapeHtml(section.heading)}</h3><ul>${section.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
  return [
    `<div lang="${lang}">`,
    `<p>${escapeHtml(words.hello(digest.recipientName))}</p>`,
    `<p>${escapeHtml(words.intro(from, to))}</p>`,
    ...sections(digest, lang).map(list),
    digest.extensionsWaiting > 0 ? `<p>${escapeHtml(words.extensions(digest.extensionsWaiting))}</p>` : '',
    digest.boardLink ? `<p><a href="${escapeHtml(digest.boardLink)}">${escapeHtml(words.open)}</a></p>` : '',
    '</div>',
  ].join('');
}

/**
 * The Monday email (plan Phase 6 weekly digest). Like the other messages it carries Bahasa Melayu first and English below,
 * because accounts have no saved language yet. Titles and class names are typed by people, so they are escaped and kept on
 * one line. It lists only the recipient's own work.
 */
export function buildDigestEmail(digest: WeeklyDigest, to: string): EmailMessage {
  return {
    to,
    subject: `Ringkasan minggu ini / This week's summary: ${formatDay(digest.week.weekOf, 'ms')}`,
    text: [...textBlock(digest, 'ms'), '', '---', '', ...textBlock(digest, 'en'), '', ...FOOTER].join('\n'),
    html: `<!doctype html><html><body>${htmlBlock(digest, 'ms')}<hr>${htmlBlock(digest, 'en')}<hr><small>${FOOTER.map(escapeHtml).join('<br>')}</small></body></html>`,
  };
}
