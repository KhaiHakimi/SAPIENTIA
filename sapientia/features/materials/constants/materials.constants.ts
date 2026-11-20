import type { FileKind } from '@/shared/interfaces/stored-file.interface';
import type { MaterialLevel } from '../interfaces/material.interface';

/** In the order the form lists them. Matches the material_level enum in the database. */
export const MATERIAL_LEVELS: readonly MaterialLevel[] = [
  'tahun_1', 'tahun_2', 'tahun_3', 'tahun_4', 'tahun_5', 'tahun_6',
  'tingkatan_1', 'tingkatan_2', 'tingkatan_3', 'tingkatan_4', 'tingkatan_5', 'tingkatan_6',
];

export const MATERIAL_TITLE_MAX = 120;
export const MATERIAL_DESCRIPTION_MAX = 500;
export const MATERIAL_TOPIC_MAX = 80;
export const MATERIAL_URL_MAX = 500;
export const MATERIAL_SEARCH_MAX = 80;
export const MATERIAL_FILE_MAX_BYTES = 10 * 1024 * 1024;
/** Worksheets, notes and slides; pictures are shrunk by the page first. */
export const MATERIAL_FILE_KINDS: readonly FileKind[] = ['pdf', 'docx', 'xlsx', 'pptx', 'jpeg', 'png'];
/** What the file picker offers; the server decides from the bytes anyway. */
export const MATERIAL_FILE_ACCEPT = '.pdf,.docx,.xlsx,.pptx,image/jpeg,image/png';
