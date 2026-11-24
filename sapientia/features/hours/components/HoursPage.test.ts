import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { StaffUserContext } from '@/features/staff/hooks/useStaffUser';
import { HoursPage } from './HoursPage';

const user: SessionUser = {
  id: '00000000-0000-4000-8000-000000000001',
  schoolId: '00000000-0000-4000-8000-000000000002',
  schoolName: 'Sekolah Contoh',
  timeZone: 'Asia/Kuala_Lumpur',
  email: 'guru@sekolah.test',
  name: 'Guru',
  role: 'teacher',
  mfaSetupRequired: false,
};

/** The page as the server first draws it: no request has been answered, so only what does not wait on one shows. */
function render(initialMonth: string): string {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: queryClient },
      createElement(StaffUserContext.Provider, { value: user }, createElement(HoursPage, { initialMonth }))),
  );
}

describe('HoursPage', () => {
  it('waits for the month it asked for', () => {
    expect(render('2026-11')).toContain('role="status"');
  });

  it('shows no endless loading line when the month field is cleared', () => {
    // A cleared field switches the request off, and a request that never runs never stops "loading".
    const page = render('');
    expect(page).not.toContain('role="status"');
    expect(page).not.toContain('Memuatkan');
  });
});
