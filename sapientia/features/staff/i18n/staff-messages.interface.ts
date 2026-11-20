import type { StaffRole } from '@/features/auth/interfaces/session-user.interface';
import type { StaffNavKey } from '../constants/staff-nav.constants';

export interface StaffMessages {
  skipToContent: string;
  mainNav: string;
  nav: Record<StaffNavKey, string>;
  roles: Record<StaffRole, string>;
  switchLanguage: string;
  theme: string;
  signOut: string;
  signingOut: string;
  loading: string;
  loadFailed: string;
  retry: string;
}
