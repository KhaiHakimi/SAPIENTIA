import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { CapacityMessages } from './capacity-messages.interface';

export const CAPACITY_MESSAGES: Record<Lang, CapacityMessages> = {
  ms: {
    needsEstimate: 'Pilih jenis tugas atau masukkan anggaran masa untuk menyemak sama ada tarikh akhir ini munasabah.',
    checking: 'Menyemak masa lapang penerima…',
    checkFailed: 'Semakan masa tidak dapat dibuat sekarang. Anda masih boleh menghantar tugas.',
    allFit: (count) => (count === 1
      ? 'Penerima mempunyai masa bekerja yang cukup sebelum tarikh akhir.'
      : `Kesemua ${count} penerima mempunyai masa bekerja yang cukup sebelum tarikh akhir.`),
    warningTitle: (short, total) => `Amaran: ${short} daripada ${total} penerima tidak mempunyai masa bekerja yang cukup sebelum tarikh akhir.`,
    shortLine: (name, needed, free) => `${name}: perlu ${needed}, hanya ${free} lapang.`,
    breakdown: (teaching, committed) => `Jadual waktu: ${teaching}. Tugas lain yang belum selesai: ${committed}.`,
    earliest: (day) => `Tarikh paling awal yang munasabah: ${day}.`,
    noEarliest: 'Tiada tarikh munasabah ditemui dalam empat bulan akan datang.',
    useDate: (day) => `Tukar tarikh akhir kepada ${day}`,
    stillSend: 'Anda masih boleh menghantar. Tugas akan ditanda "tarikh akhir ketat" supaya guru boleh memohon lanjutan.',
  },
  en: {
    needsEstimate: 'Choose a task type or enter a time estimate to check whether this due date is realistic.',
    checking: 'Checking the assignees\' free time…',
    checkFailed: 'The time check is not available right now. You can still send the task.',
    allFit: (count) => (count === 1
      ? 'The assignee has enough working time before the due date.'
      : `All ${count} assignees have enough working time before the due date.`),
    warningTitle: (short, total) => `Warning: not enough working time before the due date for ${short} of ${total} assignees.`,
    shortLine: (name, needed, free) => `${name}: needs ${needed}, only ${free} free.`,
    breakdown: (teaching, committed) => `Timetable: ${teaching}. Other unfinished tasks: ${committed}.`,
    earliest: (day) => `Earliest realistic date: ${day}.`,
    noEarliest: 'No realistic date found in the next four months.',
    useDate: (day) => `Change the due date to ${day}`,
    stillSend: 'You can still send it. The task will be marked "tight deadline" so the teacher can ask for an extension.',
  },
};
