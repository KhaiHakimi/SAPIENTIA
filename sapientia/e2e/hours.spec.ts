import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/**
 * The private hours log (plan Phase 3, Sprint 9). Each project uses its own teacher. The entry is checked from the owner's
 * side and then looked for, and not found, by an administrator.
 */
test('a teacher logs private hours, shares only the month total, and nobody else sees the entry', async ({ page }, testInfo) => {
  const account = testInfo.project.name === 'desktop' ? ACCOUNTS.ravi : ACCOUNTS.aminah;
  const note = `Menanda kertas ${testInfo.project.name}-${Date.now()}`;

  await signIn(page, account.email);
  await page.getByRole('link', { name: 'Log Jam Peribadi' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Log Jam Peribadi' })).toBeVisible();
  await expect(page.getByText(/^Log ini peribadi\./)).toBeVisible();

  await page.locator('#hours-hours').fill('1');
  await page.locator('#hours-minutes').fill('30');
  await page.locator('#hours-kind').selectOption('marking');
  await page.locator('#hours-note').fill(note);
  await page.getByRole('button', { name: 'Tambah', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: note });
  await expect(row).toContainText('Menanda');
  await expect(page.getByText(/^Jumlah: /)).toBeVisible();

  await page.getByRole('button', { name: /^Kongsi (jumlah|semula)$/ }).click();
  await expect(page.getByText(/^Anda berkongsi /)).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await signOut(page);

  // An administrator's log is their own: the teacher's entry is nowhere on it.
  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/hours');
  await expect(page.getByRole('heading', { level: 1, name: 'Log Jam Peribadi' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);
  await expect(page.getByText(note)).toHaveCount(0);
  await signOut(page);

  // The owner deletes the entry and withdraws the share.
  await signIn(page, account.email);
  await page.goto('/staff/hours');
  await page.getByRole('row').filter({ hasText: note }).getByRole('button', { name: /^Padam catatan / }).click();
  await expect(page.getByText(note)).toHaveCount(0);
  await page.getByRole('button', { name: 'Tarik balik' }).click();
  await expect(page.getByText('Jumlah bulan ini tidak dikongsi.')).toBeVisible();
});
