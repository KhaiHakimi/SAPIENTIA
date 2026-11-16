import { expect, test, type Page } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, E2E_PASSWORD } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/** Signs a pupil in through the shared form; lands on /student (the board, or the choose-password step). */
async function pupilSignIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-identifier').fill(username);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await page.waitForURL('**/student');
}

/**
 * The pupil's name as the board shows it. Next.js keeps the sign-in page in the DOM, hidden, after navigating, and its banner
 * and demo list name the pupil too, so only a visible exact match counts.
 */
const boardName = (page: Page, name: string) => page.getByText(name, { exact: true }).filter({ visible: true });

/**
 * Pupil accounts (plan Phase 4, Sprint 11). An administrator pastes a class list and gets slips; a pupil signs in with a
 * slip, must choose their own password, then reaches their board. Names unique to the run keep the two projects apart.
 */
test('an administrator adds a class list; a pupil signs in with the slip and chooses a password', async ({ page }, testInfo) => {
  const tag = `${testInfo.project.name}${Date.now()}`;
  const className = testInfo.project.name === 'desktop' ? '1 Amanah' : '2 Bestari';
  const pupilName = `Nur Ujian ${tag}`;

  await signIn(page, ACCOUNTS.admin.email);
  await page.getByRole('link', { name: 'Murid', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Murid' })).toBeVisible();

  await page.locator('#add-students-class').selectOption({ label: className });
  await page.locator('#add-students-list').fill(`${pupilName}\nAli Ujian ${tag}, N${Date.now() % 1_000_000}`);
  await expect(page.getByText('2 murid akan ditambah:')).toBeVisible();
  await page.getByRole('button', { name: 'Tambah dan cetak slip' }).click();
  await expect(page.getByText('2 murid ditambah.', { exact: false })).toBeVisible();

  const slips = page.getByRole('region', { name: 'Slip log masuk' });
  await expect(slips).toBeVisible();
  const slip = slips.getByRole('listitem').filter({ hasText: pupilName });
  const [username, password] = await slip.locator('dd').allTextContents();
  expect(username).toMatch(/^nur\d{4}$/);
  expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
  expect(await violationsOn(page)).toEqual([]);

  // Done forgets the passwords; the list shows the pupil has not chosen one yet.
  await slips.getByRole('button', { name: 'Selesai' }).click();
  await expect(slips).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: pupilName })).toContainText('Belum pilih kata laluan');
  await signOut(page);

  await pupilSignIn(page, username, password);
  await expect(page.getByRole('heading', { name: 'Pilih kata laluan anda' })).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await page.locator('#choose-currentPassword').fill(password);
  await page.locator('#choose-newPassword').fill('rahsia-saya-9');
  await page.locator('#choose-confirm').fill('rahsia-saya-9');
  await page.getByRole('button', { name: 'Simpan kata laluan' }).click();
  await expect(boardName(page, pupilName)).toBeVisible();

  await page.getByRole('button', { name: 'Log Keluar' }).click();
  await page.waitForURL('**/login');
  await pupilSignIn(page, username, 'rahsia-saya-9');
  await expect(boardName(page, pupilName)).toBeVisible();
});

test('a seeded pupil signs in with a username and reaches their own board', async ({ page }) => {
  await pupilSignIn(page, 'kavitha0003', E2E_PASSWORD);
  await expect(boardName(page, 'Kavitha a/p Raman')).toBeVisible();
  await expect(page.getByText('3 Cekal').filter({ visible: true }).first()).toBeVisible();
});
