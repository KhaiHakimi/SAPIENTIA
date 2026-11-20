'use client';

import { useEffect, useState } from 'react';

/**
 * A number that changes every time this page is hidden. With cacheComponents, Next.js keeps a page it navigated away from alive
 * but hidden, state and all, and runs its effects' cleanups as it hides. Give the page's content this as its `key` and the next
 * visit starts from scratch, as a page that must not remember the last visit (sign-in, accept-invite) needs.
 */
export function useVisitKey(): number {
  const [visit, setVisit] = useState(0);
  useEffect(() => () => setVisit((count) => count + 1), []);
  return visit;
}
