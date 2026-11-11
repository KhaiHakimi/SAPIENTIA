import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.2 AA contrast for the calm scope (plan Sprint 5): every text colour the staff screens use must reach 4.5:1 on the
 * surfaces it sits on, and focus rings and form-control edges 3:1 (1.4.11). Reads the tokens from app/globals.css, so a
 * colour change that breaks contrast fails here.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

function tokensOf(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const dark = tokensOf('[data-theme-scope="calm"]');
const themes = {
  dark,
  light: { ...dark, ...tokensOf(':root[data-theme="light"] [data-theme-scope="calm"]') },
};

const SURFACES = ['bg', 'panel', 'panel-2'];
const TEXT = ['text', 'muted', 'accent-text', 'ok', 'danger'];

describe.each(Object.entries(themes))('calm scope, %s theme', (_name, tokens) => {
  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface])))('%s on %s reaches 4.5:1', (text, surface) => {
    expect(contrast(tokens[text], tokens[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('primary button text reaches 4.5:1 on the accent', () => {
    expect(contrast(tokens['accent-ink'], tokens.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)('the focus ring reaches 3:1 on %s', (surface) => {
    expect(contrast(tokens.focus, tokens[surface])).toBeGreaterThanOrEqual(3);
  });

  // Controls sit on cards and on the page.
  it.each(['bg', 'panel'])('form-control edges reach 3:1 on %s', (surface) => {
    expect(contrast(tokens['field-bd'], tokens[surface])).toBeGreaterThanOrEqual(3);
  });
});
