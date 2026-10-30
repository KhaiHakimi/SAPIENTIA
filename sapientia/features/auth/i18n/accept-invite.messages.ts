import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { PASSWORD_MIN_LENGTH } from '../constants/password.constants';
import type { AcceptInviteMessages } from './accept-invite-messages.interface';

export const ACCEPT_INVITE_MESSAGES: Record<Lang, AcceptInviteMessages> = {
  ms: {
    title: 'Selamat datang',
    subtitle: 'Tetapkan kata laluan untuk akaun Sapientia anda.',
    password: 'Kata laluan baharu',
    passwordHelp: `Sekurang-kurangnya ${PASSWORD_MIN_LENGTH} aksara. Frasa beberapa perkataan mudah diingati.`,
    confirm: 'Taip semula kata laluan',
    show: 'Tunjuk',
    hide: 'Sembunyi',
    submit: 'Tetapkan kata laluan',
    submitting: 'Menyimpan…',
    missingToken: 'Pautan jemputan tidak lengkap. Buka semula pautan daripada pentadbir anda.',
    invalidLink: 'Pautan jemputan ini tidak sah, sudah digunakan atau telah tamat tempoh. Minta pautan baharu daripada pentadbir.',
    done: (name) => `Kata laluan disimpan. Selamat datang, ${name}. Membuka Papan Tugas…`,
    backToLogin: 'Ke halaman log masuk',
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Tema',
  },
  en: {
    title: 'Welcome',
    subtitle: 'Set a password for your Sapientia account.',
    password: 'New password',
    passwordHelp: `At least ${PASSWORD_MIN_LENGTH} characters. A phrase of a few words is easy to remember.`,
    confirm: 'Type the password again',
    show: 'Show',
    hide: 'Hide',
    submit: 'Set password',
    submitting: 'Saving…',
    missingToken: 'The invite link is incomplete. Open the link from your administrator again.',
    invalidLink: 'This invite link is not valid, has been used, or has expired. Ask your administrator for a new one.',
    done: (name) => `Password saved. Welcome, ${name}. Opening your Task Board…`,
    backToLogin: 'Go to sign-in',
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Theme',
  },
};
