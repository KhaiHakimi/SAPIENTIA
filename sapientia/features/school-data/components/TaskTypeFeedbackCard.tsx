'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { TIME_TAKEN_OPTIONS } from '@/features/tasks/constants/task.constants';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { SchoolDataMessages } from '../i18n/school-data-messages.interface';
import { fetchTaskTypeFeedback, TASK_TYPE_FEEDBACK_KEY } from '../services/school-data.client';
import { FEEDBACK_MIN_ANSWERS, feedbackVerdict } from '../services/time-feedback';

/**
 * What teachers said finished tasks took, counted per task type beside its estimate (plan Phase 2: the completion question
 * improves estimates). Counts only, and only once enough people have answered; there is nothing here about any one person.
 */
export function TaskTypeFeedbackCard({ text }: { text: SchoolDataMessages }) {
  const { lang } = useLanguage();
  const feedback = useQuery({ queryKey: TASK_TYPE_FEEDBACK_KEY, queryFn: fetchTaskTypeFeedback });

  return (
    <section className={calm.card} aria-labelledby="feedback-title">
      <h2 id="feedback-title">{text.feedback.title}</h2>
      <p className={calm.muted}>{text.feedback.intro}</p>
      {feedback.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : feedback.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(feedback.error, lang)}</div>
      ) : feedback.data.length === 0 ? (
        <p className={calm.empty}>{text.feedback.empty(FEEDBACK_MIN_ANSWERS)}</p>
      ) : (
        <div className={calm.tableWrap}>
          <table className={calm.table}>
            <thead>
              <tr>
                <th scope="col">{text.feedback.columns.type}</th>
                <th scope="col">{text.columns.estimate}</th>
                {TIME_TAKEN_OPTIONS.map((option) => <th key={option} scope="col">{text.feedback.options[option]}</th>)}
                <th scope="col">{text.feedback.columns.verdict}</th>
              </tr>
            </thead>
            <tbody>
              {feedback.data.map((item) => (
                <tr key={item.taskTypeId}>
                  <th scope="row">{item.name}</th>
                  <td>{formatDuration(item.estimatedMinutes, lang)}</td>
                  {TIME_TAKEN_OPTIONS.map((option) => <td key={option}>{item.answers[option]}</td>)}
                  <td>{text.feedback.verdicts[feedbackVerdict(item.estimatedMinutes, item.answers)]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
