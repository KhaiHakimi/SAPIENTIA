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
| A07 | Identification and authentication failures | Pass, two Open | One answer for wrong email, wrong password and inactive account; 5 failures per account and 30 per address in 15 minutes; passwords 10 to 128 characters; sessions end after 60 minutes idle or 12 hours. **Open:** no check against breached-password lists. Two-step sign-in was added on 18 November 2026 (gate G6). |
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
4. ~~MFA for administrators before Phase 5 (gate G6).~~ Built on 18 November 2026 (see "Two-step sign-in" below). Still to decide with hosting (D5): where MFA_ENCRYPTION_KEY is kept, and switching the requirement on for real schools.
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

## Sprint 10, part 2: uploads, lesson photos and the material bank

Checked on 13 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | One route serves files (`GET /api/files/:id`), after a check by purpose: a material for staff of its school, a lesson photo for its recorder and the period's teacher only. Colleague, administrator (for photos), other school and no sign-in are tested. Adding or removing a photo uses the same recorder check as recording; removing a material is for its owner or an administrator (404 otherwise). |
| A03 | Injection | Pass | Parameterised SQL; the material search escapes `%`, `_` and `\` (tested); multipart text fields go through the same strict schemas as JSON (an unknown field is refused). Links must be https. The download name is cleaned of folders, control and bidirectional characters and quotes, and encoded in Content-Disposition. |
| A04 | Insecure design | Pass | Type decided from the bytes, not the name or Content-Type (an executable or HTML named `.pdf`, and SVG, are refused); size checked from Content-Length before the body is read, and again from the file; 2 GB per school. Picture metadata (GPS) stripped on the server as well as in the page. Bytes removed when the database step fails. |
| A05 | Security misconfiguration | Pass | Uploads stored outside the web root (`UPLOAD_DIR` refused if inside `public/`, tested), under random names, mode 0600. Files are sent with `nosniff`, `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox`, `Cross-Origin-Resource-Policy: same-origin`, and `attachment` for anything but a picture. |
| A08 | Software and data integrity failures | Pass | A SHA-256 of every stored file is kept with its record. |
| A09 | Logging and monitoring failures | Pass | Adding and removing photos and materials is audited (record or material id, date, kind); never file names, titles or content. |

Open items carried forward:

7. No virus scan of uploaded documents. They are only downloaded, never opened inside the site, but a teacher could pass on an infected file. Add a scanner (for example ClamAV) when hosting (D5) is chosen.
8. Lesson photos may show pupils despite the page's advice. Review in the Phase 4 threat model, which brings in children's data.

## Sprint 11: pupil accounts

Checked on 16 November 2026 for the new code only. This is the first code holding children's data (fictional only; see `docs/phase-4-students.md`).

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Every pupil-management endpoint requires an administrator (404 for teachers and senders, 401 signed out or with a pupil session; tested). Every query filters on the caller's school; another school's administrator sees an empty list, gets 404 on a pupil and cannot use this school's classes (tested). Pupils and staff have separate tables, cookies and session checks, so a pupil session never passes a staff check and a staff session never passes a pupil check (tested both ways). Pupil endpoints take the pupil from the session only. |
| A02 | Cryptographic failures | Pass | Slip passwords are random (8 characters from 31, `crypto.randomInt`), returned once and stored only as argon2id hashes (tested: the table never holds the plain password). Session tokens are 256 random bits, stored as SHA-256. |
| A03 | Injection | Pass | Parameterised SQL; strict schemas for every body and query (unknown fields refused). School numbers are limited to letters, digits, `/` and `-`; usernames are generated by the app and checked against a database rule. |
| A04 | Insecure design | Pass | Data minimisation: name, class, optional school number; MyKad-like numbers refused (tested); no sign-in or activity times stored; audit entries hold ids and states only (tested). A pupil on the slip's password can do nothing but replace it (403 `password_change_required`, tested); the slip expires after 14 days (tested). Signing in as one kind of user ends the other kind's session in that browser, for shared classroom computers (tested). Removing a pupil deletes their data rather than keeping it. |
| A05 | Security misconfiguration | Pass | The pupil cookie has the same flags as the staff one (HttpOnly, SameSite=Lax, Secure over HTTPS) through one shared builder. Slips are printed from the page's memory and never stored. |
| A07 | Identification and authentication failures | Pass | One error for an unknown username, a wrong password, a disabled account and an expired slip, after the same work (dummy hash). Five failures per pupil or 30 per address in 15 minutes are throttled (tested for sign-in); a wrong current password when changing it counts the same way. Pupil sessions end after 30 minutes idle and 8 hours at most (tested); a new slip, disabling, a password change or removal ends all of the pupil's sessions (tested). New passwords need 8 characters and must differ from the slip. |
| A09 | Logging and monitoring failures | Pass | Adding, changing, new slips and removal are audited (actor, pupil id, class id, which fields changed); pupil sign-ins and password changes are logged with ids only, never names, usernames or passwords. |

Open items carried forward:

9. Children's data: no legal review yet (decision D7 open, PDPA consent and retention unreviewed). Fictional data only until it is done.
10. The 8-character minimum for pupils is below the staff minimum of 10, a judgement for young pupils to revisit with schools.

## Sprint 12, part 1: homework, hand-ins and the pupil's week

Checked on 16 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Homework can be set only for a class and subject on the caller's own timetable (refused otherwise, administrators included; tested). After that only the setter reads, marks, removes or ticks hand-ins (404 for another teacher and for administrators; tested). A hand-in can be ticked only for a pupil now in the homework's class (404 otherwise; tested). Pupil endpoints take the pupil and class from the session, never from the request; a pupil sees their own hand-in only and nothing of another class (tested); staff sessions get 401 on pupil endpoints and pupil sessions 401 on staff ones (tested). |
| A03 | Injection | Pass | Parameterised SQL; strict schemas with lengths and ranges for every body and query; path ids must be UUIDs. Homework details are shown as text, never as HTML. |
| A04 | Insecure design | Pass | The class's week shows dates and subjects only, never who set the homework or anything about pupils. No list of who has not handed in is ever shown to pupils. A relief lesson appears on the pupil's timetable only once the relief has been delivered to the relief teacher, so a class does not learn of a teacher's absence earlier than staff do (tested). The load warning never blocks. |
| A09 | Logging and monitoring failures | Pass | Setting, the load flag, marking, removal and each hand-in tick are audited with ids only (the pupil's id for a tick, never their name; tested). |

## Sprint 13, part 1: guardians

Checked on 18 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Every guardian-management endpoint requires an administrator (404 for teachers and senders, 401 for pupil and guardian sessions; tested). Another school's administrator sees an empty list, gets 404 on a guardian and cannot link this school's pupils (tested). Links are made by administrators only; no endpoint lets a guardian or pupil claim one. Guardian endpoints take the guardian from the session and reach a child only through one of their own active links, named by the link's id; another guardian's link, a refused or a removed one is 404, and the pupil's id is never sent to a guardian (tested). Guardians have their own table, cookie and session check (staff and pupil sessions get 401 on guardian endpoints; tested). |
| A03 | Injection | Pass | Parameterised SQL; strict schemas; relationship types and reasons are enums in the schema and the database; path ids must be UUIDs. |
| A04 | Insecure design | Pass | Data minimisation: a guardian is a name and a sign-in; each link stores a relationship type, and an ended link a reason code from a fixed list, never free text, so no circumstances are written down (database constraints keep refusal codes for guardians and removal codes for administrators). Signing in as staff, pupil or guardian ends the other kinds' sessions in that browser (tested both ways). |
| A07 | Identification and authentication failures | Pass | The pupil sign-in rules apply: one error for every failure after the same work, throttling per account (own `guardian:` counters) and per address, 14-day slips, sessions ended by a new slip, disabling, a password change or removal (tested). Guardians need 10 characters, as staff do. Sessions: 60 minutes idle, 12 hours at most. |
| A09 | Logging and monitoring failures | Pass | Adding, changing, new slips, removal, links added and removed, and refusals are audited with ids, relationship types and reason codes only, never names (tested). A refusal records the guardian as the actor with `actorKind: guardian`. |

Open item:

11. A guardian's view loads one homework query per linked child (at most 10). Fine at this size; revisit if the link limit grows.

## Sprint 13, part 2: printed summary and meeting requests

Checked on 18 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | The summary is for administrators of the guardian's school (404 for teachers and other schools, 401 for guardian sessions; tested). A guardian reaches meeting requests only through their own active link (another guardian's link or request is 404; tested) and may ask only teachers on the child's class timetable (400; tested). Only the teacher asked lists or answers a request, and only once it has reached them (404 for other teachers, administrators, other schools and a request still held; tested). Staff and guardian sessions do not open each other's routes (401; tested). |
| A03 | Injection | Pass | Parameterised SQL; strict schemas (an extra field such as a note is refused; tested); topics, times of day and decline reasons are enums in the schema and the database; path ids must be UUIDs. |
| A04 | Insecure design | Pass | No free text anywhere in a request. Requests reach teachers in working hours only (tested at 21:30 and 22:00); at most 3 waiting per guardian, counted under a row lock; one per teacher per child (unique index). A meeting time must be inside working hours on a working day, within 60 days (unit and integration tests). The notice to the teacher names no one, and a request withdrawn or cancelled before it is due sends nothing (tested). The summary leaves out hand-ins. |
| A09 | Logging and monitoring failures | Pass | Requests, withdrawals, answers and each summary view are audited with ids and codes only, never names (tested). Ending a link records how many waiting requests it cancelled. |

Open item:

12. The summary loads two queries per linked child (homework and the week; at most 10 children). Fine at this size, as item 11.

## Sprint 14: staff logins, reminders and homework notes

Checked on 18 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Disabling and removing logins is for administrators of the same school (404 for teachers and other schools; tested), never one's own login (409; tested). Sessions are deleted in the same transaction and every staff check needs an active login, so access ends at once (tested). Notes: only the setter writes, lists or hides them (404 for other teachers and administrators; tested), only to a pupil now in the class (tested); a pupil and their guardians see only that pupil's visible notes (tested); pupil sessions cannot write (401; tested). |
| A03 | Injection | Pass | Parameterised SQL; strict schemas; path ids must be UUIDs. Notes are plain text, rendered by React as text (no HTML). |
| A04 | Insecure design | Pass | Removal keeps no way back in: no password, a placeholder email, invites revoked, devices deleted; the private hours log is deleted through its own repository (the isolation test still holds). Notes are bounded (300 characters, 10 per pupil per homework) and refuse MyKad-like numbers. The reminder is computed on the board from the school's clock; nothing is pushed or stored. |
| A09 | Logging and monitoring failures | Pass | Disable, enable, removal, notes added and hidden are audited with ids only, never names or the note's text (tested). |

Open item:

13. A removed or disabled teacher's timetable slots stay until an administrator edits the timetable.

## Two-step sign-in (gate G6)

Checked on 18 November 2026 for the new code only.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A02 | Cryptographic failures | Pass | TOTP per RFC 6238 (HMAC-SHA1, 6 digits, 30 seconds), checked against the RFC test values. The shared secret is stored with AES-256-GCM under MFA_ENCRYPTION_KEY from the environment (never the repository or database; a changed record fails the tag check; tested). Recovery codes are 10 random characters (about 49 bits) stored as SHA-256 only. Without a key, two-step sign-in is off rather than stored in clear. |
| A04 | Insecure design | Pass | A correct password for an account with an authenticator gives a 5-minute challenge cookie, never a session; the session starts only after a current code or an unused recovery code (tested). A code's time step cannot be used twice (replay refused; tested). Turning it on, off, or making new recovery codes asks for the password again. A school can require it for administrators; an administrator must have it before switching the rule on, and cannot switch their own off while it is required (tested). |
| A07 | Identification and authentication failures | Pass | Wrong codes count 5 per challenge (then sign in again) and against the same account and address throttle as passwords (`mfa:` counters). An administrator can reset a colleague's authenticator for a lost phone, which signs them out everywhere (tested); not their own. |
| A09 | Logging and monitoring failures | Pass | Turning it on or off, new recovery codes, a recovery code used to sign in, a reset by an administrator, and the school rule changing are audited with ids only (tested). |

Open item:

14. Setup shows a key to type into the app and an otpauth:// link; there is no QR code, to avoid a new dependency. Add one if schools find typing the key hard (Phase 0).

## Phase 6: AI drafts, duplicate warnings, weekly digest, MCP server

Checked on 19 November 2026 for the new code only. Stories and threat model in `phase-6-ai.md`.

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken access control | Pass | Drafts and duplicate checks are for senders and administrators (404 for teachers; tested). The duplicate check compares only tasks the caller sent or already given to someone they chose, links only the caller's own (tested, including another school and a teacher). MCP tools call the page services with the token's owner as the actor; another person's task answers "not found" (tested). Tokens are listed and revoked by their owner only (404 for anyone else; tested). |
| A02 | Cryptographic failures | Pass | Access tokens are 256 random bits with a `sap_` prefix; only SHA-256 is stored (tested). |
| A03 | Injection | Pass | Parameterised SQL throughout. The model's answer is parsed as JSON and checked field by field with the task schemas; it is never executed or rendered as HTML. Digest emails escape every typed value and keep the subject on one line (tested). |
| A04 | Insecure design | Pass | AI only fills a form; a person sends. The model gets no tools. Names the school holds and common identifiers are removed first (tested). Every feature is off by default and the app works without it. |
| A05 | Security misconfiguration | Pass | `AI_PROVIDER`, `MCP_SERVER` and `NEXT_PUBLIC_WEBMCP` default to off; an unknown provider, a missing model or a non-http(s) model address leaves AI off (tested). |
| A06 | Vulnerable components | Pass | `@modelcontextprotocol/sdk` 1.32.2 pinned, released 23 October 2026; `npm audit --omit=dev` found 0 vulnerabilities on 19 November 2026. |
| A07 | Identification and authentication failures | Pass | `/api/mcp` accepts only a bearer token and ignores cookies; unknown, revoked or expired tokens and disabled accounts get 401 (tested). Making a token asks for the password again, counted against the sign-in throttle. Tokens are revoked with every session (invite password, disable, remove, MFA reset). |
| A08 | Software and data integrity failures | Pass | The digest records each person's week once (primary key), so a repeated sweep cannot send twice (tested). |
| A09 | Logging and monitoring failures | Pass | Token creation and revocation are audited with ids. `ai_requests` records who, when and outcome of each model request; instructions, answers and MCP bodies are never logged. |
| A10 | Server-side request forgery | Pass | The model address comes from the operator's environment only, never from a request. The MCP server makes no outgoing calls. |

Open items:

15. A browser `Origin` other than the app's is refused at `/api/mcp`, but clients without one (desktop MCP clients) are accepted by design: the bearer token is the control. There is no per-token rate limit yet beyond what the read-only services cost.
16. The prompt has not been tried with a real Ollama model (none on the development PC). Try candidate models with fictional instructions before switching AI on.
