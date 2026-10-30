import type { StaffRole, StaffStatus } from '@/features/auth/interfaces/session-user.interface';

export interface UsersMessages {
  title: string;
  intro: string;
  listTitle: string;
  columns: { name: string; email: string; role: string; status: string; lastSignIn: string };
  roles: Record<StaffRole, string>;
  statuses: Record<StaffStatus, string>;
  never: string;
  empty: string;
  loadMore: string;
  loadingMore: string;
  inviteTitle: string;
  inviteIntro: string;
  name: string;
  email: string;
  role: string;
  chooseRole: string;
  send: string;
  sending: string;
  invited: (name: string) => string;
  linkLabel: string;
  linkHelp: (expires: string) => string;
  copy: string;
  copied: string;
  copyFailed: string;
}
