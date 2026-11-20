import type { DemoGuardian, DemoPupil } from '../interfaces/account.interface';

/**
 * Fictional pupils created by `npm run db:seed` in the first demo school, listed on the sign-in page so testers need not
 * remember them. Their password is SEED_PASSWORD from .env and they have already chosen it, so they skip the slip step.
 */
export const DEMO_PUPILS: readonly DemoPupil[] = [
  { name: 'Aisyah binti Rahman', className: '4 Dedikasi', username: 'aisyah0001' },
  { name: 'Daniel Lee', className: '4 Dedikasi', username: 'daniel0002' },
  { name: 'Kavitha a/p Raman', className: '3 Cekal', username: 'kavitha0003' },
];

/** A fictional guardian created by `npm run db:seed`, linked to Aisyah; same password, already chosen. */
export const DEMO_GUARDIANS: readonly DemoGuardian[] = [
  { name: 'Rahman bin Ismail', username: 'penjaga.rahman0001', childUsername: 'aisyah0001', relationship: 'father' },
];
