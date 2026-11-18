import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import type { PupilHomeworkList } from '../features/homework/interfaces/homework.interface';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, E2E_PASSWORD, SCHOOL_TIME_ZONE } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/** A weekday a week or more ahead: clear of the holiday other journeys put on today. */
function weekdayAhead(): string {
  let day = DateTime.now().setZone(SCHOOL_TIME_ZONE).plus({ days: 7 });
  while (day.weekday > 5) day = day.plus({ days: 1 });
  return day.toISODate() ?? '';
}

/**
 * Homework (plan Phase 4, Sprint 12, part 1). A teacher sets homework for one of their own lessons, sees the class's week
 * and the marking check, ticks a paper hand-in and marks it as marked; the pupil's own list then shows it handed in. Each
 * project uses its own teacher and class so the two runs do not meet.
 */
test('a teacher sets homework, ticks a hand-in and the pupil sees it recorded', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  const teacher = desktop ? ACCOUNTS.ravi : ACCOUNTS.meiling;
  const lesson = desktop ? '4 Dedikasi — Sains' : '3 Cekal — Bahasa Inggeris';
  const pupil = desktop ? { name: 'Aisyah binti Rahman', username: 'aisyah0001' } : { name: 'Kavitha a/p Raman', username: 'kavitha0003' };
  const title = `Latihan ${testInfo.project.name} ${Date.now()}`;
  const dueOn = weekdayAhead();

  await signIn(page, teacher.email);
  await page.getByRole('link', { name: 'Kerja Rumah', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kerja Rumah' })).toBeVisible();

  await page.locator('#homework-lesson').selectOption({ label: lesson });
  await page.locator('#homework-title').fill(title);
  await page.locator('#homework-details').fill('Jawab soalan 1 hingga 5.');
  await page.locator('#homework-dueOn').fill(dueOn);
  await page.locator('#homework-markingMinutes').fill('30');
  await page.locator('#homework-markBy').fill(dueOn);
  // The check before saving: the class's week and whether the marking time exists.
  await expect(page.getByText(/kerja rumah lain pada hari itu|Kelas ini sudah ada/)).toBeVisible();
  await expect(page.getByText(/^Masa menyemak (ada|tidak cukup)/)).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await page.getByRole('button', { name: 'Beri kerja rumah', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Kerja rumah disimpan/ })).toBeVisible();
  const item = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(item).toContainText('0 daripada');

  // Paper hand-in: tap the pupil's name.
  await item.getByRole('button', { name: `Tandakan hantaran: ${title}` }).click();
  const name = item.getByRole('button', { name: pupil.name });
  await expect(name).toHaveAttribute('aria-pressed', 'false');
  await name.click();
  await expect(name).toHaveAttribute('aria-pressed', 'true');
  await expect(item).toContainText('1 daripada');
  expect(await violationsOn(page)).toEqual([]);

  await item.getByRole('button', { name: 'Tandakan sudah disemak' }).click();
  await expect(item.getByText('Sudah disemak')).toBeVisible();
  await signOut(page);

  // The pupil's own list (the board shows it from part 2): their hand-in only.
  await page.goto('/login');
  await page.locator('#login-identifier').fill(pupil.username);
  await page.locator('#login-password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await page.waitForURL('**/student');
  const response = await page.request.get('/api/student/homework');
  expect(response.status()).toBe(200);
  const { items } = (await response.json()) as PupilHomeworkList;
  expect(items.find((entry) => entry.title === title)).toMatchObject({ dueOn, handedIn: true, details: 'Jawab soalan 1 hingga 5.' });

  // Part 2: the board shows it as a room the teacher has cleared (no button to undo it), with the teacher's message on its scroll.
  const room = page.getByRole('listitem').filter({ hasText: title }).filter({ visible: true });
  await expect(room).toContainText('Diterima cikgu');
  await expect(room.getByRole('button', { name: /^Tandakan siap/ })).toHaveCount(0);
  await room.getByRole('button', { name: title, exact: true }).click();
  const scroll = page.getByRole('dialog', { name: title });
  await expect(scroll).toContainText('Jawab soalan 1 hingga 5.');
  await expect(scroll).toContainText('Guru anda telah merekod penghantaran ini.');
  expect(await violationsOn(page)).toEqual([]);
  await scroll.getByRole('button', { name: 'Tutup', exact: true }).last().click();

  // The weekly scroll is built from the teachers' timetables. Next week, since other journeys put a holiday on today.
  await page.getByRole('button', { name: 'Jadual Seminggu' }).filter({ visible: true }).click();
  const week = page.getByRole('dialog', { name: 'Jadual Waktu Seminggu' });
  await week.getByRole('button', { name: /Minggu depan/ }).click();
  await expect(week.getByText(lesson.split(' — ')[1], { exact: true }).first()).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
});
