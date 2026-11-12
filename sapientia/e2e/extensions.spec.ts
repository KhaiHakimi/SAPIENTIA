import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS } from './support/e2e-env';
import { makeTodayAHoliday, schoolDay, signIn, signOut } from './support/staff-actions';

/**
 * Extension journey (plan Phase 2, Sprint 7). It is certain whatever day and hour it runs: today is made a holiday, so
 * the teacher has no working time left today, and the task is 100 hours due today, sent with the urgent override so that
 * it reaches her at once.
 */
test('a teacher asks for more time, the sender approves, and only her due date moves', async ({ page }, testInfo) => {
  const title = `Audit fail ${testInfo.project.name}-${Date.now()}`;
  await makeTodayAHoliday(page);

  await signIn(page, ACCOUNTS.sender.email);
  await page.goto('/staff/tasks/new');
  await page.locator('#task-title').fill(title);
  await page.getByRole('checkbox', { name: ACCOUNTS.aminah.name }).check();
  await page.locator('#task-due').fill(schoolDay());
  await page.locator('#task-minutes').fill('6000');
  await page.getByRole('checkbox', { name: /^Segera/ }).check();
  await page.locator('#task-urgent-reason').fill('Audit pejabat daerah esok pagi.');
  await page.getByRole('button', { name: 'Hantar tugas' }).click();
  await page.waitForURL(/\/staff\/tasks\/[0-9a-f-]{36}$/);
  const taskPath = new URL(page.url()).pathname;

  // The workload view: the next time the sender assigns, the name carries the work that person already has this week.
  await page.goto('/staff/tasks/new');
  await expect(page.getByText(/^Pilih sekurang-kurangnya seorang\. Masa di sebelah nama/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: new RegExp(`^${ACCOUNTS.aminah.name} · \\d+ jam minggu ini$`) })).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.aminah.email);
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('button', { name: 'Mohon lanjutan masa' }).click();
  // The form opens filled in: her own figures, and a date later than today.
  await expect(page.getByText(/^Tugas ini memerlukan 100 jam, tetapi anda hanya ada /)).toBeVisible();
  const requested = await page.locator('#extension-date').inputValue();
  expect(requested > schoolDay()).toBe(true);
  await page.locator('#extension-reason').fill('Saya juga mengiringi pasukan bola jaring minggu ini.');
  expect(await violationsOn(page)).toEqual([]);
  await page.getByRole('button', { name: 'Hantar permohonan' }).click();
  await expect(page.getByText('Menunggu jawapan', { exact: true })).toBeVisible();
  // One open request at a time: the button is gone until the sender answers.
  await expect(page.getByRole('button', { name: 'Mohon lanjutan masa' })).toHaveCount(0);
  await signOut(page);

  await signIn(page, ACCOUNTS.sender.email);
  await page.goto('/staff/sent');
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: title }) });
  await expect(row.getByText('1 permohonan lanjutan', { exact: true })).toBeVisible();
  await row.getByRole('link', { name: title }).click();
  await expect(page.getByText(new RegExp(`^${ACCOUNTS.aminah.name} memohon pada `))).toBeVisible();
  await expect(page.getByText(/^Semasa memohon: tugas memerlukan 100 jam, dan /)).toBeVisible();
  await expect(page.getByText('Saya juga mengiringi pasukan bola jaring minggu ini.')).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await page.getByRole('button', { name: /^Luluskan / }).click();
  await expect(page.getByText(new RegExp(`^Diluluskan oleh ${ACCOUNTS.sender.name}\\. Tarikh akhir baharu: `))).toBeVisible();
  await expect(page.getByRole('button', { name: /^Luluskan / })).toHaveCount(0);
  const assignee = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: ACCOUNTS.aminah.name }) });
  await expect(assignee).toContainText('Dilanjutkan hingga');
  await expect(page.getByText(new RegExp(`${ACCOUNTS.sender.name} meluluskan lanjutan masa ${ACCOUNTS.aminah.name} hingga `))).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.aminah.email);
  await page.goto(taskPath);
  await expect(page.getByText(/^Tarikh akhir anda: /)).toBeVisible();
  await expect(page.getByText(/^Diluluskan oleh /)).toBeVisible();
});
