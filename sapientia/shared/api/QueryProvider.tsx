'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from './api-client';

/** Retries network failures and 5xx with TanStack's exponential backoff; a 4xx answer will not change by asking again. */
const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < 3 && (!(error instanceof ApiError) || error.code === 'network' || error.status >= 500);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry, staleTime: 30_000 }, mutations: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
