'use client';

import { useContext } from 'react';
import { StudentProgressContext } from '../context/StudentProgressProvider';
import type { StudentProgress } from '../interfaces/progress.interface';

export function useStudentProgress(): StudentProgress {
  const progress = useContext(StudentProgressContext);
  if (!progress) throw new Error('useStudentProgress must be used inside <StudentProgressProvider>.');
  return progress;
}
