import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS } from './support/e2e-env';
import { signIn, signOut } from './support/staff-actions';

const PDF = Buffer.from('%PDF-1.4\n% Lembaran kerja\n%%EOF\n');

/**
 * The shared material bank (plan Phase 3, Sprint 10). A teacher shares a link and a file; a colleague finds both and
 * downloads the file; the teacher removes them. A word unique to the run keeps the two projects' materials apart.
 */
test('a teacher shares a link and a file, and a colleague finds and downloads them', async ({ page }, testInfo) => {
  const [owner, colleague] = testInfo.project.name === 'desktop' ? [ACCOUNTS.ravi, ACCOUNTS.aminah] : [ACCOUNTS.meiling, ACCOUNTS.ravi];
  const tag = `ujian${testInfo.project.name}${Date.now()}`;

  await signIn(page, owner.email);
  await page.getByRole('link', { name: 'Bank Bahan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bank Bahan' })).toBeVisible();
  // The form is folded away until asked for.
  await expect(page.locator('#material-title')).toHaveCount(0);
  await page.getByRole('button', { name: 'Kongsi bahan' }).click();

  await page.locator('#material-title').fill(`Video fotosintesis ${tag}`);
  await page.locator('#material-url').fill('https://delima.sapientia.test/sains/fotosintesis');
  await page.locator('#material-level').selectOption('tingkatan_2');
  await page.locator('#material-topic').fill('Fotosintesis');
  await page.getByRole('button', { name: 'Kongsi', exact: true }).click();
  await expect(page.getByText('Bahan dikongsi.')).toBeVisible();

  await page.getByRole('radio', { name: 'Fail' }).check();
  await page.locator('#material-title').fill(`Lembaran kerja ${tag}`);
  await page.locator('#material-file').setInputFiles({ name: 'Lembaran Kerja.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.getByRole('button', { name: 'Kongsi', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3, name: `Lembaran kerja ${tag}` })).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);
  await signOut(page);

  // A colleague finds both by searching, and downloads the file.
  await signIn(page, colleague.email);
  await page.goto('/staff/materials');
  await page.locator('#materials-search').fill(tag);
  const results = page.getByRole('listitem').filter({ hasText: tag });
  await expect(results).toHaveCount(2);
  const linkItem = results.filter({ hasText: 'Video fotosintesis' });
  await expect(linkItem.getByRole('link', { name: 'Buka pautan' })).toHaveAttribute('href', 'https://delima.sapientia.test/sains/fotosintesis');
  await expect(linkItem.getByText('Tingkatan 2')).toBeVisible();
  // Only the person who shared a material (or an administrator) can remove it.
  await expect(results.getByRole('button', { name: /^Buang / })).toHaveCount(0);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    results.filter({ hasText: 'Lembaran kerja' }).getByRole('link', { name: /^Muat turun \(PDF, / }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Lembaran Kerja.pdf');
  await signOut(page);

  // The owner removes both.
  await signIn(page, owner.email);
  await page.goto('/staff/materials');
  await page.locator('#materials-search').fill(tag);
  await expect(page.getByRole('listitem').filter({ hasText: tag })).toHaveCount(2);
  await page.getByRole('button', { name: `Buang Video fotosintesis ${tag}` }).click();
  await page.getByRole('button', { name: `Buang Lembaran kerja ${tag}` }).click();
  await expect(page.getByText('Tiada bahan yang sepadan dengan carian ini.')).toBeVisible();
});
