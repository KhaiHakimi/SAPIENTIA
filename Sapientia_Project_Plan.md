# Meja Guru: Master Project Plan

Version 1.0, 16 October 2026. Prepared for Khairul Hakimi Bin Ma'amor.
Source documents: *Meja Guru Project Proposal Report* and *Meja Guru Development Guide* (both 15 October 2026).

Independent portfolio project. Fictional data only. Not affiliated with KPM or any school.

---

## 1. Summary

**Goal:** a workload-aware coordination platform for Malaysian schools. Its defining feature is **held delivery**: tasks created outside working hours wait until the next working morning.

**Strategy:** build in seven phases. Each phase is useful and demonstrable on its own. The **MVP is the end of Phase 1** (task core plus held delivery). If time runs out after Phase 1 or 2, you still have a complete portfolio piece.

**Timeline (part-time estimate):** MVP by about 8 January 2027. Phases 2 to 5 complete around late June 2027. Phase 6 is ongoing after that. Re-estimate after Sprint 1.

**Three things decide success:**
1. Phase 0 validation actually happens before heavy coding.
2. The time and date logic is correct and tested (it is the product).
3. Authorisation is tested from Sprint 2 onwards, so the child-data phases are built on proven foundations.

---

## 2. Decisions to confirm now

| # | Decision | Recommendation | Why |
|---|----------|----------------|-----|
| D1 | Stack | Follow the guide: Node.js LTS, Fastify, PostgreSQL 16+, pg-boss, React with Vite (PWA), Zod, Luxon, Vitest, Playwright | pg-boss needs a long-running worker. That fits Fastify plus a worker better than a Next.js app. Confirm the Node LTS version at nodejs.org on day one. |
| D2 | Package manager | pnpm workspaces (the guide says npm workspaces) | pnpm is fast, strict about dependencies and handles workspaces well. Pin exact versions, commit the lockfile, and prefer releases at least two weeks old. |
| D3 | Language | JavaScript with JSDoc, as in the guide | Matches the Google JavaScript Style Guide. Switch to TypeScript only if you are already faster in it. |
| D4 | Repository | One GitHub monorepo `meja-guru` with `apps/api`, `apps/web`, `packages/shared`, `seeds` | As in the guide, Section 6. |
| D5 | Demo hosting | Decide in Sprint 5, after checking current free-tier terms | Free tiers change often. Docker keeps the move cheap. |
| D6 | Project tracking | GitHub Projects: one board, one milestone per phase | Free, and it sits next to the code and pull requests. |
| D7 | Legal reviewer for Act 876 | Identify before Phase 4 starts (see Section 8) | Phase 5 cannot start without it. |
| D8 | Where the magic-academy theme applies | Themed: sign-in, accept-invite and the student home (timetable and homework). Calm and neutral: teacher, sender and admin screens, the guardian view, and the whole bullying module | Teachers use the product daily for admin work, so it must not feel childish or tiring. A frightened child, and a guardian reading about their child, need a serious, quiet screen. See Section 14. |
| D9 | Wording rule for the theme | Flavour only in headings and friendly messages. Field labels, buttons, errors and recovery steps use plain Bahasa Melayu or English ("Kata laluan", "Log masuk") | Users must never have to decode a metaphor to sign in or fix a mistake. |

---

## 3. Roadmap

Sprints are two weeks, Monday to Friday. Dates assume you start on Monday 19 October 2026 and work part-time.

| Sprint | Dates | Phase | Goal |
|--------|-------|-------|------|
| S0 | 19 Oct to 30 Oct 2026 | 0 Validation | Confirm the problems with teachers; write user stories; paper sketches |
| S1 | 2 Nov to 13 Nov 2026 | 1 Foundation | Project skeleton, CI green, `/health` returns 200 |
| S2 | 16 Nov to 27 Nov 2026 | 1 | Accounts, roles, invites, sessions, refusal tests |
| S3 | 30 Nov to 11 Dec 2026 | 1 | Tasks, teacher board, comments, audit log |
| S4 | 14 Dec to 25 Dec 2026 | 1 | Held delivery, calendar, worker, urgent override |
| S5 | 28 Dec 2026 to 8 Jan 2027 | 1 | Notifications, PWA, BM/EN, security review, **MVP demo** |
| S6 to S8 | 11 Jan to 19 Feb 2027 | 2 Capacity | Timetable, feasibility check, extensions, relief |
| S9 to S10 | 22 Feb to 19 Mar 2027 | 3 Evidence | Lesson records, monthly reports, wellbeing, private log, material bank |
| S11 to S14 | 22 Mar to 14 May 2027 | 4 Students and guardians | Student and guardian views, homework, marking load |
| S15 to S17 | 17 May to 25 Jun 2027 | 5 Bullying reporting | Only after legal review (Section 8) |
| S18 onwards | from 28 Jun 2027 | 6 AI and open standards | Instruction-to-task, duplicates, digest, MCP |

Notes:
- S4 and S5 fall over year-end and school holidays. Treat both as having 20% less capacity, and do not schedule anything critical for the last week of December.
- Each gate in Section 4 is a go or no-go decision. Do not start a phase until the previous gate passes.

---

## 4. Phase gates (go / no-go)

| Gate | Condition to pass |
|------|-------------------|
| G0 (after S0) | At least 5 teacher interviews done; top three problems confirmed or revised; blank report templates collected (or a note that none were obtainable) |
| G1 (after S1) | CI is green; `/health` returns 200; first migration runs from an empty database |
| G2 (after S2) | Admin invites a teacher who signs in; cross-school and wrong-role refusal tests pass |
| G3 (after S3) | A task moves from to do to done and every step is in the audit log |
| **MVP (after S5)** | Created at 10pm Friday, invisible until 7:30am Monday; demonstrated end to end on a phone; OWASP checklist done; demo video recorded |
| G4 (after S8) | Infeasible deadlines flagged with an earliest realistic date; relief suggestions work; unit tests cover the calculations |
| G5 (after S10) | Monthly report exports to PDF and Excel; private hours log provably unreadable by anyone but its owner |
| G6 (before S15) | Written legal review of the bullying workflow against Act 876 received; threat model for Phase 5 written; MFA ready for committee members |
| G7 (after S17) | Escalation tests pass using a controllable clock; report view log complete; no update or delete path exists for report content |

---

## 5. Phase 0: Validation (S0, 19 to 30 October 2026)

**Why it matters:** problems P3, P4 and P7 in the report are practitioner observations, not measured facts. The KPM report formats have not been examined.

### Week 1 (19 to 23 October)
- Write the interview guide (see below). Keep it to 30 minutes.
- Recruit 5 to 10 teachers and, if possible, one principal or senior assistant. Use your own network. Do not record names in the repository.
- Do first-week setup tasks from Section 11 in the evenings.

### Week 2 (26 to 30 October)
- Run the interviews. Take notes by problem code (P1 to P8), not by person.
- Ask for blank (unfilled) report templates the school sends to the district office.
- Synthesise: for each problem, record confirmed, partly confirmed, or not confirmed, plus how often it was mentioned.
- Write user stories for Phase 1 in the guide's format (Section 15.2: story plus Given/When/Then acceptance criteria).
- Sketch Phase 1 screens on paper: teacher board, create task, admin users, school settings.

### Interview topics
1. How do tasks reach you today (WhatsApp, Telegram, email, paper)? At what times?
2. Tell me about the last deadline that felt unrealistic. What else was on your calendar?
3. How much work do you take home in a typical week? What kind?
4. How do you currently prove work was done (reports, photos, lesson records)?
5. What happens when a colleague is absent? How is relief assigned?
6. How do you set and mark homework? Do you know what other subjects have set?
7. Would you use a tool that holds night-time tasks until morning? What would make you refuse it?

### Deliverables
- A one-page findings summary and a ranked problem list.
- Phase 1 user stories and screen sketches.
- A decision on whether the held-delivery premise holds. If teachers say they would not tolerate held delivery, stop and revisit the design before Sprint 1.

---

## 6. Phase 1: Foundation and task core (S1 to S5)

### Sprint 1 (2 to 13 November): skeleton
- [ ] Create GitHub repo; README, `.gitignore` (including `.env`), `.env.example`
- [ ] Monorepo with workspaces: `apps/api`, `apps/web`, `packages/shared`
- [ ] `docker-compose.yml` for PostgreSQL 16 (password from `.env`)
- [ ] `node-pg-migrate` set up; first migration (`schools`)
- [ ] Fastify app: `app.js` (builds the app for tests) and `server.js` (starts it)
- [ ] `GET /health` checks the database; one passing Vitest test
- [ ] React plus Vite shell; React Router; TanStack Query; `i18n` folder (`ms.json`, `en.json`) from the first screen
- [ ] Theme foundation (Section 14): design tokens as CSS variables, a `data-theme-scope` attribute (`magic` or `calm`) set per route group, and light and dark values for both scopes
- [ ] Port the approved login prototype (`prototypes/login/index.html`, style D) to React; wire it to the auth endpoints in Sprint 2
- [ ] ESLint with the Google style; Prettier only if it does not conflict
- [ ] GitHub Actions: lint, test and dependency audit on every pull request
- [ ] Branch protection on `main`

**Done when:** G1 passes.

### Sprint 2 (16 to 27 November): accounts and roles
- [ ] Migrations: `users`, `sessions` (store a hash of the session token, never the token)
- [ ] Fictional seed school (for example SMK Taman Contoh) and fictional users
- [ ] argon2id password hashing; one-time invite tokens that expire after 48 hours
- [ ] Endpoints: `POST /auth/login`, `POST /auth/logout`, `POST /auth/invites/accept`, `GET /me`, `GET` and `POST /users`
- [ ] Cookies: HttpOnly, Secure, SameSite=Lax; session expiry on inactivity; CSRF protection
- [ ] Rate limiting per account and per IP; identical error for wrong email or wrong password
- [ ] Central error handler; error classes (`NotFoundError`, `ValidationError`, `ConflictError`)
- [ ] Logger redacts cookies, authorisation headers and request bodies
- [ ] Web: sign in, accept invite, admin user list and invite form
- [ ] **Refusal tests:** a teacher cannot list users; School A cannot read School B

**Done when:** G2 passes.

### Sprint 3 (30 November to 11 December): tasks
- [ ] Migrations: `tasks`, `task_assignments`, `task_comments`, `audit_logs`
- [ ] Repository functions take `schoolId` as a required first argument
- [ ] Endpoints: `GET` and `POST /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id/assignments/me`, `POST /tasks/:id/comments`
- [ ] `Idempotency-Key` support on `POST /tasks`; cursor pagination (default 25, maximum 100)
- [ ] Audit log writes for create, assign, status change, comment (metadata contains no personal data)
- [ ] Web: teacher board (four columns), task detail with comments, sender create-task form (title, assignees, due date first; the rest optional)
- [ ] All four states on every screen: loading, empty, error, success
- [ ] **Refusal tests:** a non-assignee gets 404 on a task; a teacher cannot update another teacher's assignment

**Done when:** G3 passes.

### Sprint 4 (14 to 25 December): held delivery
- [ ] Migrations: `calendar_events`; school settings fields; partial index on pending delivery
- [ ] `lib/workingTime.js`: `isWorkingDay`, `nextWorkingStart`, with the clock passed in as a parameter (never `Date.now()` in business logic)
- [ ] Unit tests for every case in the guide: 10pm weekday; 2am; 3pm Friday in a Friday to Saturday state; eve of a public holiday; exactly at `work_start` and `work_end`; urgent override; a calendar with no working days (expect `ConfigurationError`)
- [ ] pg-boss worker: job with `startAfter = deliverAt` and `singletonKey = task id`; delivery by conditional `UPDATE ... WHERE delivered_at IS NULL RETURNING`
- [ ] Urgent override: reason mandatory (database CHECK plus validation); logged; counted for reports later
- [ ] Held tasks invisible to assignees until delivered (service-level rule, with a test)
- [ ] Sender sees the delivery time in plain language ("Akan dihantar: Isnin, 7:30 pagi")
- [ ] Endpoints: `GET` and `PATCH /school/settings`, `GET` and `POST /calendar/events`
- [ ] Web: school settings, holiday calendar, held-tasks list for senders
- [ ] Test the weekend setting for Kelantan and Terengganu (Friday to Saturday). Note that the guide's default is `{6,7}`, so confirm that `{5,6}` works end to end.

**Done when:** the Section 15.2 acceptance criteria all pass as automated tests.

### Sprint 5 (28 December to 8 January): notifications, polish, MVP
- [ ] Web Push (VAPID keys from environment variables) and email (local mail catcher in development)
- [ ] Notifications sent only by the worker after the conditional update succeeds
- [ ] External calls have timeouts and retry with exponential backoff
- [ ] PWA manifest, icons, install prompt (`vite-plugin-pwa`)
- [ ] Bahasa Melayu by default, English available; check every string is in the i18n files
- [ ] Accessibility pass to WCAG 2.2 AA: contrast, labels, keyboard use, status shown by text as well as colour
- [ ] Playwright journeys: invite and sign in; create a task at night and see it held; teacher completes it
- [ ] OWASP Top 10 checklist review (Section 8 of this plan, Security)
- [ ] Choose demo hosting (D5); deploy staging; smoke test
- [ ] Record a demo video using fictional data only

**Done when:** the MVP gate passes.

### Definition of done (applies to every story)
- Merged to `main` through a pull request (review your own diff)
- Unit and integration tests pass, including refusal tests
- Lint passes
- Works on a phone-sized screen in both languages
- No secrets or personal data in logs
- Audit log records the action where relevant
- README updated if setup changed

---

## 7. Phases 2 to 6: scope, tasks and gates

Before each phase: write user stories with acceptance criteria and a short threat model (what could go wrong with the new data, who could misuse it, how the design prevents it).

### Phase 2: Capacity (S6 to S8, 11 January to 19 February 2027)
- Tables: `task_types`, `classes`, `subjects`, `timetable_slots`, `extension_requests`, `relief_assignments`
- Store the timetable as weekly recurring slots and expand them into busy periods in code (do not store every week)
- `freeMinutes` and `checkFeasibility` as pure functions. Time outside working hours is never free. Return conflicts and an earliest realistic due date.
- `POST /tasks/feasibility` (dry run). Warn, never block. Proceeding sets the task's flagged-deadline marker.
- One-tap extension request pre-filled with conflicts; principal approves or proposes a date; exchange recorded on the task
- Workload view: committed hours per teacher for the week, shown when assigning
- Relief suggestions: free in the period, fewest relief classes this month, then fewest committed minutes this week; top three; a person decides. Relief duties follow held delivery.
- Optional completion question (under 1 hour, 1 to 3 hours, over 3 hours) to improve estimates
- **Risk to watch:** the "committed work as a single total" simplification. Keep it, and record in the README that it is deliberate.

### Phase 3: Evidence (S9 to S10, 22 February to 19 March 2027)
- Tables: `lesson_records`, `materials`, `private_hours_log`
- One-tap lesson record ("held" or "not held" plus reason); optional e-RPH link or photo. Do not rebuild e-RPH.
- Monthly principal report: classes held against scheduled, reasons, relief covered, tasks completed, flagged deadlines, overrides. Export PDF and Excel. Design the layout from the real templates gathered in Phase 0.
- Wellbeing indicators at school level only (average free working hours, flagged deadlines, extension requests). Never single out a teacher.
- Private hours log: readable only by its owner, enforced in the repository layer and by tests. A teacher may share a monthly total, never entries.
- Shared material bank with subject, form and topic tags; links to DELIMa rather than copying
- File uploads: check type and size, random names, stored outside the web root, served only after an authorisation check
- **Hard rule:** no features that monitor teachers (no "last online", no time-in-app, no location).

### Phase 4: Students and guardians (S11 to S14, 22 March to 14 May 2027)
- Threat-model this phase first. It introduces children's data.
- Tables: `students`, `class_enrolments`, `homework`, `homework_status`, `guardians`, `guardian_links`, `institutions`, `institution_staff`
- Data minimisation: student name, class and school-issued number only. No MyKad number, address or health data. Guardian relationship type stored, never the circumstances.
- Guardians are linked by the administrator only (no self-claim); links can be refused or removed with a recorded reason; teachers see the guardian's name only
- Student timetable (updates when a relief teacher covers) and homework list with weekly calendar
- Cross-subject load warning on setting homework; marking time added to the teacher's capacity calendar
- Paper submission by tapping names on the class list
- Student reminders in the afternoon only, never late at night
- Guardian view: read-focused; meeting requests reach the teacher only in working hours; printable summary for guardians without smartphones
- Teacher to student communication only on homework, logged. No student to student messaging.
- Institution accounts with individual staff logins beneath them; access ends when a staff login is removed
- **Start the legal review request in S11** so it is ready by S15.
- **Tests:** a student cannot see another student's records; late-submission lists are never visible to other students; guardian sees only linked children.

### Phase 5: Bullying reporting (S15 to S17, 17 May to 25 June 2027; gated on legal review)
- Do not start until G6 passes.
- Tables: `bullying_reports`, `report_escalations`, `report_view_log`. Append-only: no UPDATE or DELETE of report content (enforce with database permissions or triggers as well as code).
- Child-friendly form: what, when, where, who (optional), still happening. Screenshot attachments. Witness reports with optional anonymity.
- Student chooses a trusted teacher or the counsellor; hidden from all others
- Status shown to the student: received, read, being handled
- Escalation: (1) teacher shares with the committee, recording informed consent; (2) automatic escalation if unacknowledged by the end of the next school day (pg-boss job; idempotent); (3) immediate escalation for serious harm categories
- Emergency contacts shown immediately (999, Talian Kasih 15999). **Verify every contact and any contacts specified by the Act or KPM before release.**
- Every view written to `report_view_log`
- MFA for administrators and committee members before this phase goes live
- Named students' details never leave this module
- Guardians never see reports
- Test escalation with an injected clock (leave, weekend, public holiday, end of term)

### Phase 6: AI and open standards (from 28 June 2027, ongoing)
- Single `lib/llmClient.js` with one `complete()` function; Ollama locally; provider chosen by configuration; feature can be switched off without breaking anything
- Instruction-to-task: structured JSON output validated with the same Zod schema as normal task creation. AI output is untrusted. A person always confirms.
- Duplicate detection; Monday-morning weekly digest
- MCP server: read-only tools (for example `list_my_tasks`) acting strictly as the signed-in user with the same authorisation checks
- WebMCP: experiment behind a feature flag
- Send task text only. Never names, and never anything from student or bullying records.

---

## 8. Cross-cutting workstreams

### Security (every sprint)
- At sprint end, run the OWASP Top 10 checklist from the guide (Section 11) and tick off each risk area for the new code
- Deny by default. Every service checks role and the relationship to the record. Unauthorised access returns 404, not 403.
- Parameterised queries only; Zod on every body and query string; unknown fields rejected
- Secrets only in environment variables. If a secret is ever committed, rotate it. Deleting the commit is not enough.
- Dependency hygiene: pinned versions, committed lockfile, audit in CI, automated alerts
- Optional hardening later: PostgreSQL row-level security for the school boundary, as a second layer

### Testing
- Target mix: about 70% unit, 25% integration (Fastify `inject` plus a test database), 5% end-to-end
- Every endpoint gets at least one "wrong person is refused" test
- Inject the clock everywhere. A test that uses the real clock is a bug.
- Seeds use fictional names only. Check before every commit.

### Engineering workflow
- Short-lived branches (`feat/...`, `fix/...`), Conventional Commits, one pull request per user story, CI green before merge
- Migrations: never edit an applied migration; add a new one
- Keep the plan honest: update this document at the end of each sprint (actual against planned)

### Deployment and operations (from Sprint 5)
- Environments: local (Docker), staging (fictional data only). No production environment for real schools without KPM approvals, legal review and data protection arrangements.
- Release steps per the guide, Section 16.3, ending with a smoke test: sign in, create a task, check held delivery
- Structured JSON logs with personal data redacted, limited retention
- Daily database backups and **one restore test**
- Free external uptime monitor on `/health`

### Legal and compliance
- Phase 4 and 5 only: legal review of the bullying workflow against Act 876 and the Ministry's standards, parental consent, employee monitoring, and PDPA obligations (including 72-hour breach notification and Data Protection Officer thresholds)
- Verify every statistic, regulation and reference in the report against original sources before any external use. The report itself notes that several sources are news reports or secondary summaries.
- This plan does not give legal advice. For a real deployment, use your institution's Legal contact.

---

## 9. Risk register

| Risk | Likelihood | Impact | Mitigation | Early warning |
|------|-----------|--------|------------|---------------|
| Scope creep across seven phases | High | High | Finish one phase before starting the next; MVP is Phase 1 only | Starting a story from a later phase |
| Time-zone and calendar bugs | High | High | Store UTC; Luxon with the school's zone; injected clock; exhaustive Section 6 Sprint 4 tests | Flaky tests that depend on time of day |
| Part-time pace slower than planned | Medium | Medium | Re-estimate after S1; cut scope inside a phase, not the quality gates | Two sprints in a row ending below 70% of planned stories |
| Authorisation bug leaks data | Medium | High | Deny by default; refusal tests per endpoint; school filter in every repository function | A query written without `schoolId` |
| Teachers say the tool is not wanted | Medium | High | Phase 0 gate; create-task in about ten seconds | Interview feedback that WhatsApp is "faster" |
| Perceived as surveillance | Medium | High | No monitoring features; teachers see everything about themselves; private hours log | Any story that measures activity rather than work |
| Duplicate notifications after a crash | Medium | Medium | Idempotent jobs; `singletonKey`; conditional updates; crash-recovery test | Two notifications for one task |
| Inaccurate effort estimates | High at first | Low | Optional completion feedback; warn rather than block | Many flagged deadlines the sender overrides |
| Phase 5 starts before legal review | Low | High | Gate G6; request review in S11 | No reviewer identified by S12 |
| Real data enters seeds, screenshots or demos | Low | High | Fictional seeds; pre-commit check; reviewing the diff before every merge | Names that look real |
| Free-tier hosting limits or changes | Medium | Low | Docker packaging; worker can run inside the API for a demo | Provider terms change |
| Burnout on a solo project | Medium | Medium | Two-week sprints with a demo; small visible wins; stop at any phase boundary with a complete product | Skipping sprint reviews |

---

## 10. Success measures

Track these once there is something to measure (from Phase 1 onwards, using seeded demo data and later pilot feedback):

- Share of out-of-hours tasks held rather than delivered (high; overrides rare)
- Flagged deadlines per month (decreasing)
- Extension requests approved, with high rejection rates reviewed
- Teachers' self-reported WhatsApp use for admin tasks (survey before and after)
- Days with three or more homework deadlines for one class (decreasing)
- Time for a principal to compile the monthly report (decreasing)
- Bullying reports acknowledged within one school day (close to 100%)

**Portfolio success criteria:** MVP demonstrated on a phone; test suite includes time-logic and refusal tests; README lets a stranger run the project in under 15 minutes; a short demo video and a findings summary from Phase 0.

---

## 11. First week: 19 to 23 October 2026

| Day | Tasks |
|-----|-------|
| Mon 19 Oct | Read Sections 1 to 6 of the guide again. Install Node LTS, Git, Docker Desktop, VS Code with ESLint, a PostgreSQL client. Create the GitHub repository (README, `.gitignore` with `.env`, `.env.example`). |
| Tue 20 Oct | Docker Compose PostgreSQL running; connect with a client. Create monorepo folders and workspaces. |
| Wed 21 Oct | Fastify `GET /health` and one passing Vitest test. |
| Thu 22 Oct | ESLint (Google style); GitHub Actions running lint and tests. Protect `main`. |
| Fri 23 Oct | Write the interview guide; message teachers to book interviews for 26 to 30 October. Create the GitHub Project board with milestones for each phase. |

The setup work here is a head start on Sprint 1, so you can finish it early and spend Sprint 1 on the first migration and the React shell.

---

## 12. Gaps and inconsistencies found in the two documents

Resolve these before they cause rework:

1. **Phase 1 duration:** the report says 6 to 10 weeks; the guide says 8 to 10 weeks and schedules 10 weeks (S1 to S5, with S0 before it). This plan uses the guide's version.
2. **Weekend setting:** the schema default is `{6,7}` (Saturday and Sunday). Kelantan and Terengganu need `{5,6}`. Make sure the settings screen and the tests cover this, and that `state_code` suggests a default rather than hard-coding one.
3. **Sessions and comments tables:** the guide leaves the design to you. Design them in Sprint 2 and Sprint 3 and review them against the security checklist.
4. **`audit_logs` has no foreign keys** by design (so logs survive deletions), but the guide also says records are never deleted. Decide whether to keep it as is and document the reason.
5. **Hours log and reports:** a monthly report must never expose the private hours log. Write that as an explicit test in Phase 3.
6. **Report formats:** KPM and district formats are not assumed. If you cannot obtain blank templates in Phase 0, design a generic format and say so in the README.
7. **External facts:** several statistics and legal claims in the report come from news and secondary sources (the report says so itself). Verify them before any external use.

---

## 14. UI theme plan (decisions D8 and D9)

**Direction:** a magic-academy mood (night sky, candlelight, parchment, wax seal), inspired by the genre only. Do not use names, house names, crests, logos or artwork from any franchise, especially if the project is shown publicly. The prototype is `prototypes/login/index.html`, style D (Spellbound).

### Where each scope applies

| Area | Scope | Notes |
|------|-------|-------|
| Sign-in, accept invite, set password | Magic | First impression; the same screen for every role |
| Student home (timetable, homework) | Magic, toned down | Parchment cards and gold accents; no animation behind forms |
| Teacher board, create task, task detail | Calm | Neutral surfaces; a single warm accent (burgundy or gold) so it still feels like the same product |
| Sender and administrator screens, settings, calendar, reports | Calm | Dense tables and forms need plain, high-contrast layouts |
| Guardian view | Calm | Read-focused and respectful; no decoration |
| Bullying report form, status and committee screens | Calm, quiet | No animation, no playful copy. Emergency contacts shown plainly. |

If you prefer a different split, only this table and the `data-theme-scope` assignment per route group change.

### Rules
1. **One token set, two scopes.** Colours, fonts, radius and shadows are CSS variables. `magic` and `calm` redefine them. Components never hard-code colours.
2. **Plain functional copy** (D9). Themed text is allowed in headings, empty states and success messages. Labels, buttons, validation errors and recovery steps stay plain. All text lives in the i18n files in both languages.
3. **Same error for wrong email and wrong password**, in every scope.
4. **Accessibility is not themeable.** WCAG 2.2 AA contrast in light and dark, visible focus rings, status shown by text as well as colour, and `prefers-reduced-motion` switches off every animation (stars, candles, glows).
5. **Performance on low-cost phones.** Keep decoration in CSS, with no large images. Avoid animation on screens with long forms or tables. Fonts: Cinzel for headings and EB Garamond for body text in the magic scope. Self-host or subset them later, and keep a system serif fallback.
6. **Dark mode** is supported in both scopes from the start (aged parchment and a gold accent in the magic scope).
7. **Check on a phone** before approving any themed screen. Decoration must not push the form below the fold.

### Open style questions for you
- Primary accent for the calm scope: burgundy (links the two scopes) or a neutral blue-grey?
- Emerald and gold instead of burgundy and gold for the magic scope?
- Extra touches for the login only: owl, castle skyline, floating particles on the button?

---

## 15. How we will know the plan is working

- End of every sprint: demo (even to yourself), tick off the sprint's checklist, record actual against planned, adjust the next sprint.
- End of every phase: pass the gate, tag a release (`v0.1.0` for the MVP), update the README and this plan.
- At any boundary where time runs out, stop and polish. A finished Phase 1 or Phase 2 is a successful project.
