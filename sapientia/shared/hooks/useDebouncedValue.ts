'use client';

import { useEffect, useState } from 'react';

/** The value as it was once it stopped changing for `delayMs`, so a check runs when typing pauses, not on every key. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
