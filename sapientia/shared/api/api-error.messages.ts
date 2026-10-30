import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { ApiError } from './api-client';

/** What to tell the user for each API error code, and for each field reason the server's schemas use. */
interface ApiErrorMessages {
  codes: Record<string, string>;
  fields: Record<string, string>;
  withRequestId: (message: string, requestId: string) => string;
}

export const API_ERROR_MESSAGES: Record<Lang, ApiErrorMessages> = {
  ms: {
    codes: {
      network: 'Tiada sambungan ke pelayan. Semak internet anda dan cuba lagi.',
      validation: 'Sila betulkan medan yang ditanda.',
      unauthenticated: 'Sesi anda telah tamat. Sila log masuk semula.',
      invalid_credentials: 'Emel atau kata laluan tidak sepadan.',
      not_found: 'Rekod ini tidak ditemui atau anda tiada akses kepadanya.',
      conflict: 'Rekod ini sudah wujud.',
      rate_limited: 'Terlalu banyak cubaan. Sila tunggu sebentar dan cuba lagi.',
      csrf: 'Permintaan ditolak. Muat semula halaman dan cuba lagi.',
      configuration: 'Tetapan sekolah tidak membenarkan tindakan ini. Hubungi pentadbir.',
      internal: 'Ralat pelayan. Cuba lagi sebentar lagi.',
    },
    fields: {
      required: 'Wajib diisi.',
      too_long: 'Terlalu panjang.',
      too_short: 'Terlalu pendek.',
      invalid_email: 'Format emel tidak sah.',
      invalid_role: 'Pilih peranan.',
      taken: 'Emel ini sudah mempunyai akaun.',
      invalid_date: 'Tarikh tidak sah.',
      invalid_time: 'Masa tidak sah.',
      mismatch: 'Kata laluan tidak sama.',
    },
    withRequestId: (message, requestId) => `${message} (Rujukan: ${requestId})`,
  },
  en: {
    codes: {
      network: 'Cannot reach the server. Check your connection and try again.',
      validation: 'Please correct the marked fields.',
      unauthenticated: 'Your session has ended. Please sign in again.',
      invalid_credentials: 'Incorrect email or password.',
      not_found: 'This record was not found, or you do not have access to it.',
      conflict: 'This already exists.',
      rate_limited: 'Too many attempts. Please wait a moment and try again.',
      csrf: 'Request refused. Reload the page and try again.',
      configuration: 'The school settings do not allow this. Contact your administrator.',
      internal: 'Server error. Try again shortly.',
    },
    fields: {
      required: 'Required.',
      too_long: 'Too long.',
      too_short: 'Too short.',
      invalid_email: 'That email format is not valid.',
      invalid_role: 'Choose a role.',
      taken: 'This email already has an account.',
      invalid_date: 'Not a valid date.',
      invalid_time: 'Not a valid time.',
      mismatch: 'The passwords do not match.',
    },
    withRequestId: (message, requestId) => `${message} (Reference: ${requestId})`,
  },
};

/** One line for an alert; server errors carry the request id so a report can be traced. */
export function describeApiError(error: unknown, lang: Lang): string {
  const text = API_ERROR_MESSAGES[lang];
  const code = error instanceof ApiError ? error.code : 'internal';
  const message = text.codes[code] ?? text.codes.internal;
  return error instanceof ApiError && error.status >= 500 && error.requestId ? text.withRequestId(message, error.requestId) : message;
}

/** A field's reason code as text, or an empty string. */
export function describeFieldError(reason: string | undefined, lang: Lang): string {
  if (!reason) return '';
  return API_ERROR_MESSAGES[lang].fields[reason] ?? API_ERROR_MESSAGES[lang].codes.validation;
}
