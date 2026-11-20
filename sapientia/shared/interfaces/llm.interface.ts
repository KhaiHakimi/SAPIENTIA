/** The language-model providers the server can be configured with (plan Phase 6: Ollama locally; off by default). */
export type LlmProvider = 'ollama';

export interface LlmConfig {
  provider: LlmProvider;
  /** Where the provider listens, for example http://127.0.0.1:11434 for Ollama. Set by the operator, never by a user. */
  baseUrl: string;
  model: string;
  /** Outer limit on one request, retries included per attempt. */
  timeoutMs: number;
}

export interface LlmRequest {
  /** Instructions for the model. */
  system: string;
  /** The text to work on. Callers remove names and other personal data first (see redaction.service). */
  prompt: string;
}

/** One function, as the plan asks: send a request, get the model's text back. Callers treat the text as untrusted. */
export interface LlmClient {
  readonly provider: LlmProvider;
  /** Answers with a JSON document as text; throws LlmFailure when the provider cannot be reached or refuses. */
  complete(request: LlmRequest): Promise<string>;
}

/** What redaction removed, so the screen can say so without repeating it. */
export interface RedactionResult {
  text: string;
  removed: number;
}
