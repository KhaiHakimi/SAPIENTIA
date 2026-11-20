import { expect, test, type Page } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, E2E_PASSWORD } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

/** Signs a guardian in through the shared form; lands on /guardian (the view, or the choose-password step). */
async function guardianSignIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-identifier').fill(username);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Log Masuk', exact: true }).click();
  await page.waitForURL('**/guardian');
}

/**
 * Guardians (plan Phase 4, Sprint 13, part 1). The administrator adds a guardian linked to a pupil and prints the slip; the
 * guardian signs in with it, chooses a password, sees the child's homework and week, then refuses the link as wrong; the
 * administrator sees the refusal and its reason. Each project uses its own pupil so the two runs do not meet.
 */
test('an administrator links a guardian, who signs in with the slip, sees the child, then refuses the link', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  const child = desktop ? { className: '4 Dedikasi', name: 'Daniel Lee' } : { className: '3 Cekal', name: 'Kavitha a/p Raman' };
  const guardianName = `Penjaga Ujian ${testInfo.project.name} ${Date.now() % 1_000_000}`;

  await signIn(page, ACCOUNTS.admin.email);
  await page.getByRole('link', { name: 'Penjaga', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Penjaga' })).toBeVisible();

  await page.locator('#add-guardian-name').fill(guardianName);
  await page.locator('#add-guardian-class').selectOption({ label: child.className });
  await page.locator('#add-guardian-pupil').selectOption({ label: child.name });
  await page.locator('#add-guardian-relationship').selectOption({ label: 'Ibu' });
  await page.getByRole('button', { name: 'Tambah dan cetak slip' }).click();

  const slip = page.getByRole('region', { name: 'Slip log masuk penjaga' });
  await expect(slip).toBeVisible();
  await expect(slip).toContainText(`Anak: ${child.name}`);
  const [username, startingPassword] = await slip.locator('dd').allTextContents();
  expect(username).toMatch(/^penjaga\.penjaga\d{4}$/);
  expect(startingPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
  expect(await violationsOn(page)).toEqual([]);
  await slip.getByRole('button', { name: 'Selesai' }).click();

  // The printed summary for a guardian without a smartphone: the child's class homework and week, no hand-ins.
  await page.getByRole('button', { name: `Urus ${guardianName}` }).click();
  await page.getByRole('link', { name: `Ringkasan bercetak untuk ${guardianName}` }).click();
  const sheet = page.getByRole('article', { name: `Ringkasan sekolah untuk ${guardianName}` });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: `${child.name} (${child.className})` })).toBeVisible();
  await expect(sheet).not.toContainText('Belum direkod');
  await page.getByRole('button', { name: 'Minggu depan' }).click();
  await expect(page.getByRole('button', { name: 'Minggu depan' })).toHaveAttribute('aria-pressed', 'true');
  expect(await violationsOn(page)).toEqual([]);
  await signOut(page);

  // The guardian: slip, own password, then the child's homework and week.
  await guardianSignIn(page, username, startingPassword);
  await expect(page.getByRole('heading', { name: 'Pilih kata laluan anda' })).toBeVisible();
  await page.locator('#guardian-currentPassword').fill(startingPassword);
  await page.locator('#guardian-newPassword').fill(E2E_PASSWORD);
  await page.locator('#guardian-confirm').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Simpan kata laluan' }).click();

  const childSection = page.getByRole('region', { name: `${child.name} (${child.className})` });
  await expect(childSection).toBeVisible();
  await expect(childSection).toContainText('Hubungan anda: Ibu');
  await expect(childSection.getByRole('heading', { name: 'Kerja rumah' })).toBeVisible();
  await expect(childSection.getByRole('heading', { name: 'Jadual waktu' })).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  // Ask one of the class's teachers for a meeting, from the fixed lists, then withdraw it. Whether it reaches the teacher now
  // or at the next working start depends on the real clock, so the teacher's side is tested in the integration tests.
  const teacher = childSection.getByLabel('Guru', { exact: true });
  await teacher.selectOption({ index: 1 });
  await childSection.getByLabel('Perkara').selectOption({ label: 'Kemajuan pelajaran' });
  await childSection.getByRole('button', { name: 'Hantar permintaan' }).click();
  await expect(childSection.getByRole('status').filter({ hasText: 'Permintaan dihantar.' })).toBeVisible();
  await expect(childSection.getByText('Menunggu jawapan', { exact: true })).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await childSection.getByRole('button', { name: 'Tarik balik' }).click();
  await expect(childSection.getByText('Ditarik balik', { exact: true })).toBeVisible();

  // The link is wrong: refuse it with a reason.
  await childSection.getByRole('button', { name: 'Pautan ini salah?' }).click();
  await childSection.getByRole('radio', { name: 'Ini bukan anak saya' }).check();
  await childSection.getByRole('button', { name: 'Tolak pautan' }).click();
  await expect(page.getByText('Pautan ditolak. Pihak sekolah akan melihat sebab anda.')).toBeVisible();
  await expect(childSection).toHaveCount(0);
  await expect(page.getByText('Tiada anak dipautkan pada akaun ini.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Log Keluar' }).click();
  await page.waitForURL('**/login');

  // The administrator sees the refusal and its reason.
  await signIn(page, ACCOUNTS.admin.email);
  await page.getByRole('link', { name: 'Penjaga', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: guardianName });
  await expect(row).toContainText('Ditolak oleh penjaga');
  await expect(row).toContainText('Sebab: Ini bukan anak saya');
});

test('the seeded guardian sees only their own child', async ({ page }) => {
  await guardianSignIn(page, 'penjaga.rahman0001', E2E_PASSWORD);
  await expect(page.getByRole('heading', { level: 1, name: 'Selamat datang, Rahman bin Ismail' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Aisyah binti Rahman (4 Dedikasi)' })).toBeVisible();
  // Next.js keeps the sign-in page hidden in the DOM (its demo list names Daniel), so count only what is on screen.
  await expect(page.getByText('Daniel Lee').filter({ visible: true })).toHaveCount(0);
});
