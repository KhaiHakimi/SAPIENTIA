'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { API_TOKEN_NAME_MAX } from '../constants/mcp.constants';
import type { McpMessages } from '../i18n/mcp-messages.interface';
import { MCP_MESSAGES } from '../i18n/mcp.messages';
import type { NewApiToken } from '../interfaces/api-token.interface';
import { API_TOKENS_KEY, createApiToken, fetchApiTokens, revokeApiToken } from '../services/api-tokens.client';

const fieldText = (reason: string | undefined, text: McpMessages, lang: Lang) =>
  (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);
const day = (iso: string, lang: Lang) => formatDay(iso.slice(0, 10), lang);

/**
 * Personal access tokens for the read-only MCP server (plan Phase 6), on the Security page. Shown only when the server has
 * MCP switched on. A new token asks for the password again and is shown once; revoking takes effect at once.
 */
export function ApiTokensSection() {
  const text = useMessages(MCP_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const tokens = useQuery({ queryKey: API_TOKENS_KEY, queryFn: fetchApiTokens });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [made, setMade] = useState<NewApiToken | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: API_TOKENS_KEY });
  const create = useMutation({
    mutationFn: () => createApiToken({ name, password }),
    onSuccess: async (result) => {
      setMade(result);
      setName('');
      setPassword('');
      await refresh();
    },
    onError: () => setPassword(''),
  });
  const revoke = useMutation({ mutationFn: revokeApiToken, onSuccess: refresh });
  const fields = create.error instanceof ApiError ? create.error.fields : {};

  if (!tokens.data?.available) return null;
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <section className={calm.card} aria-labelledby="mcp-heading">
      <h2 id="mcp-heading">{text.heading}</h2>
      <p>{text.intro}</p>
      <p className={calm.help}>{text.scope}</p>
      <p>{text.endpoint}: <code className={calm.code}>{tokens.data.endpoint}</code></p>

      {tokens.data.items.length === 0 ? <p className={calm.muted}>{text.none}</p> : (
        <ul>
          {tokens.data.items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>{' '}
              <span className={calm.muted}>
                ({[text.created(day(item.createdAt, lang)), item.lastUsedAt ? text.lastUsed(day(item.lastUsedAt, lang)) : text.neverUsed,
                  text.expires(day(item.expiresAt, lang))].join(', ')})
              </span>{' '}
              <button type="button" className={`${calm.button} ${calm.small}`} disabled={revoke.isPending} onClick={() => revoke.mutate(item.id)}>
                {text.revoke(item.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {revoke.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(revoke.error, lang)}</div>}
      {revoke.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.revoked}</div>}

      {made ? (
        <div className={`${calm.alert} ${calm.alertInfo}`} role="status">
          <strong>{text.shownOnce}</strong>
          {/* calm.code breaks anywhere: a 47-character token has no other place to wrap on a phone. */}
          <p>{text.tokenLabel}: <code className={calm.code}>{made.token}</code></p>
          <button type="button" className={calm.button} onClick={() => setMade(null)}>{text.done}</button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <h3>{text.newHeading}</h3>
          {create.isError && !fields.name && !fields.password && (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(create.error, lang)}</div>
          )}
          <div className={calm.field}>
            <label className={calm.label} htmlFor="mcp-token-name">{text.name}</label>
            <input id="mcp-token-name" className={calm.input} value={name} maxLength={API_TOKEN_NAME_MAX} onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fields.name)} aria-describedby="mcp-token-name-help mcp-token-name-error" />
            <div id="mcp-token-name-help" className={calm.help}>{text.nameHelp}</div>
            <div id="mcp-token-name-error" className={calm.fieldError}>{fieldText(fields.name, text, lang)}</div>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="mcp-token-password">{text.password}</label>
            <input id="mcp-token-password" type="password" autoComplete="current-password" className={calm.input} value={password}
              onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fields.password)} aria-describedby="mcp-token-password-error" />
            <div id="mcp-token-password-error" className={calm.fieldError}>{fieldText(fields.password, text, lang)}</div>
          </div>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={create.isPending}>
            {create.isPending ? text.creating : text.create}
          </button>
        </form>
      )}
    </section>
  );
}
