import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { PahlawanMessages } from './pahlawan-messages.interface';

export const PAHLAWAN_MESSAGES: Record<Lang, PahlawanMessages> = {
  ms: {
    defaultName: 'Pahlawan',
    menuLabel: 'Pahlawan Saya',
    title: 'Pahlawan Saya',
    intro: 'Beri nama pahlawan anda dan pilih warna pakaiannya. Dia muncul dalam setiap pertarungan kuiz.',
    nameLabel: 'Nama pahlawan',
    partLabel: { clothes: 'Baju, seluar dan tengkolok', sampin: 'Sampin' },
    reset: 'Set semula',
    done: 'Siap',
    close: 'Tutup',
  },
  en: {
    defaultName: 'Warrior',
    menuLabel: 'My Warrior',
    title: 'My Warrior',
    intro: 'Name your pahlawan and choose the colours they wear. They appear in every quiz battle.',
    nameLabel: 'Warrior name',
    partLabel: { clothes: 'Baju, trousers and tengkolok', sampin: 'Sampin (waist cloth)' },
    reset: 'Reset',
    done: 'Done',
    close: 'Close',
  },
};
