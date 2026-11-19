import { apiFetch } from '@/shared/api/api-client';
import type { ApiTokenList, NewApiToken, NewApiTokenRequest } from '../interfaces/api-token.interface';

export const API_TOKENS_KEY = ['me', 'api-tokens'] as const;

export function fetchApiTokens(): Promise<ApiTokenList> {
  return apiFetch('/api/me/api-tokens');
}

export function createApiToken(request: NewApiTokenRequest): Promise<NewApiToken> {
  return apiFetch('/api/me/api-tokens', { method: 'POST', body: request });
}

export function revokeApiToken(id: string): Promise<void> {
  return apiFetch(`/api/me/api-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
