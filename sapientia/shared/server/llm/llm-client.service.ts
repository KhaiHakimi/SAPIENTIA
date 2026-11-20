import 'server-only';
import type { LlmClient, LlmConfig, LlmRequest } from '@/shared/interfaces/llm.interface';
import { DeadlineError, withDeadline } from '@/shared/services/deadline.service';
import { withRetry } from '../external-call.service';

const DEFAULT_TIMEOUT_MS = 20_000;
const TIMEOUT_MIN_MS = 1_000;
const TIMEOUT_MAX_MS = 120_000;

/** Why a call to the model failed: temporary failures (unreachable, 5xx) are retried once; the rest are not. */
export class LlmFailure extends Error {
  constructor(readonly kind: 'temporary' | 'permanent', message: string) {
    super(message);
    this.name = 'LlmFailure';
  }
}

/**
 * Reads the provider from the environment. AI_PROVIDER unset or 'off' turns every AI feature off, and the rest of the app
 * works as before (plan Phase 6: "feature can be switched off without breaking anything"). An unknown provider or a missing
 * model is a configuration mistake and also leaves AI off, rather than half-working.
 */
export function readLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig | null {
  const provider = env.AI_PROVIDER?.trim().toLowerCase();
  if (provider !== 'ollama') return null;
  const model = env.OLLAMA_MODEL?.trim();
  if (!model) return null;
  const baseUrl = (env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(baseUrl)) return null;
  const timeout = Number(env.AI_TIMEOUT_MS);
  const timeoutMs = Number.isInteger(timeout) ? Math.min(TIMEOUT_MAX_MS, Math.max(TIMEOUT_MIN_MS, timeout)) : DEFAULT_TIMEOUT_MS;
  return { provider: 'ollama', baseUrl, model, timeoutMs };
}

/** The client for the configured provider, or null when AI is off. */
export function getLlmClient(env: NodeJS.ProcessEnv = process.env): LlmClient | null {
  const config = readLlmConfig(env);
  return config && createOllamaClient(config);
}

/**
 * Ollama's chat endpoint with JSON output and temperature 0, so the same instruction gives the same draft. No streaming:
 * the answer is small and is validated as a whole.
 */
export function createOllamaClient(config: LlmConfig, fetcher: typeof fetch = fetch): LlmClient {
  const once = async (request: LlmRequest): Promise<string> => {
    let response: Response;
    try {
      response = await withDeadline(fetcher(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          format: 'json',
          options: { temperature: 0 },
          messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }],
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      }), config.timeoutMs);
    } catch (error) {
      // Not retried: a model that is too slow once is usually too slow again, and the person is waiting at the form.
      if (error instanceof DeadlineError || (error as Error)?.name === 'TimeoutError') throw new LlmFailure('permanent', 'The model did not answer in time.');
      throw new LlmFailure('temporary', 'The model could not be reached.');
    }
    if (!response.ok) throw new LlmFailure(response.status >= 500 ? 'temporary' : 'permanent', `The model answered ${response.status}.`);
    const body = await response.json().catch(() => null) as { message?: { content?: unknown } } | null;
    const content = body?.message?.content;
    if (typeof content !== 'string') throw new LlmFailure('permanent', 'The model answered in an unexpected shape.');
    return content;
  };
  return {
    provider: 'ollama',
    complete: (request) => withRetry(() => once(request), {
      attempts: 2, baseDelayMs: 500, maxDelayMs: 2_000,
      shouldRetry: (error) => error instanceof LlmFailure && error.kind === 'temporary',
    }),
  };
}
