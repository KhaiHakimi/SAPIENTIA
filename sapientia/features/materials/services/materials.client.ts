import { apiFetch } from '@/shared/api/api-client';
import type { Material, MaterialFilters, MaterialPage, NewMaterial } from '../interfaces/material.interface';

export const materialsKey = (filters: MaterialFilters) => ['materials', filters] as const;
export const MATERIALS_ROOT_KEY = ['materials'] as const;

export function fetchMaterials(filters: MaterialFilters, cursor: string | null): Promise<MaterialPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  if (cursor) query.set('cursor', cursor);
  return apiFetch(`/api/materials?${query.toString()}`);
}

export function addMaterialLink(input: NewMaterial & { url: string }): Promise<Material> {
  return apiFetch('/api/materials', { method: 'POST', body: input });
}

/** The tags go in the same form as the file; an unset choice is sent empty and the server treats it as none. */
export function addMaterialFile(input: NewMaterial, file: File): Promise<Material> {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) form.set(key, value ?? '');
  form.set('file', file);
  return apiFetch('/api/materials', { method: 'POST', body: form });
}

export function removeMaterial(id: string): Promise<void> {
  return apiFetch(`/api/materials/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
