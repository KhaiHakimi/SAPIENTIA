import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { DuplicatesMessages } from './duplicates-messages.interface';

export const DUPLICATES_MESSAGES: Record<Lang, DuplicatesMessages> = {
  ms: {
    title: (count) => (count === 1 ? 'Tugasan serupa masih terbuka:' : `${count} tugasan serupa masih terbuka:`),
    sentByMe: 'dihantar oleh anda',
    sentBy: (name) => `dihantar oleh ${name}`,
    due: (day) => `tarikh akhir ${day}`,
    shared: (count) => (count === 0 ? '' : `${count} orang yang anda pilih sudah menerimanya`),
    open: 'Buka',
    stillSend: 'Jika ini tugasan baharu, anda masih boleh menghantarnya.',
  },
  en: {
    title: (count) => (count === 1 ? 'A similar task is still open:' : `${count} similar tasks are still open:`),
    sentByMe: 'sent by you',
    sentBy: (name) => `sent by ${name}`,
    due: (day) => `due ${day}`,
    shared: (count) => (count === 0 ? '' : `${count} of the people you chose already have it`),
    open: 'Open',
    stillSend: 'If this is a new task, you can still send it.',
  },
};
