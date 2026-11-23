/**
 * MyKad numbers (YYMMDD-PB-###G) are never kept (plan Phase 4), so a value that looks like one is refused wherever staff type
 * about pupils or guardians: names, school numbers and homework notes. One detector for all of them, so a way of writing the
 * number that one form catches cannot slip through another. Pure functions: the schemas run in the browser and on the server.
 */

// The 6-2-4 groups with up to two characters of any kind between them, so dashes, spaces, dots, slashes and en dashes are
// all caught, as is an "IC" prefix. No digit may touch either end, so a longer number (a phone with a country code, an
// account number) is not mistaken for one.
const MYKAD_IN_TEXT = /(?<!\d)\d{6}\D{0,2}\d{2}\D{0,2}\d{4}(?!\d)/;
const MYKAD_DIGITS = 12;

// Full-width digits ('０１０２…', typed with some input methods) become ASCII digits, so they are caught too.
const normalise = (text: string) => text.normalize('NFKC');

/** Whether free text, such as a note to a pupil, contains a number written like a MyKad number. */
export function containsMyKad(text: string): boolean {
  return MYKAD_IN_TEXT.test(normalise(text));
}

/**
 * For a short field (a name, a school number), stricter than containsMyKad: twelve digits in all, however they are split, are
 * refused too. A short field has no room for two honest numbers that happen to add up to twelve digits.
 */
export function looksLikeMyKad(value: string): boolean {
  const text = normalise(value);
  return MYKAD_IN_TEXT.test(text) || text.replace(/\D/g, '').length === MYKAD_DIGITS;
}
