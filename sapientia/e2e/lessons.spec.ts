import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, SCHOOL_TIME_ZONE } from './support/e2e-env';
import { signIn } from './support/staff-actions';
import { SAMPLE_PNG } from '../shared/server/testing/sample-images';

/** The last Monday-to-Friday day before today at the school: its periods have all started, whatever hour the tests run. */
function previousSchoolDay(): string {
  let day = DateTime.now().setZone(SCHOOL_TIME_ZONE).startOf('day').minus({ days: 1 });
  while (day.weekday > 5) day = day.minus({ days: 1 });
  return day.toISODate() ?? '';
}

/**
 * Lesson records (plan Phase 3, Sprint 9). The seeded teachers teach three lessons every weekday morning. Each project uses
 * its own teacher, so the two runs never touch the same record.
 */
test('a teacher records one lesson as held in one tap and another as not held, with a reason', async ({ page }, testInfo) => {
  const account = testInfo.project.name === 'desktop' ? ACCOUNTS.aminah : ACCOUNTS.meiling;
  await signIn(page, account.email);
  await page.getByRole('link', { name: 'Rekod Kelas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Rekod Kelas' })).toBeVisible();
  await page.locator('#lessons-date').fill(previousSchoolDay());
  await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);

  const periods = page.getByRole('region', { name: /^Waktu anda pada / }).getByRole('listitem');
  const first = periods.nth(0);
  const second = periods.nth(1);
  await first.getByRole('button', { name: /^Kelas [\d:]+ hingga [\d:]+ diadakan$/ }).click();
  await expect(first.getByText('Diadakan', { exact: true }).first()).toBeVisible();
  await expect(first.getByRole('button', { name: /^Kelas [\d:]+ hingga [\d:]+ diadakan$/ })).toHaveAttribute('aria-pressed', 'true');

  await second.getByRole('button', { name: /tidak diadakan$/ }).click();
  // A reason is needed; saving without one says so.
  await second.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(second.getByText('Pilih sebab kelas tidak diadakan.')).toBeVisible();
  await second.getByLabel('Sebab').selectOption('school_programme');
  await second.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(second.getByText('Tidak diadakan: Program sekolah')).toBeVisible();

  // An e-RPH link can be added to a record.
  await first.getByLabel(/^Pautan e-RPH/).fill('https://erph.sapientia.test/rph/123');
  await first.getByRole('button', { name: 'Simpan pautan' }).click();
  await expect(first.getByRole('link', { name: 'Buka e-RPH' })).toHaveAttribute('href', 'https://erph.sapientia.test/rph/123');

  // A photo can be added too: redrawn in the browser, then shown back through the access-checked file route.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), first.getByRole('button', { name: 'Tambah gambar' }).click()]);
  await chooser.setFiles({ name: 'papan.png', mimeType: 'image/png', buffer: Buffer.from(SAMPLE_PNG) });
  const photo = first.getByRole('img', { name: /^Gambar kelas / });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await violationsOn(page)).toEqual([]);
  await first.getByRole('button', { name: 'Buang gambar' }).click();
  await expect(photo).toHaveCount(0);

  // The record is kept.
  await page.reload();
  await page.locator('#lessons-date').fill(previousSchoolDay());
  await expect(page.getByText('Tidak diadakan: Program sekolah')).toBeVisible();
});
