import { describe, expect, it } from 'vitest';
import { buildDraftRequest, parseModelDraft } from './model-draft.service';

const ZONE = 'Asia/Kuala_Lumpur';
// Thursday 19 November 2026, 11 pm in Kuala Lumpur: already Friday's date would be wrong, so the zone matters.
const NOW = new Date('2026-11-19T15:00:00Z');

describe('buildDraftRequest', () => {
  it('gives today and a three-week calendar in the school time zone, and fences the instruction', () => {
    const request = buildDraftRequest('Hantar markah Khamis depan', NOW, ZONE);
    expect(request.prompt).toContain('2026-11-19 Thursday (today)');
    expect(request.prompt).toContain('2026-11-26 Thursday');
    expect(request.prompt).toContain('2026-12-09 Wednesday');
    expect(request.prompt).not.toContain('2026-12-10');
    expect(request.prompt).toMatch(/"""\nHantar markah Khamis depan\n"""$/);
    expect(request.system).toContain('JSON');
  });
});

describe('parseModelDraft', () => {
  const parse = (value: unknown) => parseModelDraft(typeof value === 'string' ? value : JSON.stringify(value), NOW, ZONE);

  it('keeps fields that pass the task rules', () => {
    expect(parse({ title: ' Hantar markah PBD ', description: 'Tahun 4 sahaja', dueOn: '2026-11-26', estimatedMinutes: 60, extra: 'x' }))
      .toEqual({
        draft: { title: 'Hantar markah PBD', description: 'Tahun 4 sahaja', dueOn: '2026-11-26', estimatedMinutes: 60 },
        dropped: [],
      });
  });

  it('has no draft without a usable title, or without a JSON object', () => {
    expect(parse({ title: '' })).toBeNull();
    expect(parse({ title: 'x'.repeat(201) })).toBeNull();
    expect(parse({ description: 'no title' })).toBeNull();
    expect(parse('not json')).toBeNull();
    expect(parse('[1, 2]')).toBeNull();
    expect(parse('null')).toBeNull();
  });

  it('drops a past, impossible or far-off date rather than fixing it', () => {
    expect(parse({ title: 'T', dueOn: '2026-11-18' })).toMatchObject({ draft: { dueOn: null }, dropped: ['dueOn'] });
    expect(parse({ title: 'T', dueOn: '2026-02-30' })).toMatchObject({ draft: { dueOn: null }, dropped: ['dueOn'] });
    expect(parse({ title: 'T', dueOn: '2028-01-01' })).toMatchObject({ draft: { dueOn: null }, dropped: ['dueOn'] });
    expect(parse({ title: 'T', dueOn: '2026-11-19' })).toMatchObject({ draft: { dueOn: '2026-11-19' }, dropped: [] });
  });

  it('drops estimates outside the task rule and descriptions that are too long', () => {
    expect(parse({ title: 'T', estimatedMinutes: 12.5, description: 'x'.repeat(5001) }))
      .toMatchObject({ draft: { estimatedMinutes: null, description: null }, dropped: ['description', 'estimatedMinutes'] });
    expect(parse({ title: 'T', estimatedMinutes: '60' })).toMatchObject({ draft: { estimatedMinutes: null }, dropped: ['estimatedMinutes'] });
  });

  it('treats null, missing and empty fields as not given, not as dropped', () => {
    expect(parse({ title: 'T', description: null, dueOn: '', estimatedMinutes: undefined }))
      .toEqual({ draft: { title: 'T', description: null, dueOn: null, estimatedMinutes: null }, dropped: [] });
  });
});
