import { formatDay } from '@/shared/i18n/format-date';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { EventNotice } from '../interfaces/event-notice.interface';
import type { EmailMessage, PushPayload } from '../interfaces/notification.interface';
import { EMAIL_FOOTER, escapeHtml, oneLine } from './message-text';
import { taskPath } from './notification-content';

/**
 * The words of the messages about extension requests, relief and meeting requests. Like the task message, email carries Bahasa Melayu first
 * and English below it, and push has one line in Bahasa Melayu. Nothing private goes out: no reason for a request, no
 * capacity figures, no reason for an absence.
 */

const RELIEF_PATH = '/staff/relief';
const MEETINGS_PATH = '/staff/meetings';

interface Wording {
  intro: string;
  details: string[];
  linkLabel: string;
}

export function eventPath(notice: EventNotice): string {
  switch (notice.kind) {
    case 'extension.requested':
    case 'extension.answered':
      return taskPath(notice.taskId);
    case 'meeting.requested':
      return MEETINGS_PATH;
    case 'relief.assigned':
    case 'relief.cancelled':
      return RELIEF_PATH;
  }
}

function subject(notice: EventNotice): string {
  switch (notice.kind) {
    case 'extension.requested':
      return `Permohonan lanjutan / Extension request: ${oneLine(notice.taskTitle)}`;
    case 'extension.answered':
      return notice.outcome === 'approved'
        ? `Lanjutan diluluskan / Extension approved: ${oneLine(notice.taskTitle)}`
        : `Tarikh akhir baharu / New due date: ${oneLine(notice.taskTitle)}`;
    case 'relief.assigned':
      return 'Kelas ganti baharu / New relief class';
    case 'relief.cancelled':
      return 'Kelas ganti dibatalkan / Relief class cancelled';
    case 'meeting.requested':
      return 'Permintaan pertemuan / Meeting request';
  }
}

function wording(notice: EventNotice, lang: Lang): Wording {
  const ms = lang === 'ms';
  const day = (isoDay: string) => formatDay(isoDay, lang, { weekday: true });
  switch (notice.kind) {
    case 'extension.requested': {
      const title = oneLine(notice.taskTitle);
      return ms
        ? {
            intro: `${notice.requesterName} meminta tarikh akhir yang lebih lewat untuk tugas yang anda hantar.`,
            details: [`Tugas: ${title}`, `Tarikh akhir sekarang: ${day(notice.currentDueOn)}`, `Tarikh yang diminta: ${day(notice.requestedDueOn)}`],
            linkLabel: 'Jawab permohonan',
          }
        : {
            intro: `${notice.requesterName} asks for a later due date on a task you sent.`,
            details: [`Task: ${title}`, `Due now: ${day(notice.currentDueOn)}`, `Date asked for: ${day(notice.requestedDueOn)}`],
            linkLabel: 'Answer the request',
          };
    }
    case 'extension.answered': {
      const title = oneLine(notice.taskTitle);
      const approved = notice.outcome === 'approved';
      return ms
        ? {
            intro: approved
              ? `${notice.deciderName} meluluskan permohonan lanjutan anda.`
              : `${notice.deciderName} menetapkan tarikh lain bagi permohonan lanjutan anda.`,
            details: [`Tugas: ${title}`, `Tarikh akhir baharu anda: ${day(notice.dueOn)}`],
            linkLabel: 'Buka tugas',
          }
        : {
            intro: approved
              ? `${notice.deciderName} approved your extension request.`
              : `${notice.deciderName} set a different date for your extension request.`,
            details: [`Task: ${title}`, `Your new due date: ${day(notice.dueOn)}`],
            linkLabel: 'Open the task',
          };
    }
    case 'meeting.requested':
      return ms
        ? {
            intro: 'Seorang penjaga meminta untuk bertemu dengan anda.',
            details: ['Buka Sapientia untuk melihat permintaan itu dan menjawabnya.'],
            linkLabel: 'Lihat permintaan pertemuan',
          }
        : {
            intro: 'A guardian has asked to meet you.',
            details: ['Open Sapientia to see the request and answer it.'],
            linkLabel: 'See the meeting request',
          };
    case 'relief.assigned':
    case 'relief.cancelled': {
      const cancelled = notice.kind === 'relief.cancelled';
      const period = notice.period ? oneLine(notice.period) : null;
      return ms
        ? {
            intro: cancelled
              ? `Kelas ganti anda untuk ${notice.absentTeacherName} telah dibatalkan. Anda tidak perlu menggantinya.`
              : `Anda diminta mengganti kelas ${notice.absentTeacherName}.`,
            details: [
            `Tarikh: ${day(notice.onDate)}`,
            `Masa: ${notice.startTime} hingga ${notice.endTime}`,
            ...(period ? [`Kelas: ${period}`] : []),
            ],
            linkLabel: 'Lihat kelas ganti anda',
          }
        : {
            intro: cancelled
              ? `Your relief class for ${notice.absentTeacherName} has been cancelled. You no longer need to cover it.`
              : `You are asked to cover a class for ${notice.absentTeacherName}.`,
            details: [`Date: ${day(notice.onDate)}`, `Time: ${notice.startTime} to ${notice.endTime}`, ...(period ? [`Class: ${period}`] : [])],
            linkLabel: 'See your relief classes',
          };
    }
  }
}

export function buildEventEmail(notice: EventNotice, recipientName: string, link: string | null, to: string): EmailMessage {
  const versions = [
    { lang: 'ms' as const, greeting: `Salam ${recipientName},`, words: wording(notice, 'ms') },
    { lang: 'en' as const, greeting: `Hello ${recipientName},`, words: wording(notice, 'en') },
  ];
  const textOf = ({ greeting, words }: (typeof versions)[number]) =>
    [greeting, words.intro, ...words.details, ...(link ? [`${words.linkLabel}: ${link}`] : [])];
  const htmlOf = ({ lang, greeting, words }: (typeof versions)[number]) => {
    const anchor = link ? `<p><a href="${escapeHtml(link)}">${escapeHtml(words.linkLabel)}</a></p>` : '';
    const details = words.details.map(escapeHtml).join('<br>');
    return `<div lang="${lang}"><p>${escapeHtml(greeting)}</p><p>${escapeHtml(words.intro)}</p><p>${details}</p>${anchor}</div>`;
  };

  return {
    to,
    subject: subject(notice),
    text: [...textOf(versions[0]), '', '---', '', ...textOf(versions[1]), '', ...EMAIL_FOOTER].join('\n'),
    html: `<!doctype html><html><body>${htmlOf(versions[0])}<hr>${htmlOf(versions[1])}<hr><small>${EMAIL_FOOTER.map(escapeHtml).join('<br>')}</small></body></html>`,
  };
}

export function buildEventPush(notice: EventNotice): PushPayload {
  const day = (isoDay: string) => formatDay(isoDay, 'ms');
  switch (notice.kind) {
    case 'extension.requested':
      return {
        title: 'Permohonan lanjutan',
        body: `${oneLine(notice.taskTitle)} · ${notice.requesterName} minta hingga ${day(notice.requestedDueOn)}`,
        url: eventPath(notice),
        tag: `extension-${notice.taskId}`,
      };
    case 'extension.answered':
      return {
        title: notice.outcome === 'approved' ? 'Lanjutan diluluskan' : 'Tarikh akhir baharu',
        body: `${oneLine(notice.taskTitle)} · Tarikh akhir ${day(notice.dueOn)}`,
        url: eventPath(notice),
        tag: `extension-${notice.taskId}`,
      };
    case 'relief.assigned':
    case 'relief.cancelled':
      return {
        title: notice.kind === 'relief.assigned' ? 'Kelas ganti' : 'Kelas ganti dibatalkan',
        body: `${notice.absentTeacherName} · ${day(notice.onDate)} · ${notice.startTime} hingga ${notice.endTime}`,
        url: eventPath(notice),
        // The cancellation replaces the assignment on the device rather than sitting beside it.
        tag: `relief-${notice.reliefId}`,
      };
    case 'meeting.requested':
      return {
        title: 'Permintaan pertemuan',
        body: 'Seorang penjaga meminta untuk bertemu dengan anda.',
        url: eventPath(notice),
        tag: `meeting-${notice.meetingId}`,
      };
  }
}
