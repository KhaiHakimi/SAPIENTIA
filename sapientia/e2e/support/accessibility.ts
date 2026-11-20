import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * WCAG 2.2 AA as far as a machine can check it (contrast, names, labels, roles, structure). Keyboard order and wording
 * still need a person, so a clean scan is a floor, not the whole pass.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** One line per failing element, so a failure says what to fix without opening the trace. */
export async function violationsOn(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
}
