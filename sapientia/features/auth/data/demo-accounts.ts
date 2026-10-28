import { SAMPLE_BASELINE, SAMPLE_STUDENT } from '@/features/student-dashboard/data/sample-student';
import type { DemoAccount } from '../interfaces/account.interface';

/**
 * Mock accounts for the prototype. The people are fictional and the .test domain is reserved, so no address can reach anyone.
 * Each student starts at a different point so the board visibly changes between accounts.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: 'student-aisyah',
    role: 'student',
    email: 'aisyah@pelajar.sapientia.test',
    password: 'pelajar123',
    student: SAMPLE_STUDENT,
    baseline: SAMPLE_BASELINE,
  },
  {
    id: 'student-daniel',
    role: 'student',
    email: 'daniel@pelajar.sapientia.test',
    password: 'pelajar123',
    student: { name: 'Daniel', className: '4 Bestari' },
    baseline: { xp: 160, coins: 60, streak: 1, classHandedIn: 12, classTotal: 28 },
  },
  {
    id: 'student-kavitha',
    role: 'student',
    email: 'kavitha@pelajar.sapientia.test',
    password: 'pelajar123',
    student: { name: 'Kavitha', className: '5 Cemerlang' },
    baseline: { xp: 760, coins: 240, streak: 6, classHandedIn: 22, classTotal: 24 },
  },
  {
    id: 'teacher-aminah',
    role: 'teacher',
    email: 'cikgu.aminah@guru.sapientia.test',
    password: 'demo1234',
    name: 'Cikgu Aminah',
  },
];
