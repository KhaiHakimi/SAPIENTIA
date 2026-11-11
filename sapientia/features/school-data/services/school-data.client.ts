import { apiFetch } from '@/shared/api/api-client';
import type { NewSchoolDataItem, SchoolDataItem, SchoolDataKind } from '../interfaces/school-data.interface';

export const schoolDataKey = (kind: SchoolDataKind) => ['school-data', kind] as const;

export async function fetchSchoolData(kind: SchoolDataKind): Promise<SchoolDataItem[]> {
  return (await apiFetch<{ items: SchoolDataItem[] }>(`/api/school-data/${kind}`)).items;
}

export function addSchoolData(kind: SchoolDataKind, input: NewSchoolDataItem): Promise<SchoolDataItem> {
  return apiFetch(`/api/school-data/${kind}`, { method: 'POST', body: input });
}

export function removeSchoolData(kind: SchoolDataKind, id: string): Promise<void> {
  return apiFetch(`/api/school-data/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
