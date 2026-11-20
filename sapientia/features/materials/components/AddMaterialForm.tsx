'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import type { SchoolDataItem } from '@/features/school-data/interfaces/school-data.interface';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { isPicture, preparePhoto } from '@/shared/services/picture-upload.service';
import {
  MATERIAL_DESCRIPTION_MAX, MATERIAL_FILE_ACCEPT, MATERIAL_LEVELS, MATERIAL_TITLE_MAX, MATERIAL_TOPIC_MAX, MATERIAL_URL_MAX,
} from '../constants/materials.constants';
import { MATERIALS_MESSAGES } from '../i18n/materials.messages';
import type { MaterialLevel, NewMaterial } from '../interfaces/material.interface';
import { addMaterialFile, addMaterialLink, MATERIALS_ROOT_KEY } from '../services/materials.client';
import styles from '../styles/Materials.module.css';

type Kind = 'link' | 'file';

/** Thrown when the browser cannot read a chosen picture, so the message says so rather than blaming the server. */
class UnreadablePictureError extends Error {}

/** Shares a link (preferred, so DELIMa content is linked rather than copied) or a file, with its tags. */
export function AddMaterialForm({ subjects }: { subjects: readonly SchoolDataItem[] }) {
  const text = useMessages(MATERIALS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [level, setLevel] = useState<MaterialLevel | ''>('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');

  const add = useMutation({
    mutationFn: async () => {
      const tags: NewMaterial = {
        title, subjectId: subjectId || undefined, level: level || undefined, topic: topic || undefined,
        description: description || undefined,
      };
      if (kind === 'link') return addMaterialLink({ ...tags, url });
      if (!file) throw new ApiError(400, 'validation', { file: 'file_required' });
      // Pictures are redrawn first (upright, smaller, no location data); documents go as they are.
      const upload = isPicture(file) ? await preparePhoto(file).catch(() => {
        throw new UnreadablePictureError();
      }) : file;
      return addMaterialFile(tags, upload);
    },
    onSuccess: async () => {
      setTitle('');
      setUrl('');
      setFile(null);
      setTopic('');
      setDescription('');
      if (fileInput.current) fileInput.current.value = '';
      await queryClient.invalidateQueries({ queryKey: MATERIALS_ROOT_KEY });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (code: string | undefined) => code && (text.fieldErrors[code] ?? describeFieldError(code, lang));
  const errorFor = (name: string) => fieldText(fields[name]);
  const generalError = add.error instanceof UnreadablePictureError
    ? text.pictureUnreadable
    : add.isError && Object.keys(fields).length === 0 ? describeApiError(add.error, lang) : '';

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };
  const described = (id: string, help = false) => `${help ? `${id}-help ` : ''}${id}-error`;
  const errorLine = (id: string, name: string) => (
    <div id={`${id}-error`} className={calm.fieldError} role={errorFor(name) ? 'alert' : undefined}>{errorFor(name) ?? ''}</div>
  );

  return (
    <section id="materials-add" className={calm.card} aria-labelledby="materials-add-title">
      <h2 id="materials-add-title">{text.addTitle}</h2>
      <p className={calm.help}>{text.addIntro}</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <fieldset className={calm.fieldset}>
          <legend>{text.kind}</legend>
          <div className={styles.kinds}>
            {(['link', 'file'] as const).map((option) => (
              <label key={option} className={calm.checkbox}>
                <input type="radio" name="material-kind" value={option} checked={kind === option} onChange={() => setKind(option)} />
                <span>{option === 'link' ? text.kindLink : text.kindFile}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={calm.field}>
          <label className={calm.label} htmlFor="material-title">{text.title}</label>
          <input id="material-title" className={calm.input} value={title} maxLength={MATERIAL_TITLE_MAX} onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(errorFor('title'))} aria-describedby={described('material-title')} />
          {errorLine('material-title', 'title')}
        </div>

        {kind === 'link' ? (
          <div className={calm.field}>
            <label className={calm.label} htmlFor="material-url">{text.url}</label>
            <input id="material-url" type="url" inputMode="url" className={calm.input} value={url} maxLength={MATERIAL_URL_MAX} placeholder="https://"
              onChange={(event) => setUrl(event.target.value)} aria-invalid={Boolean(errorFor('url'))}
              aria-describedby={described('material-url', true)} />
            <div id="material-url-help" className={calm.help}>{text.urlHelp}</div>
            {errorLine('material-url', 'url')}
          </div>
        ) : (
          <div className={calm.field}>
            <label className={calm.label} htmlFor="material-file">{text.file}</label>
            <input ref={fileInput} id="material-file" type="file" className={calm.input} accept={MATERIAL_FILE_ACCEPT}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-invalid={Boolean(errorFor('file'))}
              aria-describedby={described('material-file', true)} />
            <div id="material-file-help" className={calm.help}>{text.fileHelp}</div>
            {errorLine('material-file', 'file')}
          </div>
        )}

        <div className={styles.fields}>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="material-subject">{text.subject} <span className={calm.muted}>({text.optional})</span></label>
            <select id="material-subject" className={calm.select} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}
              aria-invalid={Boolean(errorFor('subjectId'))} aria-describedby={described('material-subject')}>
              <option value="">{text.noSubject}</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            {errorLine('material-subject', 'subjectId')}
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="material-level">{text.level} <span className={calm.muted}>({text.optional})</span></label>
            <select id="material-level" className={calm.select} value={level} onChange={(event) => setLevel(event.target.value as MaterialLevel | '')}
              aria-invalid={Boolean(errorFor('level'))} aria-describedby={described('material-level')}>
              <option value="">{text.noLevel}</option>
              {MATERIAL_LEVELS.map((option) => <option key={option} value={option}>{text.levels[option]}</option>)}
            </select>
            {errorLine('material-level', 'level')}
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="material-topic">{text.topic} <span className={calm.muted}>({text.optional})</span></label>
            <input id="material-topic" className={calm.input} value={topic} maxLength={MATERIAL_TOPIC_MAX} onChange={(event) => setTopic(event.target.value)}
              aria-invalid={Boolean(errorFor('topic'))} aria-describedby={described('material-topic', true)} />
            <div id="material-topic-help" className={calm.help}>{text.topicHelp}</div>
            {errorLine('material-topic', 'topic')}
          </div>
        </div>

        <div className={calm.field}>
          <label className={calm.label} htmlFor="material-description">{text.description} <span className={calm.muted}>({text.optional})</span></label>
          <textarea id="material-description" className={calm.textarea} rows={2} value={description} maxLength={MATERIAL_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errorFor('description'))}
            aria-describedby={described('material-description')} />
          {errorLine('material-description', 'description')}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>{add.isPending ? text.adding : text.add}</button>
          <span className={generalError ? calm.fieldError : calm.help} aria-live="polite">
            {add.isPending ? '' : generalError || (add.isSuccess ? text.added : '')}
          </span>
        </div>
      </form>
    </section>
  );
}
