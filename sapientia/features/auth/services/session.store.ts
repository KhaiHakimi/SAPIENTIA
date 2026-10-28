import { createPersistentStore } from '@/shared/services/persistent-store';
import { accountById } from './auth.service';

/**
 * The signed-in account's id, never the password. An id that no longer matches a demo account counts as signed out. This is a
 * client-side demo gate, not security: anyone can set the key by hand. Real sessions need a server-issued cookie (plan Sprint 2).
 */
export const sessionStore = createPersistentStore<string | null>({
  key: 'sapientia.session',
  defaultValue: null,
  parse: (raw) => (accountById(raw) ? raw : null),
  serialize: (id) => id ?? '',
});
