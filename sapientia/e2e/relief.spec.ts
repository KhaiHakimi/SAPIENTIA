import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, SCHOOL_TIME_ZONE } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/** The next Monday-to-Friday day after today at the school: a working day in the seeded calendar whenever the tests run. */
function nextSchoolDay(): DateTime {
  let day = DateTime.now().setZone(SCHOOL_TIME_ZONE).startOf('day').plus({ days: 1 });
  while (day.weekday > 5) day = day.plus({ days: 1 });
  return day;
}

/**
 * Relief journey (plan Phase 2, Sprint 8). The seeded teachers all teach at the same times in the morning, so the period to
 * cover is an afternoon one added here; each project takes its own time so the two runs never clash.
 */
test('an administrator finds a free teacher for an absent colleague and gives them the class', async ({ page }, testInfo) => {
  const isDesktop = testInfo.project.name === 'desktop';
  const label = `Kelas tambahan ${testInfo.project.name}-${Date.now()}`;
  const day = nextSchoolDay();
  const onDate = day.toISODate() ?? '';
  const [startTime, endTime] = isDesktop ? ['15:20', '16:00'] : ['16:10', '16:50'];

  await signIn(page, ACCOUNTS.admin.email);
  const staff = (await (await page.request.get('/api/staff')).json()) as { items: { id: string; name: string }[] };
  const ravi = staff.items.find((person) => person.name === ACCOUNTS.ravi.name);
  expect(ravi).toBeDefined();
  const added = await page.request.post('/api/timetable/slots', {
    headers: { origin: new URL(page.url()).origin },
    data: { teacherId: ravi?.id, weekday: day.weekday, startTime, endTime, label },
  });
  expect(added.status()).toBe(201);

  await page.getByRole('link', { name: 'Guru Ganti' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Guru Ganti' })).toBeVisible();
  await page.locator('#relief-teacher').selectOption({ label: ACCOUNTS.ravi.name });
  await page.locator('#relief-date').fill(onDate);
  const period = page.getByRole('listitem').filter({ hasText: label });
  await expect(period).toContainText(`${startTime} hingga ${endTime}`);
  await expect(period.getByText('Belum ada guru ganti')).toBeVisible();

  await period.getByRole('button', { name: /^Cari guru ganti/ }).click();
  // The two colleagues are free in the afternoon; the absent teacher is never suggested for his own class.
  await expect(period.getByRole('button', { name: `Pilih ${ACCOUNTS.aminah.name}` })).toBeVisible();
  await expect(period.getByRole('button', { name: `Pilih ${ACCOUNTS.meiling.name}` })).toBeVisible();
  await expect(period.getByRole('button', { name: `Pilih ${ACCOUNTS.ravi.name}` })).toHaveCount(0);
  await expect(period.getByText(/\d+ kelas ganti bulan ini · /).first()).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  await period.getByRole('button', { name: `Pilih ${ACCOUNTS.aminah.name}` }).click();
  await expect(period.getByText(`Diganti oleh ${ACCOUNTS.aminah.name}`)).toBeVisible();
  // Arranged outside working hours, the relief teacher is told at the next working start; inside them, at once.
  const told = period.getByText('Sudah dimaklumkan', { exact: true });
  const held = period.getByText(/^Akan dimaklumkan /);
  await expect(told.or(held)).toBeVisible();
  const isHeld = await held.isVisible();
  await signOut(page);

  await signIn(page, ACCOUNTS.aminah.email);
  await page.getByRole('link', { name: 'Guru Ganti' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Kelas ganti saya' })).toBeVisible();
  // A teacher has no way to arrange relief.
  await expect(page.locator('#relief-teacher')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);
  const duty = page.getByRole('row').filter({ hasText: label });
  if (isHeld) {
    await expect(duty).toHaveCount(0);
  } else {
    await expect(duty).toContainText(ACCOUNTS.ravi.name);
    await expect(duty).toContainText(`${startTime} hingga ${endTime}`);
  }
  await signOut(page);

  // Cancelling leaves the class uncovered again.
  await signIn(page, ACCOUNTS.admin.email);
  await page.goto('/staff/relief');
  await page.locator('#relief-teacher').selectOption({ label: ACCOUNTS.ravi.name });
  await page.locator('#relief-date').fill(onDate);
  const covered = page.getByRole('listitem').filter({ hasText: label });
  await covered.getByRole('button', { name: /^Batalkan / }).click();
  await expect(covered.getByText('Belum ada guru ganti')).toBeVisible();
});
