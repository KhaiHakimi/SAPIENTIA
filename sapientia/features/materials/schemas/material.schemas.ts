import { z } from 'zod';
import { pageQuerySchema } from '@/shared/server/pagination';
import {
  MATERIAL_DESCRIPTION_MAX, MATERIAL_LEVELS, MATERIAL_SEARCH_MAX, MATERIAL_TITLE_MAX, MATERIAL_TOPIC_MAX, MATERIAL_URL_MAX,
} from '../constants/materials.constants';
import type { MaterialLevel } from '../interfaces/material.interface';

const optionalText = (max: number) =>
  z.string().trim().max(max, { error: 'too_long' }).optional().transform((value) => value || undefined);
const level = z.enum(MATERIAL_LEVELS as [MaterialLevel, ...MaterialLevel[]], { error: 'invalid_level' });
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

/** The tags every material has, from JSON or from a multipart form (where an unset choice arrives as ''). */
const tagFields = {
  title: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(MATERIAL_TITLE_MAX, { error: 'too_long' }),
  description: optionalText(MATERIAL_DESCRIPTION_MAX),
  subjectId: z.preprocess(emptyToUndefined, z.uuid({ error: 'invalid_subject' }).optional()),
  level: z.preprocess(emptyToUndefined, level.optional()),
  topic: optionalText(MATERIAL_TOPIC_MAX),
};

/** POST /api/materials as JSON: a link. https only, so no other scheme can be stored and shown as a link. */
export const newMaterialLinkSchema = z.strictObject({
  ...tagFields,
  url: z.string({ error: 'required' }).trim().max(MATERIAL_URL_MAX, { error: 'too_long' })
    .pipe(z.url({ protocol: /^https$/, error: 'invalid_url' })),
});

/** POST /api/materials as a multipart form: the tags beside the file. */
export const newMaterialFileFieldsSchema = z.strictObject(tagFields);

/** GET /api/materials?subjectId=&level=&q=&limit=&cursor=. */
export const materialListQuerySchema = pageQuerySchema.extend({
  subjectId: z.preprocess(emptyToUndefined, z.uuid({ error: 'invalid_subject' }).optional()),
  level: z.preprocess(emptyToUndefined, level.optional()),
  q: optionalText(MATERIAL_SEARCH_MAX),
});

export const materialIdSchema = z.uuid();
