import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './support/e2e-env';
import { makeTodayAHoliday, sendTask, signIn, signOut } from './support/staff-actions';

/**
 * The three MVP journeys (plan Sprint 5). Every person and school is fictional seed data. Titles and emails carry the
 * project name and a timestamp, so the desktop and phone runs never trip over each other's rows.
 */
const unique = (projectName: string) => `${projectName}-${Date.now()}`;

test('an administrator invites a teacher, who sets a password and signs in', async ({ page }, testInfo) => {
  const tag = unique(testInfo.project.name);
  const email = `cikgu.${tag}@guru.sapientia.test`;
  const password = 'kata-laluan-guru-baharu';

  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/users');
  await page.locator('#invite-name').fill(`Cikgu Ujian ${tag}`);
  await page.locator('#invite-email').fill(email);
  await page.locator('#invite-role').selectOption('teacher');
  await page.getByRole('button', { name: 'Cipta jemputan' }).click();
  const inviteUrl = await page.locator('#invite-link').inputValue();
  expect(inviteUrl).toContain('/accept-invite');
  await signOut(page);

  await page.goto(inviteUrl);
  await page.locator('#invite-password').fill(password);
  await page.locator('#invite-confirm').fill(password);
  await page.getByRole('button', { name: 'Tetapkan kata laluan' }).click();
  await page.waitForURL('**/staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();
  await signOut(page);

  // The invite link works once: the password it set is the only way in afterwards.
  await signIn(page, email, password);
  await expect(page.getByRole('banner').getByText(`Cikgu Ujian ${tag}`)).toBeVisible();
  // A teacher's menu has no administrator screens.
  await expect(page.getByRole('link', { name: 'Pengguna' })).toHaveCount(0);
});

test('a task created outside working hours is held and stays invisible to its assignee', async ({ page }, testInfo) => {
  const title = `Borang ditahan ${unique(testInfo.project.name)}`;
  await makeTodayAHoliday(page);

  await signIn(page, ACCOUNTS.sender.email);
  await page.goto('/staff/tasks/new');
  await expect(page.getByText(/^Akan dihantar: /)).toBeVisible();
  const taskId = await sendTask(page, { title, assigneeName: ACCOUNTS.aminah.name });
  await expect(page.getByText(/^Ditahan sehingga /)).toBeVisible();

  await page.getByRole('link', { name: 'Ditahan', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tugas Ditahan' })).toBeVisible();
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.aminah.email);
  await expect(page.getByText('Tiada tugas di sini.').first()).toBeVisible();
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
  // Not on the board, and not by its address either: a held task answers exactly like one that does not exist.
  expect((await page.request.get(`/api/tasks/${taskId}`)).status()).toBe(404);
  await page.goto(`/staff/tasks/${taskId}`);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('tidak ditemui');
});

test('a teacher completes a delivered task and the sender sees it done', async ({ page }, testInfo) => {
  const title = `Laporan segera ${unique(testInfo.project.name)}`;
  // Today is a holiday, so this also exercises the urgent override, which needs a reason.
  await makeTodayAHoliday(page);

  await signIn(page, ACCOUNTS.sender.email);
  await sendTask(page, { title, assigneeName: ACCOUNTS.ravi.name, urgentReason: 'Diminta oleh pejabat daerah hari ini.' });
  await expect(page.getByText(/^Dihantar /).first()).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.ravi.email);
  const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) });
  await expect(card).toBeVisible();
  await card.getByRole('combobox', { name: 'Status' }).selectOption('done');
  const doneColumn = page.getByRole('region', { name: /^Selesai/ });
  await expect(doneColumn.getByRole('link', { name: title })).toBeVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.sender.email);
  await page.goto('/staff/sent');
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: title }) });
  await expect(row.getByText('1 daripada 1')).toBeVisible();
});
