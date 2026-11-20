import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS } from './support/e2e-env';
import { makeTodayAHoliday, sendTask, signIn, signOut } from './support/staff-actions';

/**
 * The optional completion question (plan Phase 2, Sprint 8). Today is made a holiday and the task sent with the urgent
 * override, so it reaches the teacher at once whatever hour the tests run.
 */
test('a teacher who finishes a task may say how long it took, and may take the answer back', async ({ page }, testInfo) => {
  const title = `Laporan kokurikulum ${testInfo.project.name}-${Date.now()}`;
  await makeTodayAHoliday(page);

  await signIn(page, ACCOUNTS.sender.email);
  const taskId = await sendTask(page, { title, assigneeName: ACCOUNTS.meiling.name, urgentReason: 'Diperlukan untuk mesyuarat esok.' });
  await signOut(page);

  await signIn(page, ACCOUNTS.meiling.email);
  await page.goto(`/staff/tasks/${taskId}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  // The question is not asked until the work is done.
  await expect(page.getByRole('group', { name: /^Berapa lama tugas ini mengambil masa\?/ })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Status' }).selectOption('done');

  const question = page.getByRole('group', { name: /^Berapa lama tugas ini mengambil masa\?/ });
  await expect(question).toBeVisible();
  const oneToThree = question.getByRole('button', { name: '1 hingga 3 jam' });
  await expect(oneToThree).toHaveAttribute('aria-pressed', 'false');
  await oneToThree.click();
  await expect(question.getByText('Jawapan disimpan.')).toBeVisible();
  await expect(oneToThree).toHaveAttribute('aria-pressed', 'true');
  expect(await violationsOn(page)).toEqual([]);

  // The answer is kept, and pressing it again takes it back.
  await page.reload();
  await expect(question.getByRole('button', { name: '1 hingga 3 jam' })).toHaveAttribute('aria-pressed', 'true');
  await question.getByRole('button', { name: '1 hingga 3 jam' }).click();
  await expect(question.getByRole('button', { name: '1 hingga 3 jam' })).toHaveAttribute('aria-pressed', 'false');
  await signOut(page);

  // One answer is far too few to show: the administrator sees the explanation, not a count.
  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/school-data');
  await expect(page.getByRole('heading', { level: 2, name: 'Masa sebenar mengikut jenis tugas' })).toBeVisible();
  await expect(page.getByText(/^Belum cukup jawapan\./)).toBeVisible();
});
