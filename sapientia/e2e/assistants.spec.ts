import { expect, test } from '@playwright/test';
import { violationsOn } from './support/accessibility';
import { ACCOUNTS, E2E_PASSWORD } from './support/e2e-env';
import { sendTask, signIn } from './support/staff-actions';

/**
 * Phase 6 on screen: the "a task like this is still open" warning while writing a task, and an access token for an AI
 * assistant used against the MCP server. The AI draft panel stays hidden because the journeys run with AI switched off.
 */

test('a sender writing a task that is already open is told so, without being stopped', async ({ page }) => {
  await signIn(page, ACCOUNTS.sender.email);
  const taskId = await sendTask(page, { title: 'Hantar markah PBD Tahun 4 (journey)', assigneeName: ACCOUNTS.aminah.name });

  await page.goto('/staff/tasks/new');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Buat draf daripada arahan (AI)')).toHaveCount(0);
  await page.locator('#task-title').fill('hantar markah pbd tahun 4');
  const notice = page.getByRole('main').getByRole('status').filter({ hasText: 'masih terbuka' });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole('link', { name: 'Hantar markah PBD Tahun 4 (journey)' }).first()).toHaveAttribute('href', `/staff/tasks/${taskId}`);
  await expect(notice).toContainText('dihantar oleh anda');
  expect(await violationsOn(page)).toEqual([]);

  await page.locator('#task-title').fill('Mesyuarat panitia Sains');
  await expect(notice).toHaveCount(0);
});

test('a teacher makes an access token, an assistant reads their tasks with it, and revoking it ends access', async ({ page }) => {
  await signIn(page, ACCOUNTS.meiling.email);
  await page.getByRole('link', { name: 'Keselamatan', exact: true }).click();
  const section = page.getByRole('region', { name: 'Akses pembantu AI (MCP)' });
  await expect(section).toBeVisible();
  expect(await violationsOn(page)).toEqual([]);

  const name = `Pembantu ${test.info().project.name}`;
  await section.locator('#mcp-token-name').fill(name);
  await section.locator('#mcp-token-password').fill(E2E_PASSWORD);
  await section.getByRole('button', { name: 'Buat token' }).click();
  const shown = section.getByRole('status').filter({ hasText: 'tidak akan ditunjukkan lagi' });
  await expect(shown).toBeVisible();
  const token = (await shown.locator('code').textContent()) ?? '';
  expect(token).toMatch(/^sap_/);
  await shown.getByRole('button', { name: 'Sudah disalin' }).click();

  const ask = () => page.request.post('/api/mcp', {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_my_tasks', arguments: {} } },
  });
  const answer = await ask();
  expect(answer.status()).toBe(200);
  expect((await answer.json()).result.content[0].type).toBe('text');

  await section.getByRole('button', { name: `Batalkan ${name}` }).click();
  await expect(section.getByRole('status').filter({ hasText: 'Token telah dibatalkan.' })).toBeVisible();
  expect((await ask()).status()).toBe(401);
});
