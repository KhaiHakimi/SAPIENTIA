import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS } from './support/e2e-env';
import { signIn } from './support/staff-actions';

/**
 * Accessibility pass to WCAG 2.2 AA (plan Sprint 5): axe scans the sign-in page and every staff screen, in the dark and the
 * light theme. axe finds what a machine can (contrast, names, labels, roles, structure); keyboard order and wording still
 * need a person, so this is a floor, not the whole pass.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const STAFF_SCREENS = [
  '/staff', '/staff/sent', '/staff/held', '/staff/tasks/new', '/staff/timetable', '/staff/users', '/staff/school-data',
  '/staff/settings', '/staff/calendar', '/staff/notifications',
];

/** One line per failing element, so a failure says what to fix without opening the trace. */
async function violationsOn(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
}

for (const theme of ['dark', 'light']) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((mode) => localStorage.setItem('sapientia.theme', mode), theme);
    });

    test('the sign-in page has no detectable WCAG 2.2 AA failures', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('#login-email')).toBeVisible();
      expect(await violationsOn(page)).toEqual([]);
    });

    test('the staff screens have no detectable WCAG 2.2 AA failures', async ({ page }) => {
      // Ten screens in one test, so that the sign-in is done once per theme.
      test.setTimeout(180_000);
      await signIn(page, ACCOUNTS.admin.email);
      for (const path of STAFF_SCREENS) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        // Lists and forms load after the heading; wait for them so the scan sees the real screen.
        await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);
        expect(await violationsOn(page), path).toEqual([]);
      }
    });
  });
}
