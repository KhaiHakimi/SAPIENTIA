import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { PahlawanMessages } from './pahlawan-messages.interface';

export const PAHLAWAN_MESSAGES: Record<Lang, PahlawanMessages> = {
  ms: {
    defaultName: 'Pahlawan',
    menuLabel: 'Pahlawan Saya',
    title: 'Pahlawan Saya',
    intro: 'Beri nama pahlawan anda. Dia muncul dalam setiap pertarungan kuiz.',
    nameLabel: 'Nama pahlawan',
    reset: 'Set semula',
    done: 'Siap',
    close: 'Tutup',
  },
  en: {
    defaultName: 'Warrior',
    menuLabel: 'My Warrior',
    title: 'My Warrior',
    intro: 'Name your pahlawan. They appear in every quiz battle.',
    nameLabel: 'Warrior name',
    reset: 'Reset',
    done: 'Done',
    close: 'Close',
  },
};
