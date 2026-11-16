import type { FileRef } from '@/shared/interfaces/stored-file.interface';

/** Year (primary) or form (secondary). Matches the material_level enum. */
export type MaterialLevel =
  | 'tahun_1' | 'tahun_2' | 'tahun_3' | 'tahun_4' | 'tahun_5' | 'tahun_6'
  | 'tingkatan_1' | 'tingkatan_2' | 'tingkatan_3' | 'tingkatan_4' | 'tingkatan_5' | 'tingkatan_6';

/** One item in the school's shared material bank: a link or one uploaded file, with its tags. */
export interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: { id: string; name: string } | null;
  level: MaterialLevel | null;
  topic: string | null;
  /** An https link (to DELIMa or elsewhere); set exactly when there is no file. */
  url: string | null;
  file: FileRef | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  /** The person who added it and administrators may remove it. */
  canRemove: boolean;
}

/** GET /api/materials: newest first, a page at a time. */
export interface MaterialPage {
  items: Material[];
  nextCursor: string | null;
}

export interface MaterialFilters {
  subjectId?: string;
  level?: MaterialLevel;
  /** Words to find in the title, topic or description. */
  q?: string;
}

/** POST /api/materials: the tags, plus url for a link (JSON) or a file in the same multipart form. */
export interface NewMaterial {
  title: string;
  description?: string;
  subjectId?: string;
  level?: MaterialLevel;
  topic?: string;
  url?: string;
}
