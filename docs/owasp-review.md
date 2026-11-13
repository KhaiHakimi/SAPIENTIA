# OWASP Top 10 review

Sprint 5 review of the staff side (Sprints 2 to 5), done on 11 November 2026 against the OWASP Top 10 (2021 list). The development guide's own checklist (Section 11) was not available on this machine, so the public list was used; compare the two when the guide is to hand.

This is a self-review of a portfolio project that holds fictional data only. It is not an independent penetration test and does not make the app fit for real school data.

Status words: **Pass** (checked in code and by a test), **Fixed** (changed in this review), **Open** (known gap, with what to do).

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Every route under `app/api/` except sign-in, sign-out and accept-invite calls `requireUser`, with a role list where one applies. Repositories take `schoolId` first. Refusal tests: wrong role, other school, non-assignee, held task (all 404). |
| A02 | Cryptographic failures | Pass, one Open | argon2id for passwords; session and invite tokens are random and only their SHA-256 is stored; cookie is HttpOnly, SameSite=Lax, and Secure over HTTPS or in production. **Open:** TLS is the host's job and no host is chosen yet (D5). HSTS is now sent outside development. |
| A03 | Injection | Pass, Fixed | Parameterised SQL only (no string-built queries); Zod strict objects on every body and query; React escapes output and there is no `dangerouslySetInnerHTML` or `innerHTML`. **Fixed:** Content-Security-Policy added (see below). |
| A04 | Insecure design | Pass | Held tasks are hidden by the service, not the screen; delivery is a conditional update, so a repeated job is harmless; urgent override needs a reason (database CHECK and schema); `Idempotency-Key` on task creation. |
| A05 | Security misconfiguration | Fixed | CSP, HSTS (production), `Cross-Origin-Opener-Policy`, and `X-Powered-By` removed, on top of the existing `nosniff`, frame denial, referrer and permissions policies. Unexpected errors return a request id and no detail. |
| A06 | Vulnerable components | Pass, one Open | Exact versions pinned for runtime packages; lockfile committed; CI fails on high or critical advisories. `npm audit --omit=dev`: 0. **Open:** 11 moderate advisories in development tools only (Vitest's mocker, `glob`, `minimatch` under ESLint). They do not ship. Update when the fixed releases are two weeks old. |
| A07 | Identification and authentication failures | Pass, two Open | One answer for wrong email, wrong password and inactive account; 5 failures per account and 30 per address in 15 minutes; passwords 10 to 128 characters; sessions end after 60 minutes idle or 12 hours. **Open:** no check against breached-password lists; no MFA (planned before Phase 5). |
| A08 | Software and data integrity failures | Pass | GitHub Actions pinned by commit SHA; branch protection on `main`; the audit log refuses UPDATE and DELETE by trigger. |
| A09 | Logging and monitoring failures | Pass, one Open | JSON logs with secrets and personal fields redacted by key name at any depth; refusals and failures are logged with a request id. **Open:** no alerting or log retention yet; they arrive with hosting. |
| A10 | Server-side request forgery | Pass | The only outbound calls are SMTP (from `.env`) and Web Push, whose endpoints must be HTTPS on an allowlisted push service (`PUSH_SERVICE_HOSTS`); tested against internal addresses and look-alike hosts. |

## Content-Security-Policy

Set in `sapientia/next.config.ts` for every response:

`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`

Trade-off: scripts keep `'unsafe-inline'`. A nonce-based policy needs every page rendered per request, which Next.js says cannot be combined with `cacheComponents` and partial prerendering. The policy still blocks plugins, framing, `<base>` hijacking, form posts to other sites and any fetch to another origin, so an injected script could not send data out by `fetch`. If the staff area later holds children's data (Phase 4), revisit: render the `(calm)` routes dynamically and use a nonce there.

## Open items carried forward

1. Choose hosting (D5) and confirm TLS, a proxy that overwrites `X-Forwarded-For` (the per-address sign-in limit trusts it), log retention and uptime monitoring.
2. Update the development tools with moderate advisories.
3. Breached-password check on accept-invite (for example a k-anonymity range query) or a documented decision not to.
4. MFA for administrators before Phase 5 (gate G6).
5. Invite links are shown to the administrator, not emailed; anyone who sees the screen can use the link within 48 hours.
6. Demo student accounts are a browser-only gate with passwords in the page source. They must be replaced before any student data is real (Phase 4).

Run the same table again at the end of each sprint for the new code (plan Section 8).

## Sprint 9: lesson records and the private hours log

Checked on 12 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Lesson records: only the period's teacher, or the delivered relief teacher, may record (404 otherwise; tests for a colleague, another school and no sign-in). Hours log: routes under `/api/me/hours` take the owner from the session; repository statements all filter on school and owner; a source test fails if any other file names the tables. |
| A03 | Injection | Pass | Parameterised SQL; strict Zod objects (an extra `userId` field is refused); the e-RPH link must parse as an https URL, so `javascript:` and `data:` are refused (tested), and the database checks the prefix again. Links open with `rel="noopener noreferrer"`. |
| A04 | Insecure design | Pass | Records cannot be made for the future or more than 30 days back; every record and change is audited. Hours entries are not audited, because the audit log is not private; shares are audited with the month only. No feature measures teachers' activity (plan hard rule). |
| A09 | Logging and monitoring failures | Pass | Notes and links are not logged or audited. |

Nothing new is open from this sprint.

## Sprint 10, part 1: the monthly report

Checked on 13 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Both report routes require an administrator (404 for a teacher, 401 signed out; tested), and the service checks the role again. Every query filters on the caller's school; another school's administrator sees only their own figures (tested). The one hours query that is not owner-filtered reads `private_hours_shares` only, for one school and month; `private-hours-isolation.test.ts` now allows exactly that statement and still fails if anything reads the log itself. |
| A03 | Injection | Pass | Parameterised SQL; strict query schemas for month, format and language. Excel cells holding text are written with type String, never derived, so a reason or name beginning with `=` cannot become a formula (checked by opening a sample in Excel). The download file name is built from fixed words and the validated month. |
| A04 | Insecure design | Pass | No per-teacher lesson or task figures; a lesson with no record is "not recorded", never an absence. Wellbeing averages are withheld below five teaching staff. Notes on lesson records and hours entries are never read by the report (tested). Each export is audited (who, month, format) because the file leaves the system. |
| A06 | Vulnerable and outdated components | Pass | New: pdfkit 0.20.2 and write-excel-file 4.1.1, pinned exactly; `npm audit --omit=dev` finds nothing. pdfkit runs as a server external package. |

Nothing new is open from this part.
