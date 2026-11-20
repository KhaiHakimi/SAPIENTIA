'use client';

import { useQuery } from '@tanstack/react-query';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { HOMEWORK_MESSAGES } from '../i18n/homework.messages';
import { fetchMyHomework, MY_HOMEWORK_KEY } from '../services/homework.client';
import styles from '../styles/Homework.module.css';
import { HomeworkItem } from './HomeworkItem';
import { SetHomeworkForm } from './SetHomeworkForm';

/** Any member of staff who teaches: set homework, see their own, tick hand-ins and marking (plan Phase 4, Sprint 12). */
export function HomeworkPage() {
  const user = useStaffUser();
  const text = useMessages(HOMEWORK_MESSAGES);
  const { lang } = useLanguage();
  const mine = useQuery({ queryKey: MY_HOMEWORK_KEY, queryFn: fetchMyHomework });

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </div>
      </div>

      {mine.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : mine.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(mine.error, lang)}</div>
      ) : (
        <div className={calm.grid2}>
          <section className={calm.card} aria-labelledby="my-homework-title">
            <h2 id="my-homework-title">{text.listTitle}</h2>
            {mine.data.items.length === 0 ? (
              <p className={calm.empty}>{text.empty}</p>
            ) : (
              <ul className={styles.items}>
                {mine.data.items.map((homework) => (
                  <HomeworkItem key={homework.id} text={text} homework={homework} timeZone={user.timeZone} />
                ))}
              </ul>
            )}
          </section>
          {mine.data.lessons.length === 0 ? (
            <section className={calm.card} aria-labelledby="set-homework-title">
              <h2 id="set-homework-title">{text.setTitle}</h2>
              <p className={calm.empty}>{text.noLessons}</p>
            </section>
          ) : (
            <SetHomeworkForm text={text} lessons={mine.data.lessons} />
          )}
        </div>
      )}
    </>
  );
}
