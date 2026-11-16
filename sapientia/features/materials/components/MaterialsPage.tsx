'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchSchoolData, schoolDataKey } from '@/features/school-data/services/school-data.client';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { MATERIAL_LEVELS, MATERIAL_SEARCH_MAX } from '../constants/materials.constants';
import { MATERIALS_MESSAGES } from '../i18n/materials.messages';
import type { MaterialFilters, MaterialLevel } from '../interfaces/material.interface';
import { fetchMaterials, materialsKey } from '../services/materials.client';
import styles from '../styles/Materials.module.css';

const SEARCH_PAUSE_MS = 300;
import { AddMaterialForm } from './AddMaterialForm';
import { MaterialItem } from './MaterialItem';

/** The shared material bank (plan Phase 3, Sprint 10): find by subject, year or form and words; share a link or a file. */
export function MaterialsPage() {
  const text = useMessages(MATERIALS_MESSAGES);
  const { lang } = useLanguage();
  const { timeZone } = useStaffUser();
  const [subjectId, setSubjectId] = useState('');
  const [level, setLevel] = useState<MaterialLevel | ''>('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  // The search is sent once typing pauses, not on every key.
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [search]);
  const filters: MaterialFilters = { subjectId: subjectId || undefined, level: level || undefined, q: q || undefined };
  const filtered = Boolean(subjectId || level || q);

  const subjects = useQuery({ queryKey: schoolDataKey('subjects'), queryFn: () => fetchSchoolData('subjects') });
  const materials = useInfiniteQuery({
    queryKey: materialsKey(filters),
    queryFn: ({ pageParam }) => fetchMaterials(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = materials.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{text.intro}</p>
        </div>
        <button type="button" className={`${calm.button} ${adding ? '' : calm.primary}`} aria-expanded={adding} aria-controls="materials-add"
          onClick={() => setAdding((open) => !open)}>
          {adding ? text.closeAdd : text.openAdd}
        </button>
      </div>

      {/* Folded away until asked for: finding material is what most visits are for. */}
      {adding && <AddMaterialForm subjects={subjects.data ?? []} />}

      <section className={calm.card} aria-labelledby="materials-list-title">
        <h2 id="materials-list-title">{text.listTitle}</h2>
        <div className={styles.filters} role="search" aria-label={text.filtersTitle}>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="materials-search">{text.search}</label>
            <input id="materials-search" type="search" className={calm.input} value={search} maxLength={MATERIAL_SEARCH_MAX}
              onChange={(event) => setSearch(event.target.value)} aria-describedby="materials-search-help" />
            <div id="materials-search-help" className={calm.help}>{text.searchHelp}</div>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="materials-subject">{text.subject}</label>
            <select id="materials-subject" className={calm.select} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">{text.anySubject}</option>
              {(subjects.data ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="materials-level">{text.level}</label>
            <select id="materials-level" className={calm.select} value={level} onChange={(event) => setLevel(event.target.value as MaterialLevel | '')}>
              <option value="">{text.anyLevel}</option>
              {MATERIAL_LEVELS.map((option) => <option key={option} value={option}>{text.levels[option]}</option>)}
            </select>
          </div>
        </div>

        {materials.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : materials.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(materials.error, lang)}</div>
        ) : items.length === 0 ? (
          <p className={calm.empty}>{filtered ? text.emptyFiltered : text.empty}</p>
        ) : (
          <ul className={styles.list}>
            {items.map((material) => <MaterialItem key={material.id} material={material} timeZone={timeZone} />)}
          </ul>
        )}
        {materials.hasNextPage && (
          <p>
            <button type="button" className={calm.button} onClick={() => materials.fetchNextPage()} disabled={materials.isFetchingNextPage}>
              {materials.isFetchingNextPage ? text.loading : text.loadMore}
            </button>
          </p>
        )}
      </section>
    </>
  );
}
