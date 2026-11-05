import { formatDay } from '@/shared/i18n/format-date';
import type { EmailMessage, PushPayload, TaskNotice } from '../interfaces/notification.interface';

/**
 * The words of a "task reached you" message. Accounts have no saved language yet, so email carries Bahasa Melayu first and
 * English below it (plan: BM by default, English available), and push, which has room for one line, is in Bahasa Melayu.
 * Task titles and names are typed by people, so they are escaped in HTML and kept on one line in the subject.
 */

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const oneLine = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim();

export function taskPath(taskId: string): string {
  return `/staff/tasks/${encodeURIComponent(taskId)}`;
}

export function buildTaskEmail(notice: TaskNotice, to: string): EmailMessage {
  const title = oneLine(notice.title);
  const dueMs = formatDay(notice.dueOn, 'ms', { weekday: true });
  const dueEn = formatDay(notice.dueOn, 'en', { weekday: true });

  const ms = [
    `Salam ${notice.recipientName},`,
    `${notice.senderName} telah memberi anda tugas baharu dalam Sapientia.`,
    `Tugas: ${title}`,
    `Tarikh akhir: ${dueMs}`,
    ...(notice.link ? [`Buka tugas: ${notice.link}`] : []),
  ];
  const en = [
    `Hello ${notice.recipientName},`,
    `${notice.senderName} has given you a new task in Sapientia.`,
    `Task: ${title}`,
    `Due: ${dueEn}`,
    ...(notice.link ? [`Open the task: ${notice.link}`] : []),
  ];
  const footer = [
    'Anda menerima e-mel ini kerana pemberitahuan e-mel dihidupkan. Tukar tetapan ini di halaman Pemberitahuan.',
    'You receive this email because email notifications are on. Change this on the Notifications page.',
  ];

  const paragraph = (line: string) => `<p>${escapeHtml(line)}</p>`;
  const block = (lines: string[], lang: string) => {
    const [greeting, intro, task, due] = lines;
    const link = notice.link
      ? `<p><a href="${escapeHtml(notice.link)}">${lang === 'ms' ? 'Buka tugas' : 'Open the task'}</a></p>`
      : '';
    return `<div lang="${lang}">${paragraph(greeting)}${paragraph(intro)}<p><strong>${escapeHtml(task)}</strong><br>${escapeHtml(due)}</p>${link}</div>`;
  };

  return {
    to,
    subject: `Tugas baharu / New task: ${title}`,
    text: [...ms, '', '---', '', ...en, '', ...footer].join('\n'),
    html: `<!doctype html><html><body>${block(ms, 'ms')}<hr>${block(en, 'en')}<hr><small>${footer.map(escapeHtml).join('<br>')}</small></body></html>`,
  };
}

export function buildTaskPush(notice: TaskNotice): PushPayload {
  return {
    title: 'Tugas baharu',
    body: `${oneLine(notice.title)} · Tarikh akhir ${formatDay(notice.dueOn, 'ms')}`,
    url: taskPath(notice.taskId),
    // One notification per task on the device: a resend replaces it instead of stacking a second.
    tag: `task-${notice.taskId}`,
  };
}
