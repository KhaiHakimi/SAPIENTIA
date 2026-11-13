import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/**
 * The monthly principal report (plan Phase 3, Sprint 10). An administrator reads last month's report and saves it as PDF
 * and Excel; a teacher has no way to it. Figures are checked in the integration tests; this checks the screens and files.
 */
test('an administrator reads the monthly report and downloads it as PDF and Excel', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin.email);
  await page.getByRole('link', { name: 'Laporan Bulanan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Laporan Bulanan' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);

  await expect(page.getByRole('heading', { level: 2, name: /^Laporan Bulanan Sekolah: / })).toBeVisible();
  for (const title of ['Kelas', 'Kelas ganti', 'Tugasan', 'Petunjuk kesejahteraan', 'Jam peribadi yang dikongsi']) {
    await expect(page.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Kelas tanpa rekod ditunjukkan sebagai "belum direkod", bukan sebagai ketidakhadiran.')).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  const month = await page.locator('#report-month').inputValue();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Muat turun PDF' }).click()]);
  expect(pdf.suggestedFilename()).toBe(`sapientia-laporan-bulanan-${month}.pdf`);
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Muat turun Excel' }).click()]);
  expect(xlsx.suggestedFilename()).toBe(`sapientia-laporan-bulanan-${month}.xlsx`);
  await signOut(page);
});

test('a teacher has no monthly report', async ({ page }, testInfo) => {
  const account = testInfo.project.name === 'desktop' ? ACCOUNTS.ravi : ACCOUNTS.aminah;
  await signIn(page, account.email);
  await expect(page.getByRole('link', { name: 'Log Jam Peribadi' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Laporan Bulanan' })).toHaveCount(0);
  // Going to the address directly shows the refusal, not a report.
  await page.goto('/staff/reports');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Kelas', exact: true })).toHaveCount(0);
});
