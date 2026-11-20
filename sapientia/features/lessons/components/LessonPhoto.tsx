'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, type ChangeEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import { fileUrl } from '@/shared/api/file-url';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { preparePhoto } from '@/shared/services/picture-upload.service';
import { LESSONS_MESSAGES } from '../i18n/lessons.messages';
import type { LessonRecord, LessonTarget } from '../interfaces/lesson.interface';
import { addLessonPhoto, lessonDayKey, removeLessonPhoto } from '../services/lessons.client';
import styles from '../styles/Lessons.module.css';

/** Thrown when the browser cannot read the chosen picture, so the message can say so rather than blame the server. */
class UnreadablePictureError extends Error {}

/**
 * The optional photo on a lesson record (plan Phase 3): shown to whoever can see the record, and added, changed or removed
 * by its recorder. The photo is redrawn in the browser before it is sent (upright, smaller, no location data).
 */
interface LessonPhotoProps {
  target: LessonTarget;
  record: LessonRecord;
  canEdit: boolean;
  /** The period's time, for the picture's description. */
  time: string;
}

export function LessonPhoto({ target, record, canEdit, time }: LessonPhotoProps) {
  const text = useMessages(LESSONS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: lessonDayKey(target.onDate) });

  const add = useMutation({
    mutationFn: async (file: File) => {
      const photo = await preparePhoto(file).catch(() => {
        throw new UnreadablePictureError();
      });
      return addLessonPhoto(target, photo);
    },
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => removeLessonPhoto(target), onSuccess: refresh });
  const busy = add.isPending || remove.isPending;
  const failure = add.error ?? remove.error;

  const onChoose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same picture again still counts as a change.
    event.target.value = '';
    if (file) add.mutate(file);
  };

  let message = '';
  if (busy) message = add.isPending ? text.photoUploading : text.saving;
  else if (failure instanceof UnreadablePictureError) message = text.photoUnreadable;
  else if (failure instanceof ApiError && failure.fields.photo) {
    message = text.fieldErrors[failure.fields.photo] ?? describeFieldError(failure.fields.photo, lang);
  } else if (failure) message = describeApiError(failure, lang);

  if (!record.photoFileId && !canEdit) return null;
  const inputId = `lesson-${target.slotId}-photo`;
  return (
    <div className={styles.photo}>
      {record.photoFileId && (
        <a href={fileUrl(record.photoFileId)} target="_blank" rel="noopener noreferrer" aria-label={text.photoOpen}>
          {/* A stored upload behind an authorisation check: next/image cannot optimise it, and should not cache it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.photoThumb} src={fileUrl(record.photoFileId)} alt={text.photoAlt(time)} loading="lazy" />
        </a>
      )}
      {canEdit && (
        <div className={styles.photoControls}>
          <input ref={input} id={inputId} type="file" accept="image/*" hidden onChange={onChoose} />
          <div className={styles.actions}>
            <button type="button" className={`${calm.button} ${calm.small}`} disabled={busy} onClick={() => input.current?.click()}>
              {record.photoFileId ? text.photoReplace : text.photoAdd}
            </button>
            {record.photoFileId && (
              <button type="button" className={`${calm.button} ${calm.small}`} disabled={busy} onClick={() => remove.mutate()}>
                {text.photoRemove}
              </button>
            )}
          </div>
          <p className={calm.help}>{text.photoHelp}</p>
          <div className={failure && !busy ? calm.fieldError : calm.help} aria-live="polite">{message}</div>
        </div>
      )}
    </div>
  );
}
