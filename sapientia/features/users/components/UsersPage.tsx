'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { USERS_MESSAGES } from '../i18n/users.messages';
import { fetchUsersPage, USERS_KEY } from '../services/users.client';
import { InviteUserForm } from './InviteUserForm';

const STATUS_BADGE = { active: calm.badgeOk, invited: calm.badgeAccent, disabled: calm.badgeDanger } as const;

/** Administrators: the school's accounts, and inviting new ones. */
export function UsersPage() {
  const text = useMessages(USERS_MESSAGES);
  const { lang } = useLanguage();
  const users = useInfiniteQuery({
    queryKey: USERS_KEY,
    queryFn: ({ pageParam }) => fetchUsersPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = users.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </div>
      </div>
      <div className={calm.grid2}>
        <section className={calm.card} aria-labelledby="users-title">
          <h2 id="users-title">{text.listTitle}</h2>
          {users.isPending ? (
            <p className={calm.loading} role="status">{text.loadingMore}</p>
          ) : users.isError ? (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(users.error, lang)}</div>
          ) : rows.length === 0 ? (
            <p className={calm.empty}>{text.empty}</p>
          ) : (
            <div className={calm.tableWrap}>
              <table className={calm.table}>
                <thead>
                  <tr>
                    <th scope="col">{text.columns.name}</th>
                    <th scope="col">{text.columns.role}</th>
                    <th scope="col">{text.columns.status}</th>
                    <th scope="col">{text.columns.lastSignIn}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {user.name}
                        <div className={`${calm.muted} ${calm.code}`}>{user.email}</div>
                      </td>
                      <td>{text.roles[user.role]}</td>
                      <td><span className={`${calm.badge} ${STATUS_BADGE[user.status]}`}>{text.statuses[user.status]}</span></td>
                      <td>{user.lastSignInAt ? formatDate(user.lastSignInAt, lang, { withTime: true }) : text.never}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {users.hasNextPage && (
            <p>
              <button type="button" className={calm.button} onClick={() => users.fetchNextPage()} disabled={users.isFetchingNextPage}>
                {users.isFetchingNextPage ? text.loadingMore : text.loadMore}
              </button>
            </p>
          )}
        </section>
        <InviteUserForm text={text} />
      </div>
    </>
  );
}
