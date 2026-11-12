/** Text helpers shared by every outgoing message. Titles and names are typed by people, so they are never trusted. */

export const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Keeps typed text on one line, so it cannot add a header to an email subject or break a push. */
export const oneLine = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim();

export const EMAIL_FOOTER: readonly string[] = [
  'Anda menerima e-mel ini kerana pemberitahuan e-mel dihidupkan. Tukar tetapan ini di halaman Pemberitahuan.',
  'You receive this email because email notifications are on. Change this on the Notifications page.',
];
