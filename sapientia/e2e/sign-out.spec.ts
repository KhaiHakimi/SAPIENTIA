import { expect, test, type Page } from '@playwright/test';
import { OPEN_BOARD_DELAY_MS } from '../features/auth/constants/login.constants';
import { ACCOUNTS, E2E_PASSWORD } from './support/e2e-env';

/**
 * Signing out must leave the browser on a fresh sign-in page. Next.js keeps a page it navigated away from alive but hidden, so
 * the sign-in page used to come back still holding "signed in": it opened the board again, the board found no session and
 * sent it back, over and over. Every step here is a client-side navigation (no page.goto in between), which is how a person
 * moves through the app and what the other journeys' signIn helper skips.
 */

/** Long enough for the sign-in page's "access granted" pause to have opened a board if the page still thought it was signed in. */
const SETTLE_MS = OPEN_BOARD_DELAY_MS + 1_500;

async function signInFromForm(page: Page, identifier: string, landing: string): Promise<void> {
  await page.locator('#login-identifier').fill(identifier);
  await page.locator('#login-password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await page.waitForURL(`**${landing}`);
}

async function expectFreshSignInPage(page: Page): Promise<void> {
  await page.waitForURL('**/login');
  await page.waitForTimeout(SETTLE_MS);
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.locator('#login-identifier')).toBeVisible();
  await expect(page.locator('#login-identifier')).toHaveValue('');
  // The last person's password must not still be in the box on a shared staffroom PC.
  await expect(page.locator('#login-password')).toHaveValue('');
}

test('staff sign out, sign in again and sign out again without bouncing back to the board', async ({ page }) => {
  await page.goto('/login');
  for (const account of [ACCOUNTS.aminah, ACCOUNTS.admin]) {
    await signInFromForm(page, account.email, '/staff');
    await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();
    await page.getByRole('button', { name: 'Log Keluar' }).click();
    await expectFreshSignInPage(page);
  }
});

test('a pupil signs out and stays signed out; staff can then sign in on the same tab', async ({ page }, testInfo) => {
  const username = testInfo.project.name === 'desktop' ? 'aisyah0001' : 'kavitha0003';
  await page.goto('/login');
  await signInFromForm(page, username, '/student');
  await page.getByRole('button', { name: 'Log Keluar' }).filter({ visible: true }).click();
  await expectFreshSignInPage(page);

  await signInFromForm(page, ACCOUNTS.sender.email, '/staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();
  await page.getByRole('button', { name: 'Log Keluar' }).click();
  await expectFreshSignInPage(page);
});

test('an in-app link back to sign-in, while signed in, shows a fresh form and does not reopen the board', async ({ page }) => {
  // Reach /login by a client-side link, sign in, come back to the invite page with Back, then follow its link to /login again:
  // the kept-alive sign-in page must not remember that it had signed someone in.
  await page.goto('/accept-invite');
  await page.getByRole('link', { name: 'Ke halaman log masuk' }).click();
  await page.waitForURL('**/login');
  await signInFromForm(page, ACCOUNTS.aminah.email, '/staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();
  await page.goBack();
  await page.waitForURL('**/accept-invite');
  await page.getByRole('link', { name: 'Ke halaman log masuk' }).filter({ visible: true }).click();
  await expectFreshSignInPage(page);
});
