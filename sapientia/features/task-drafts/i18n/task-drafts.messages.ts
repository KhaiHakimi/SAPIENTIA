import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { TaskDraftsMessages } from './task-drafts-messages.interface';

export const TASK_DRAFTS_MESSAGES: Record<Lang, TaskDraftsMessages> = {
  ms: {
    summary: 'Buat draf daripada arahan (AI)',
    intro: 'Tampal atau tulis arahan, contohnya mesej daripada mesyuarat. Pembantu AI mengisi tajuk, butiran, tarikh dan anggaran masa. Tiada apa-apa dihantar sehingga anda menyemak borang dan menekan Hantar.',
    privacy: 'Nama staf, murid dan penjaga, emel, nombor telefon dan nombor seperti MyKad dibuang sebelum arahan dihantar kepada model AI. Jangan taip butiran peribadi lain.',
    instruction: 'Arahan',
    instructionHelp: 'Satu tugasan bagi setiap arahan.',
    makeDraft: 'Buat draf',
    drafting: 'Membuat draf…',
    filled: 'Draf telah diisi dalam borang di bawah. Semak setiap medan, pilih penerima, kemudian tekan Hantar.',
    removed: (count) => `${count} butiran peribadi dibuang sebelum dihantar.`,
    dropped: (fields) => `Tidak diisi kerana cadangan AI tidak sah: ${fields}.`,
    fieldNames: { description: 'butiran', dueOn: 'tarikh akhir', estimatedMinutes: 'anggaran masa' },
    placeholderNote: '[nama], [emel] dan [nombor] menandakan butiran yang dibuang. Gantikannya jika perlu.',
  },
  en: {
    summary: 'Draft from an instruction (AI)',
    intro: 'Paste or write an instruction, for example a message from a meeting. The AI assistant fills in the title, details, date and time estimate. Nothing is sent until you check the form and press Send.',
    privacy: 'Names of staff, pupils and guardians, emails, phone numbers and MyKad-like numbers are removed before the instruction is sent to the AI model. Do not type other personal details.',
    instruction: 'Instruction',
    instructionHelp: 'One task per instruction.',
    makeDraft: 'Make draft',
    drafting: 'Drafting…',
    filled: 'The draft is in the form below. Check every field, choose the people, then press Send.',
    removed: (count) => `${count} personal detail(s) removed before sending.`,
    dropped: (fields) => `Left empty because the AI suggestion was not valid: ${fields}.`,
    fieldNames: { description: 'details', dueOn: 'due date', estimatedMinutes: 'time estimate' },
    placeholderNote: '[nama], [emel] and [nombor] mark details that were removed. Replace them if needed.',
  },
};
