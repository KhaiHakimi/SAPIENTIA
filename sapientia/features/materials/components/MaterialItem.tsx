'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { describeApiError } from '@/shared/api/api-error.messages';
import { fileUrl } from '@/shared/api/file-url';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { MATERIALS_MESSAGES } from '../i18n/materials.messages';
import type { Material } from '../interfaces/material.interface';
import { MATERIALS_ROOT_KEY, removeMaterial } from '../services/materials.client';
import styles from '../styles/Materials.module.css';

const LOCALES: Record<Lang, string> = { ms: 'ms-MY', en: 'en-GB' };

/** "120 KB" or "2.4 MB". */
function formatSize(bytes: number, lang: Lang): string {
  const megabytes = bytes / (1024 * 1024);
  const [value, unit] = megabytes >= 1 ? [megabytes, 'megabyte'] : [Math.max(1, bytes / 1024), 'kilobyte'];
  return new Intl.NumberFormat(LOCALES[lang], { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: megabytes >= 1 ? 1 : 0 })
    .format(value);
}

/** One material: its tags, a link to open or a file to download, who shared it, and Remove for them and administrators. */
export function MaterialItem({ material, timeZone }: { material: Material; timeZone: string }) {
  const text = useMessages(MATERIALS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeMaterial(material.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MATERIALS_ROOT_KEY }),
  });
  const tags = [material.subject?.name, material.level ? text.levels[material.level] : null, material.topic].filter(Boolean);
  const titleId = `material-${material.id}-title`;

  return (
    <li className={styles.item}>
      <h3 id={titleId}>{material.title}</h3>
      {tags.length > 0 && (
        <div className={styles.tags}>{tags.map((tag) => <span key={tag} className={calm.badge}>{tag}</span>)}</div>
      )}
      {material.description && <p>{material.description}</p>}
      <p>
        {material.url ? (
          <a href={material.url} target="_blank" rel="noopener noreferrer">{text.openLink}</a>
        ) : material.file && (
          <a href={fileUrl(material.file.id)} download={material.file.fileName}>
            {text.download(material.file.fileName.split('.').pop()?.toUpperCase() ?? '', formatSize(material.file.byteSize, lang))}
          </a>
        )}
      </p>
      <div className={styles.itemFoot}>
        <span className={calm.help}>{text.addedBy(material.createdBy.name, formatDate(material.createdAt, lang, { timeZone }))}</span>
        {material.canRemove && (
          <button type="button" className={`${calm.button} ${calm.small}`} disabled={remove.isPending}
            aria-label={text.removeLabel(material.title)} onClick={() => remove.mutate()}>
            {text.remove}
          </button>
        )}
      </div>
      {remove.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(remove.error, lang)}</div>}
    </li>
  );
}
