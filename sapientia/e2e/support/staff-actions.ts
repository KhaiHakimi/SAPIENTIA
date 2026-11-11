import { expect, type Page } from '@playwright/test';
import { DateTime } from 'luxon';
import { ACCOUNTS, E2E_PASSWORD, SCHOOL_TIME_ZONE } from './e2e-env';

/** What the journeys do more than once. Screens are read in Bahasa Melayu, the default language. */

export function schoolDay(daysFromToday = 0): string {
  const day = DateTime.now().setZone(SCHOOL_TIME_ZONE).plus({ days: daysFromToday }).toISODate();
  if (!day) throw new Error('Could not work out the school day.');
  return day;
}

export async function signIn(page: Page, email: string, password = E2E_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await page.waitForURL('**/staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Papan Tugas' })).toBeVisible();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log Keluar' }).click();
  await page.waitForURL('**/login');
}

/**
 * Makes today a school holiday, so a task created now is held whatever time the journeys run. This is the administrator's
 * real route to a held task: no clock is faked. Leaves the administrator signed out.
 */
export async function makeTodayAHoliday(page: Page): Promise<void> {
  const today = schoolDay();
  await signIn(page, ACCOUNTS.admin.email);
  const existing = await page.request.get('/api/calendar/events');
  const { items } = (await existing.json()) as { items: { onDate: string }[] };
  if (!items.some((event) => event.onDate === today)) {
    await page.goto('/staff/calendar');
    await page.locator('#event-date').fill(today);
    await page.locator('#event-title').fill('Cuti ujian hujung-ke-hujung');
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Cuti ujian hujung-ke-hujung', exact: true })).toBeVisible();
  }
  await signOut(page);
}

export interface NewTask {
  title: string;
  assigneeName: string;
  urgentReason?: string;
}

/** Fills the new-task form as the signed-in sender and returns the new task's id from the page it lands on. */
export async function sendTask(page: Page, task: NewTask): Promise<string> {
  await page.goto('/staff/tasks/new');
  await page.locator('#task-title').fill(task.title);
  await page.getByRole('checkbox', { name: task.assigneeName }).check();
  await page.locator('#task-due').fill(schoolDay(14));
  if (task.urgentReason) {
    await page.getByRole('checkbox', { name: /^Segera/ }).check();
    await page.locator('#task-urgent-reason').fill(task.urgentReason);
  }
  await page.getByRole('button', { name: 'Hantar tugas' }).click();
  await page.waitForURL(/\/staff\/tasks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: task.title })).toBeVisible();
  return new URL(page.url()).pathname.split('/').pop() ?? '';
}
