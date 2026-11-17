'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { HandInList } from '../interfaces/homework.interface';
import type { HomeworkMessages } from '../i18n/homework-messages.interface';
import { fetchHandIns, handInsKey, MY_HOMEWORK_KEY, setHandIn } from '../services/homework.client';
import styles from '../styles/Homework.module.css';

interface HandInPanelProps {
  text: HomeworkMessages;
  homeworkId: string;
}

/**
 * The class list for paper hand-ins (story S12-3): one toggle button per pupil, pressed when their hand-in is recorded. The
 * tick shows at once and is undone if the server refuses it.
 */
export function HandInPanel({ text, homeworkId }: HandInPanelProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const key = handInsKey(homeworkId);
  const list = useQuery({ queryKey: key, queryFn: () => fetchHandIns(homeworkId) });

  const tick = useMutation({
    mutationFn: ({ studentId, handedIn }: { studentId: string; handedIn: boolean }) => setHandIn(homeworkId, studentId, handedIn),
    onMutate: async ({ studentId, handedIn }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<HandInList>(key);
      queryClient.setQueryData<HandInList>(key, (current) => current && {
        ...current,
        pupils: current.pupils.map((pupil) => (pupil.id === studentId ? { ...pupil, handedIn } : pupil)),
      });
      return { before };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: MY_HOMEWORK_KEY });
    },
  });

  return (
    <div className={styles.handIns}>
      <h3 className={styles.previewTitle}>{text.handInsTitle}</h3>
      <p className={calm.help}>{text.handInsHelp}</p>
      {tick.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(tick.error, lang)}</div>}
      {list.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : list.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(list.error, lang)}</div>
      ) : list.data.pupils.length === 0 ? (
        <p className={calm.empty}>{text.handInsEmpty}</p>
      ) : (
        <ul className={styles.pupils}>
          {list.data.pupils.map((pupil) => (
            <li key={pupil.id}>
              <button type="button" className={styles.pupil} aria-pressed={pupil.handedIn}
                onClick={() => tick.mutate({ studentId: pupil.id, handedIn: !pupil.handedIn })}>
                <span aria-hidden="true" className={styles.tick}>{pupil.handedIn ? '✓' : ''}</span>
                {pupil.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
