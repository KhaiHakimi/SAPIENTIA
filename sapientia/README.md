# Sapientia web app

Next.js 16 (App Router), React 19, TypeScript, CSS Modules, PostgreSQL 16. The student board from `../prototypes/student-dashboard` is ported here. All data is fictional sample data until the API exists.

## Run

Needs Node 26 (`.nvmrc`) and Docker Desktop.

```bash
npm install
cp .env.example .env     # then set a long random password in both places it appears
npm run db:up            # PostgreSQL 16 in Docker, on 127.0.0.1:55432
npm run db:migrate       # applies migrations/ in order
npm run dev              # http://localhost:3000 (redirects to /login); http://localhost:3000/health checks the database
```

| Command | Does |
|---|---|
| `npm test` | Unit tests (Vitest), no database needed |
| `npm run test:integration` | Tests in `*.integration.test.ts` against the migrated database |
| `npm run lint` | ESLint: Next.js rules plus the Google style rules |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run db:migrate:down` | Rolls back the last migration |
| `npm run db:migrate:create -- <name>` | New SQL migration in `migrations/`. Never edit one that has been applied; add another |
| `npm run db:down` | Stops the database (data is kept in the `db-data` volume) |

CI (`../.github/workflows/ci.yml`) runs all of the above on every pull request and on pushes to `main` and `dev`, plus `npm audit --audit-level=high`.

## Where things are

Code is grouped **by feature**. Every feature folder uses the same sub-folders, so you always know where to look:

| Sub-folder | Holds |
|---|---|
| `components/` | React components (`.tsx`) |
| `hooks/` | React hooks (`use*.ts`) |
| `services/` | Rules and storage, no React; unit tests sit next to them as `*.test.ts` |
| `interfaces/` | TypeScript types (`*.interface.ts`) |
| `constants/` | Fixed numbers (`*.constants.ts`) |
| `data/` | Sample data |
| `i18n/` | Bahasa Melayu and English messages, with a `*-messages.interface.ts` |
| `styles/` | CSS Modules (`*.module.css`) |

```
app/
  layout.tsx, globals.css        root layout, design tokens, colour skins, card frames
  (magic)/layout.tsx             sets data-theme-scope="magic" (plan D8); teacher screens will get a (calm) group
  (magic)/login/page.tsx         /login, sign-in with mock accounts (features/auth/data/demo-accounts.ts)
  (magic)/student/page.tsx       /student, the student board (needs a signed-in mock student)
  health/route.ts                GET /health: 200 when the database answers, 503 when not
features/
  student-dashboard/             sidebar, cards, quest/week/level-up dialogs, progress state
  battle/                        Monster Lair, quiz battle (rules, script, controller, screen)
  characters/                    one folder per character, plus the shared sprite components
    pendekar/  orang-bunian/  naga-laut/  harimau-jin/  hantu-lelaki/
    index.ts                     registry: PLAYER_CHARACTER, MONSTERS
  shop/                          coin shop, skins, frames, avatars
  pahlawan/                      naming the battle character
  health/                        the /health check
shared/                          used by every feature: storage, i18n, theme, pixel sprites, buttons, cards, dialogs, toast
  server/                        server-only code (database pool); never import it from a 'use client' file
migrations/                      SQL migrations (node-pg-migrate)
public/
  characters/<name>/portrait.png, sprite-sheet.png
  scenes/*.svg                   backgrounds for the skins and the battle arena
  brand/sapientia-logo.jpg
```

### Adding a monster

1. Put `portrait.png` and `sprite-sheet.png` in `public/characters/<name>/`. The sheet is one row of equal cells: idle, attack, hit and die frames, feet on the same line, facing left.
2. Create `features/characters/<name>/<name>.character.ts` (copy another monster) and, if it moves differently, `<name>.module.css`.
3. List it in `features/characters/index.ts` and add its questions to `features/battle/data/quiz-bank.ts`.

## Notes

- Progress (quest ticks, battle rewards) resets on reload; the shop, language, theme, photo, pahlawan name and battle records are kept in this browser's localStorage.
- The demo clock is fixed at Thursday 10:15 (`features/student-dashboard/constants/demo-clock.constants.ts`).
- Every animation is switched off when the device asks for reduced motion.
