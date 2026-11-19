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
      password_change_required: 'Pilih kata laluan anda sendiri dahulu.',
      mfa_setup_required: 'Sekolah anda mewajibkan log masuk dua langkah untuk pentadbir. Sediakannya dahulu.',
      mfa_unavailable: 'Log masuk dua langkah belum tersedia pada pelayan ini. Hubungi pasukan IT.',
      ai_unavailable: 'Pembantu AI tidak tersedia sekarang. Isi borang seperti biasa.',
      ai_bad_output: 'Pembantu AI tidak dapat membuat draf daripada arahan ini. Cuba tulis semula atau isi borang seperti biasa.',
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
      invalid_number: 'Masukkan nombor.',
      too_small: 'Terlalu kecil.',
      too_large: 'Terlalu besar.',
      too_many: 'Terlalu banyak.',
      invalid_boolean: 'Pilihan tidak sah.',
      invalid_day: 'Hari tidak sah.',
      duplicate_day: 'Hari ini dipilih lebih daripada sekali.',
      invalid_status: 'Status tidak sah.',
      invalid_kind: 'Jenis tidak sah.',
      invalid_state: 'Negeri tidak sah.',
      invalid_view: 'Paparan tidak sah.',
      invalid_cursor: 'Halaman tidak sah. Muat semula senarai.',
      invalid_token: 'Pautan ini tidak sah atau telah tamat tempoh.',
      invalid_key: 'Kunci tidak sah.',
      not_found: 'Tidak ditemui.',
      push_service_not_allowed: 'Pelayar ini menggunakan perkhidmatan push yang tidak dikenali.',
      invalid_idempotency_key: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
      json_required: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
      invalid_json: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
      file_required: 'Pilih fail.',
      file_too_large: 'Fail terlalu besar.',
      file_type: 'Jenis fail ini tidak diterima.',
      school_storage_full: 'Ruang simpanan sekolah sudah penuh. Minta pentadbir membuang fail lama.',
      multipart_required: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
      length_required: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
      invalid_form: 'Permintaan tidak sah. Muat semula dan cuba lagi.',
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
      password_change_required: 'Choose your own password first.',
      mfa_setup_required: 'Your school requires two-step sign-in for administrators. Set it up first.',
      mfa_unavailable: 'Two-step sign-in is not available on this server yet. Contact IT.',
      ai_unavailable: 'The AI assistant is not available right now. Fill in the form as usual.',
      ai_bad_output: 'The AI assistant could not draft a task from this instruction. Try rewording it, or fill in the form as usual.',
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
      invalid_number: 'Enter a number.',
      too_small: 'Too small.',
      too_large: 'Too large.',
      too_many: 'Too many.',
      invalid_boolean: 'Not a valid choice.',
      invalid_day: 'Not a valid day.',
      duplicate_day: 'This day is chosen more than once.',
      invalid_status: 'Not a valid status.',
      invalid_kind: 'Not a valid type.',
      invalid_state: 'Not a valid state.',
      invalid_view: 'Not a valid view.',
      invalid_cursor: 'Not a valid page. Reload the list.',
      invalid_token: 'This link is not valid or has expired.',
      invalid_key: 'Not a valid key.',
      not_found: 'Not found.',
      push_service_not_allowed: 'This browser uses a push service Sapientia does not recognise.',
      invalid_idempotency_key: 'The request was not valid. Reload and try again.',
      json_required: 'The request was not valid. Reload and try again.',
      invalid_json: 'The request was not valid. Reload and try again.',
      file_required: 'Choose a file.',
      file_too_large: 'The file is too large.',
      file_type: 'This kind of file is not accepted.',
      school_storage_full: 'The school has used all its storage. Ask an administrator to remove old files.',
      multipart_required: 'The request was not valid. Reload and try again.',
      length_required: 'The request was not valid. Reload and try again.',
      invalid_form: 'The request was not valid. Reload and try again.',
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
