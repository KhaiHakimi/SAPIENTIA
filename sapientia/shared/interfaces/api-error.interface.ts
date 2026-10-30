/** Machine-readable error codes; the web app turns them into Bahasa Melayu or English text. */
export type ApiErrorCode =
  | 'validation'
  | 'unauthenticated'
  | 'invalid_credentials'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'csrf'
  | 'configuration'
  | 'internal';

/** Body of every error response: { error: ApiErrorBody }. */
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  /** Field name to a short reason code (for example 'required', 'too_short'), for form errors. */
  fields?: Record<string, string>;
  requestId?: string;
}

/** One page of a list endpoint. nextCursor is null on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
