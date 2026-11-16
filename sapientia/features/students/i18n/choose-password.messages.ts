import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { STUDENT_PASSWORD_MIN_LENGTH } from '../constants/students.constants';
import type { ChoosePasswordMessages } from './choose-password-messages.interface';

export const CHOOSE_PASSWORD_MESSAGES: Record<Lang, ChoosePasswordMessages> = {
  ms: {
    title: 'Pilih kata laluan anda',
    subtitle: (name) => `Hai ${name}! Sebelum mula, gantikan kata laluan pada slip dengan kata laluan anda sendiri.`,
    currentPassword: 'Kata laluan pada slip',
    currentHelp: 'Seperti yang tertulis pada slip, termasuk tanda sempang.',
    newPassword: 'Kata laluan baharu',
    newHelp: `Sekurang-kurangnya ${STUDENT_PASSWORD_MIN_LENGTH} aksara. Jangan beritahu sesiapa, termasuk kawan.`,
    confirm: 'Taip semula kata laluan baharu',
    show: 'Tunjuk',
    hide: 'Sembunyi',
    submit: 'Simpan kata laluan',
    submitting: 'Menyimpan…',
    signOut: 'Log keluar',
    loading: 'Memuatkan…',
    fieldErrors: {
      wrong_password: 'Kata laluan slip tidak betul. Semak semula slip anda.',
      same_password: 'Pilih kata laluan yang berbeza daripada slip.',
      too_short: `Terlalu pendek: sekurang-kurangnya ${STUDENT_PASSWORD_MIN_LENGTH} aksara.`,
      mismatch: 'Kata laluan tidak sama.',
    },
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Tema',
  },
  en: {
    title: 'Choose your password',
    subtitle: (name) => `Hi ${name}! Before you start, replace the password on your slip with one of your own.`,
    currentPassword: 'Password on the slip',
    currentHelp: 'Exactly as written on the slip, including the dash.',
    newPassword: 'New password',
    newHelp: `At least ${STUDENT_PASSWORD_MIN_LENGTH} characters. Do not tell anyone, not even friends.`,
    confirm: 'Type the new password again',
    show: 'Show',
    hide: 'Hide',
    submit: 'Save password',
    submitting: 'Saving…',
    signOut: 'Sign out',
    loading: 'Loading…',
    fieldErrors: {
      wrong_password: 'The slip password is not right. Check your slip again.',
      same_password: 'Choose a password different from the slip.',
      too_short: `Too short: at least ${STUDENT_PASSWORD_MIN_LENGTH} characters.`,
      mismatch: 'The passwords do not match.',
    },
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Theme',
  },
};
