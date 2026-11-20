'use client';

import { useEffect, useState } from 'react';
import { SCHOOL_CLOCK_TICK_MS } from '../constants/board.constants';
import type { SchoolNow } from '@/shared/interfaces/school-clock.interface';
import { schoolNow } from '@/shared/services/school-clock.service';

/** The school's date and time of day, moving on every SCHOOL_CLOCK_TICK_MS, so "now" and "today" follow the real clock. */
export function useSchoolClock(timeZone: string): SchoolNow {
  const [now, setNow] = useState(() => schoolNow(new Date(), timeZone));
  useEffect(() => {
    const timer = setInterval(() => setNow(schoolNow(new Date(), timeZone)), SCHOOL_CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [timeZone]);
  return now;
}
