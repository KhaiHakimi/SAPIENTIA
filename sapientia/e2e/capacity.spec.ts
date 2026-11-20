import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './support/e2e-env';
import { schoolDay, signIn, signOut } from './support/staff-actions';

/**
 * Capacity journeys (plan Phase 2, Sprint 6). Names carry the project and a timestamp so the desktop and phone runs do not
 * collide. The deadline warning is made certain whatever day the tests run: a 100-hour task due in a week cannot fit.
 */
const unique = (projectName: string) => `${projectName}-${Date.now()}`;

test('an administrator timetables a lesson and the teacher sees it in their week', async ({ page }, testInfo) => {
  const tag = unique(testInfo.project.name);
  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/school-data');
  await page.locator('#subjects-name').fill(`Matematik ${tag}`);
  await page.getByRole('region', { name: 'Subjek' }).getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect(page.getByRole('cell', { name: `Matematik ${tag}`, exact: true })).toBeVisible();
  await page.locator('#classes-name').fill(`4 Bestari ${tag}`);
  await page.getByRole('region', { name: 'Kelas' }).getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect(page.getByRole('cell', { name: `4 Bestari ${tag}`, exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Jadual Waktu' }).click();
  await page.locator('#timetable-teacher').selectOption({ label: ACCOUNTS.meiling.name });
  await expect(page.getByRole('heading', { level: 2, name: `Minggu ${ACCOUNTS.meiling.name}` })).toBeVisible();
  // Each project takes its own weekday, so the two runs never ask for the same period.
  const weekday = testInfo.project.name === 'desktop' ? { value: '2', name: 'Selasa' } : { value: '3', name: 'Rabu' };
  await page.locator('#slot-day').selectOption(weekday.value);
  // An afternoon period: the seed already gives this teacher lessons every morning.
  await page.locator('#slot-start').fill('14:00');
  await page.locator('#slot-end').fill('15:10');
  await page.locator('#slot-class').selectOption({ label: `4 Bestari ${tag}` });
  await page.locator('#slot-subject').selectOption({ label: `Matematik ${tag}` });
  await page.getByRole('button', { name: 'Tambah waktu' }).click();
  const lesson = `4 Bestari ${tag}: Matematik ${tag}`;
  await expect(page.getByRole('cell', { name: lesson })).toBeVisible();

  // The same time again clashes, and the form says so in words.
  await page.locator('#slot-start').fill('14:30');
  await page.locator('#slot-end').fill('15:30');
  await page.getByRole('button', { name: 'Tambah waktu' }).click();
  await expect(page.getByText('Bertindih dengan waktu lain guru ini.')).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.meiling.email);
  await page.getByRole('link', { name: 'Jadual Waktu' }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: lesson }) });
  await expect(row).toContainText(weekday.name);
  await expect(row).toContainText('14:00 hingga 15:10');
  // A teacher reads their own week only: no teacher chooser, no form, no remove buttons.
  await expect(page.locator('#timetable-teacher')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Buang/ })).toHaveCount(0);
});

test('the sender is warned about an unrealistic deadline, may fix the date, or send it flagged', async ({ page }, testInfo) => {
  const tag = unique(testInfo.project.name);
  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/school-data');
  await page.locator('#task-types-name').fill(`Audit fail ${tag}`);
  await page.locator('#task-types-minutes').fill('6000');
  await page.getByRole('region', { name: 'Jenis tugas' }).getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect(page.getByRole('cell', { name: `Audit fail ${tag}`, exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.sender.email);
  await page.goto('/staff/tasks/new');
  await expect(page.getByText(/^Pilih jenis tugas atau masukkan anggaran masa/)).toBeVisible();
  await page.locator('#task-title').fill(`Audit ${tag}`);
  await page.getByRole('checkbox', { name: ACCOUNTS.meiling.name }).check();
  await page.locator('#task-due').fill(schoolDay(7));
  await page.locator('#task-type').selectOption({ label: `Audit fail ${tag}` });
  // The type fills in its usual estimate.
  await expect(page.locator('#task-minutes')).toHaveValue('6000');
  await expect(page.getByText(/^Amaran: 1 daripada 1 penerima tidak mempunyai masa bekerja yang cukup/)).toBeVisible();
  await expect(page.getByText(/perlu 100 jam/)).toBeVisible();

  // Taking the suggested date clears the warning.
  await page.getByRole('button', { name: /^Tukar tarikh akhir kepada / }).click();
  await expect(page.getByText('Penerima mempunyai masa bekerja yang cukup sebelum tarikh akhir.')).toBeVisible();

  // Going back to the tight date and sending anyway is allowed: warn, never block.
  await page.locator('#task-due').fill(schoolDay(7));
  await expect(page.getByText(/^Amaran: /)).toBeVisible();
  await page.getByRole('button', { name: 'Hantar tugas' }).click();
  await page.waitForURL(/\/staff\/tasks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: `Audit ${tag}` })).toBeVisible();
  await expect(page.getByText('Tarikh akhir ketat', { exact: true })).toBeVisible();
  await expect(page.getByText('Anggaran: 100 jam')).toBeVisible();

  await page.goto('/staff/sent');
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: `Audit ${tag}` }) });
  await expect(row.getByText('Tarikh akhir ketat', { exact: true })).toBeVisible();
});
