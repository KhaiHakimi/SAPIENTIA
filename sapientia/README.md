# Sapientia web app

Next.js 16 (App Router), React 19, TypeScript, CSS Modules, PostgreSQL 16, pg-boss. Staff accounts, tasks, held delivery and notifications run against the database (plan Sprints 2 to 5). The student board from `../prototypes/student-dashboard` still uses fictional sample data in the browser until student accounts exist (Phase 4). All people in the seed data are fictional.

## Run

Needs Node 26 (`.nvmrc`) and Docker Desktop.

```bash
npm install
cp .env.example .env     # set a long random password (both places), a SEED_PASSWORD, and the test database URL
npm run db:up            # PostgreSQL 16 on 127.0.0.1:55432 (creates sapientia and sapientia_test) and Mailpit (inbox http://localhost:8025)
npm run db:migrate       # SQL migrations in migrations/, then pg-boss's schema and queues
npm run db:seed          # two fictional schools and their staff, all with SEED_PASSWORD
npm run dev              # http://localhost:3000 (redirects to /login)
npm run worker           # in a second terminal: delivers held tasks and sends notifications (see below)
```

Seeded staff for SMK Taman Contoh (password: your `SEED_PASSWORD`): `pentadbir@guru.sapientia.test` (administrator), `pk.pentadbiran@guru.sapientia.test` (task sender), and `cikgu.aminah@`, `cikgu.ravi@`, `cikgu.meiling@guru.sapientia.test` (teachers). The demo students on the login page sign in without the database.

| Command | Does |
|---|---|
| `npm test` | Unit tests (Vitest), no database needed |
| `npm run db:migrate:test` | Migrates the test database (`TEST_DATABASE_URL`) |
| `npm run test:integration` | `*.integration.test.ts` against the test database: it is emptied between tests, so never point it at real data |
| `npm run lint` | ESLint: Next.js rules plus the Google style rules |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run worker` | Background worker: held-task delivery jobs, a sweep every minute, and email and push notifications |
| `node scripts/make-app-icons.mjs` | Remakes the app icons in `public/icons/` from the logo |
| `npm run db:migrate:down` | Rolls back the last migration |
| `npm run db:migrate:create -- <name>` | New SQL migration in `migrations/`. Never edit one that has been released; add another |
| `npm run db:down` | Stops the database (data is kept in the `db-data` volume) |

CI (`../.github/workflows/ci.yml`) runs lint, type check, unit tests, migrations (up, down, up), integration tests and the build on every pull request, plus `npm audit --audit-level=high`.

## How it fits together

- **API**: route handlers under `app/api/`, each wrapped in `withApi` (`shared/server/api-handler.ts`): it refuses cross-site writes (Origin check), turns the error classes in `shared/server/app-errors.ts` into JSON, and hides anything unexpected behind a 500 with a request id. Bodies are validated with Zod schemas that refuse unknown fields.
- **Sign-in**: an HttpOnly, SameSite=Lax session cookie; the database keeps only a SHA-256 of the token. Sessions end after 60 minutes idle or 12 hours in total. Wrong email, wrong password and inactive accounts all get the same answer. Failed attempts are counted per account and per address.
- **Refusals**: `requireUser(request, clock, roles)` answers 401 when signed out and 404 for the wrong role. Repositories take `schoolId` first, so no query can reach another school. Someone who may not see a task gets 404, exactly as if it did not exist.
- **Held delivery**: creating a task works out its delivery time from the school's working hours, weekend and calendar (`features/delivery/services/working-time.service.ts`, pure and fully unit-tested). Inside working hours it is delivered at once. Outside them it is held, and a pg-boss job for its delivery time is saved in the same transaction. The worker delivers it with a conditional update, so a repeated job is harmless, and a one-minute sweep catches any task whose job went missing. An urgent override delivers at once and needs a reason.
- **Notifications**: whenever a task is delivered (at once, by its job, or by the sweep) a `notify-task-delivered` job is queued in the same transaction, so a held task is never announced early and only the worker sends. It emails each active assignee who has email on, and sends Web Push to each device they turned it on for. Every send has a timeout and up to three tries with backoff; a temporary failure makes pg-boss retry the job later (over about an hour), and `notification_sends` records what went out so a retry sends only what is missing. A device the push service reports gone is removed. Push addresses must be on a known push service (`PUSH_SERVICE_HOSTS`), so the worker cannot be pointed at other servers. Email is bilingual (BM first); push is in BM. A channel without its `.env` settings is off. Signing out turns push off for that device.
- **App install**: `app/manifest.ts` and `public/sw.js` (shows push notices, caches nothing). The Notifications page has the install button where the browser offers one, and the Add to Home Screen steps on iPhone and iPad.
- **Audit log**: `audit_logs` records ids and states only, never names or text. A database trigger blocks UPDATE and DELETE.
- **Time**: services take a `Clock`; route handlers pass `appClock()`, which integration tests can set to "10 pm on a Friday" with `setTestClock`. Times are stored in UTC and read in the school's time zone (Luxon).
- **Theme scopes** (plan D8): `(magic)` routes (sign-in, accept invite, student board) and `(calm)` routes (all staff screens, `shared/calm/Calm.module.css`).

## Where things are

Code is grouped **by feature**. Every feature folder uses the same sub-folders, so you always know where to look:

| Sub-folder | Holds |
|---|---|
| `components/` | React components (`.tsx`) |
| `hooks/` | React hooks (`use*.ts`) |
| `services/` | Rules and browser calls, no React; unit tests sit next to them as `*.test.ts` |
| `server/` | Server-only code: repositories (SQL) and services that use the database; integration tests as `*.integration.test.ts` |
| `schemas/` | Zod request schemas, shared by the API and the forms |
| `interfaces/` | TypeScript types (`*.interface.ts`) |
| `constants/` | Fixed values (`*.constants.ts`) |
| `data/` | Sample data |
| `i18n/` | Bahasa Melayu and English messages, with a `*-messages.interface.ts` |
| `styles/` | CSS Modules (`*.module.css`) |

```
app/
  layout.tsx, globals.css        root layout, design tokens (magic and calm scopes), colour skins, card frames
  (magic)/                       login, accept-invite, student (magic-academy theme)
  (calm)/staff/                  staff area: board, sent, held, tasks/new, tasks/[id], users, settings, calendar, notifications
  api/                           JSON API (auth, me, me/notifications, me/push-subscriptions, users, staff, tasks, school/settings, calendar/events, delivery/preview)
  health/route.ts                GET /health: 200 when the database answers, 503 when not
features/
  auth/                          sign-in page, sessions, passwords, invites, throttling
  users/                         administrators' user list and invites; the staff directory
  staff/                         the staff shell (menu by role, language, theme, sign-out)
  tasks/                         tasks, board, comments, idempotent create, sent and held lists
  delivery/                      working-time rules, school settings and calendar, delivery queue and service
  notifications/                 email and push senders, the notify job, each person's settings, the Notifications page
  audit/                         the append-only audit log
  health/                        the /health check
  student-dashboard/  battle/  characters/  shop/  pahlawan/   the student board (sample data)
shared/
  api/                           browser API client, error texts, TanStack Query provider
  calm/                          calm-scope building blocks (cards, forms, tables, badges)
  server/                        database pool, transactions, API wrapper, errors, logger, clock, pagination, idempotency
  ...                            storage, i18n, theme, pixel sprites, buttons, cards, dialogs, toast
migrations/                      SQL migrations (node-pg-migrate)
seeds/dev-seed.ts                fictional schools and staff
worker/index.ts                  the background worker
scripts/install-queues.ts        pg-boss schema and queues (run by db:migrate)
docker/initdb/                   creates the test database on a fresh volume
public/                          character art, scenes, logo
```

### Quiz chapters and levels

Each monster is one difficulty level: Orang Bunian (Easy), Naga Laut (Medium), Harimau Jin (Hard), Hantu Lelaki (Very Hard). Each subject has chapters, and every chapter has a question set for every level. Within a chapter, a level opens once the one before it has been beaten. Records are kept per chapter and level in localStorage `sapientia.battles` under keys like `math-1:2`.

To add a chapter, add it with its questions to the subject's file in `features/battle/data/quiz/` (for example `math.quiz.ts`), with at least one question for each of the four levels. `quiz-stage.service.test.ts` checks that every chapter has every level. The bank is a Year 4 sample: the chapter titles have not been checked against the syllabus and no teacher has reviewed the questions.

### Pahlawan outfit colours

In Pahlawan Saya the student picks a colour for the baju, trousers and tengkolok, and a separate colour for the sampin (black, red, blue, white, green, purple). The pahlawan's pictures are recoloured in the browser (`features/pahlawan/services/outfit-recolour.service.ts`): the clothes are the drawing's cool blue-greys and the sampin its crimsons, so skin, hair, gold trim, the keris and outlines stay as drawn on every frame. Choices are kept in localStorage `sapientia.pahlawan.outfit`. The swatch pictures come from `../Character/Malay Warrior Pixel Art Sprite Sheet.png` via `node scripts/cut-outfit-icons.mjs`. If the pendekar art is replaced, check the colour ranges in `partOf` against the new drawing.

### Adding a monster

1. Put its atlas in `../Character` (magenta background; rows idle, attack, hit, die, as the existing ones), add it to `CHARACTERS` in `scripts/cut-sprite-sheets.mjs` with the rows to mirror so it faces left, and run `node scripts/cut-sprite-sheets.mjs --preview`. It writes `public/characters/<name>/sprite-sheet.png` and `portrait.png`, previews in `../Character/preview`, and prints the cell size, foot line and frame ranges.
2. Create `features/characters/<name>/<name>.character.ts` (copy another monster, then paste in the printed sheet values) and, if it moves differently, `<name>.module.css`.
3. List it in `features/characters/index.ts`. The list is one monster per level, so a new monster replaces one, or a fifth level needs `MonsterLevel`, `QUIZ_LEVELS` and the questions extended too.

## Notes and known limits

- Invite links are still shown to the administrator to pass on; they are not emailed yet.
- Push needs a VAPID key pair in `.env` (`npx web-push generate-vapid-keys`) and, outside localhost, HTTPS. On iPhone and iPad it works only after Sapientia is added to the Home Screen. If a browser renews its push subscription by itself, push stops on that device until the person turns it on again.
- Accounts have no saved language yet, so email carries both languages and push uses Bahasa Melayu.
- Holidays are entered by the administrator on the Calendar page; none are built in. Tasks already held keep the delivery time worked out when they were sent.
- The default working day is 07:30 to 17:00 until a school saves its own hours.
- Per-address sign-in limits trust `X-Forwarded-For`, which is only safe behind a proxy that overwrites it.
- Student board: progress resets on reload; the shop, language, theme, photo, pahlawan name and battle records are kept in this browser's localStorage. Its demo clock is fixed at Thursday 10:15. Every animation is switched off when the device asks for reduced motion.
