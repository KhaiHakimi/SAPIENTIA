import { expect, test, type Page } from '@playwright/test';
import { fromBase32, hotp, totpStep } from '../features/mfa/server/totp.service';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, E2E_PASSWORD } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/** A code for the setup key shown on the page, for the step after now (the app accepts one step ahead, as a phone may be fast). */
const codeFor = (key: string, stepsAhead = 0) => hotp(fromBase32(key), totpStep(new Date()) + stepsAhead);

async function openSecurity(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Keselamatan', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Keselamatan' })).toBeVisible();
}

/**
 * Two-step sign-in (plan gate G6): a teacher turns it on with an authenticator app, keeps the recovery codes, signs in with
 * a code, and turns it off again (so the shared seeded account is left as it was).
 */
test('a teacher turns on two-step sign-in, signs in with a code, then turns it off', async ({ page }) => {
  await signIn(page, ACCOUNTS.meiling.email);
  await openSecurity(page);
  await expect(page.getByText('Log masuk dua langkah MATI.')).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await page.locator('#mfa-start-password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Mula', exact: true }).click();
  // Next keeps the previous route in the DOM, hidden, so only the visible setup key counts. The page also shows the MCP
  // address in a <code>, so look only inside the two-step section.
  const setup = page.getByRole('region').filter({ has: page.getByRole('heading', { name: 'Hidupkan log masuk dua langkah' }) });
  const key = (await setup.locator('code:visible').first().textContent()) ?? '';
  expect(key).toMatch(/^[A-Z2-7 ]+$/);
  await expect(page.getByRole('link', { name: 'Buka dalam aplikasi pengesah' })).toHaveAttribute('href', /^otpauth:\/\/totp\//);
  await page.locator('#mfa-code').fill(codeFor(key));
  await page.getByRole('button', { name: 'Sahkan dan hidupkan' }).click();

  await expect(page.getByRole('heading', { name: 'Simpan kod pemulihan anda' })).toBeVisible();
  const codes = await page.locator('main ol code:visible').allTextContents();
  expect(codes).toHaveLength(10);
  expect(await violationsOn(page)).toEqual([]);
  await page.getByRole('button', { name: 'Saya sudah menyimpan kod ini' }).click();
  await expect(page.getByText('Log masuk dua langkah HIDUP. Kod pemulihan yang tinggal: 10.')).toBeVisible();
  await signOut(page);

  // The password alone no longer opens the board: the code step asks for the app's code.
  await page.goto('/login');
  await page.locator('#login-identifier').fill(ACCOUNTS.meiling.email);
  await page.locator('#login-password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Log masuk dua langkah' })).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await page.locator('#login-code').fill('000000');
  await page.getByRole('button', { name: 'Sahkan', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Kod tidak betul' })).toBeVisible();
  // The setup used this step's code, so the next step's code is the one the app would show next.
  await page.locator('#login-code').fill(codeFor(key, 1));
  await page.getByRole('button', { name: 'Sahkan', exact: true }).click();
  await page.waitForURL('**/staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();

  // Turn it off again with the password.
  await openSecurity(page);
  await page.locator('#mfa-off-password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Matikan log masuk dua langkah' }).click();
  await expect(page.getByText('Log masuk dua langkah MATI.')).toBeVisible();
  await signOut(page);
  await signIn(page, ACCOUNTS.meiling.email);
});
