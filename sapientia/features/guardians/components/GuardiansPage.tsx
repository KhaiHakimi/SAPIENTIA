'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { GUARDIANS_MESSAGES } from '../i18n/guardians.messages';
import type { GuardianSlip } from '../interfaces/guardian.interface';
import { fetchGuardiansPage, GUARDIANS_KEY } from '../services/guardians.client';
import { AddGuardianForm } from './AddGuardianForm';
import { GuardianRow } from './GuardianRow';
import { GuardianSlipCard } from './GuardianSlipCard';

/** Administrators: guardians, their links to pupils, and the slips to print (plan Phase 4, Sprint 13). */
export function GuardiansPage() {
  const text = useMessages(GUARDIANS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const [slip, setSlip] = useState<GuardianSlip | null>(null);
  const guardians = useInfiniteQuery({
    queryKey: GUARDIANS_KEY,
    queryFn: ({ pageParam }) => fetchGuardiansPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = guardians.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <p className={calm.help}>{text.dataNote}</p>
        </div>
      </div>

      {slip && (
        <GuardianSlipCard text={text} slip={slip} schoolName={user.schoolName} timeZone={user.timeZone} onDone={() => setSlip(null)} />
      )}

      <div className={calm.grid2}>
        <section className={calm.card} aria-labelledby="guardians-title">
          <h2 id="guardians-title">{text.listTitle}</h2>
          {guardians.isPending ? (
            <p className={calm.loading} role="status">{text.loading}</p>
          ) : guardians.isError ? (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(guardians.error, lang)}</div>
          ) : rows.length === 0 ? (
            <p className={calm.empty}>{text.empty}</p>
          ) : (
            <div className={calm.tableWrap}>
              <table className={calm.table}>
                <thead>
                  <tr>
                    <th scope="col">{text.columns.name}</th>
                    <th scope="col">{text.columns.username}</th>
                    <th scope="col">{text.columns.children}</th>
                    <th scope="col">{text.columns.status}</th>
                    <th scope="col"><span className="sr-only">{text.manageButton}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((guardian) => <GuardianRow key={guardian.id} text={text} guardian={guardian} onSlip={setSlip} />)}
                </tbody>
              </table>
            </div>
          )}
          {guardians.hasNextPage && (
            <p>
              <button type="button" className={calm.button} onClick={() => guardians.fetchNextPage()} disabled={guardians.isFetchingNextPage}>
                {guardians.isFetchingNextPage ? text.loading : text.loadMore}
              </button>
            </p>
          )}
        </section>
        <AddGuardianForm text={text} onAdded={(result) => setSlip(result.slip)} />
      </div>
    </>
  );
}
