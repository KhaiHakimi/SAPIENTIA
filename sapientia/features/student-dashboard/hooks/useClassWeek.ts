'use client';

import { useQuery } from '@tanstack/react-query';
import { classWeekKey, fetchClassWeek } from '@/features/timetable/services/timetable.client';

/** The pupil's class timetable for the week starting on this Monday. The card and the weekly scroll share the cache. */
export function useClassWeek(monday: string) {
  return useQuery({ queryKey: classWeekKey(monday), queryFn: () => fetchClassWeek(monday) });
}
