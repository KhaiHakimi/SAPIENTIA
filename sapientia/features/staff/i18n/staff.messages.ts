import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { StaffMessages } from './staff-messages.interface';

export const STAFF_MESSAGES: Record<Lang, StaffMessages> = {
  ms: {
    skipToContent: 'Langkau ke kandungan',
    mainNav: 'Menu utama',
    nav: { board: 'Papan Tugas', sent: 'Tugas Dihantar', newTask: 'Tugas Baharu', users: 'Pengguna' },
    roles: { admin: 'Pentadbir', sender: 'Pengirim tugas', teacher: 'Guru' },
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Tema',
    signOut: 'Log Keluar',
    signingOut: 'Log keluar…',
    loading: 'Memuatkan…',
    loadFailed: 'Tidak dapat memuatkan akaun anda.',
    retry: 'Cuba lagi',
  },
  en: {
    skipToContent: 'Skip to content',
    mainNav: 'Main menu',
    nav: { board: 'Task Board', sent: 'Sent Tasks', newTask: 'New Task', users: 'Users' },
    roles: { admin: 'Administrator', sender: 'Task sender', teacher: 'Teacher' },
    switchLanguage: 'Tukar bahasa / Switch language',
    theme: 'Theme',
    signOut: 'Sign Out',
    signingOut: 'Signing out…',
    loading: 'Loading…',
    loadFailed: 'Could not load your account.',
    retry: 'Try again',
  },
};
