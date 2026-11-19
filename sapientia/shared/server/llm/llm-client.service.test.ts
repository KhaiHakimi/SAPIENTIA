import { describe, expect, it, vi } from 'vitest';
import type { LlmConfig } from '@/shared/interfaces/llm.interface';
import { createOllamaClient, LlmFailure, readLlmConfig } from './llm-client.service';

const CONFIG: LlmConfig = { provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'test-model', timeoutMs: 1_000 };
/** process.env's type insists on NODE_ENV, which readLlmConfig never reads. */
const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;
const answer = (content: unknown, status = 200) => new Response(JSON.stringify({ message: { content } }), { status });

describe('readLlmConfig', () => {
  it('is off unless a known provider and a model are both set', () => {
    expect(readLlmConfig(env({}))).toBeNull();
    expect(readLlmConfig(env({ AI_PROVIDER: 'off', OLLAMA_MODEL: 'm' }))).toBeNull();
    expect(readLlmConfig(env({ AI_PROVIDER: 'ollama' }))).toBeNull();
    expect(readLlmConfig(env({ AI_PROVIDER: 'something-else', OLLAMA_MODEL: 'm' }))).toBeNull();
    expect(readLlmConfig(env({ AI_PROVIDER: 'ollama', OLLAMA_MODEL: 'm', OLLAMA_URL: 'file:///etc/passwd' }))).toBeNull();
  });

  it('defaults the address and clamps the timeout', () => {
    expect(readLlmConfig(env({ AI_PROVIDER: 'Ollama', OLLAMA_MODEL: 'm', AI_TIMEOUT_MS: '999999' })))
      .toEqual({ provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'm', timeoutMs: 120_000 });
    expect(readLlmConfig(env({ AI_PROVIDER: 'ollama', OLLAMA_MODEL: 'm', OLLAMA_URL: 'http://ai.local:8080/' }))?.baseUrl).toBe('http://ai.local:8080');
  });
});

describe('the Ollama client', () => {
  it('asks for JSON at temperature 0 and returns the message text', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(answer('{"title":"x"}'));
    const client = createOllamaClient(CONFIG, fetcher);
    await expect(client.complete({ system: 'sys', prompt: 'text' })).resolves.toBe('{"title":"x"}');
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'test-model', stream: false, format: 'json', options: { temperature: 0 },
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'text' }],
    });
  });

  it('tries once more when the provider cannot be reached or fails with 5xx', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValue(answer('{}'));
    await expect(createOllamaClient(CONFIG, fetcher).complete({ system: '', prompt: '' })).resolves.toBe('{}');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 4xx or an answer of the wrong shape', async () => {
    const refused = vi.fn<typeof fetch>().mockResolvedValue(answer('', 404));
    await expect(createOllamaClient(CONFIG, refused).complete({ system: '', prompt: '' })).rejects.toBeInstanceOf(LlmFailure);
    expect(refused).toHaveBeenCalledTimes(1);
    const odd = vi.fn<typeof fetch>().mockResolvedValue(answer(42));
    await expect(createOllamaClient(CONFIG, odd).complete({ system: '', prompt: '' })).rejects.toMatchObject({ kind: 'permanent' });
  });

  it('gives up after two unreachable attempts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    await expect(createOllamaClient(CONFIG, fetcher).complete({ system: '', prompt: '' })).rejects.toMatchObject({ kind: 'temporary' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
