/** Where everyone signs in: staff by email, pupils by the username on their slip. */
export const SIGN_IN_PATH = '/login';

/**
 * Leaves for the sign-in page with a full page load, never a client-side navigation. With cacheComponents, Next.js keeps a page
 * it navigated away from alive but hidden, state and all, and shows that same copy on return. The sign-in page kept its "signed
 * in" state that way, opened the board again on its own, the board found no session and sent it back: a sign-in, sign-out
 * loop. A full load also drops every other page kept in memory (drafts, cached lists, the last person's typed password), which
 * a shared staffroom PC needs after sign-out anyway. `replace` keeps the signed-in page out of the Back button's history.
 */
export function openSignInPage(): void {
  window.location.replace(SIGN_IN_PATH);
}
