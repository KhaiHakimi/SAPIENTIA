# Sapientia

**A workload-aware coordination app for Malaysian schools, with a gamified student home.**

Sapientia is an independent portfolio project. It is at an early stage: a full project plan, three working front-end prototypes and an empty application skeleton. It does not have a back end yet, and it should not be used with real school or student data.

> All data in this repository is fictional. Sapientia is not affiliated with, or endorsed by, the Ministry of Education Malaysia (KPM), DELIMa or any school.

---

## Contents

- [The problem](#the-problem)
- [The idea: held delivery](#the-idea-held-delivery)
- [What is in this repository today](#what-is-in-this-repository-today)
- [The student dashboard prototype](#the-student-dashboard-prototype)
- [Planned features](#planned-features)
- [Design principles](#design-principles)
- [Technology](#technology)
- [Running it](#running-it)
- [Roadmap](#roadmap)
- [Data protection and legal notes](#data-protection-and-legal-notes)
- [Status and licence](#status-and-licence)

---

## The problem

Teachers in many schools receive administrative tasks through chat groups at any hour of the day or night. Deadlines are often set without looking at what else a teacher already has to do. Evidence of work done, relief cover and homework load across subjects are tracked by hand.

These are observations to be tested, not measured facts. Phase 0 of the plan is a round of interviews with teachers to confirm, revise or reject each problem before any heavy coding starts.

## The idea: held delivery

The defining feature is **held delivery**. A task created outside working hours is held and only reaches its assignees on the next working morning. For example, a task created at 10pm on a Friday stays invisible until 7:30am on Monday.

- The sender sees plain-language confirmation, for example "Akan dihantar: Isnin, 7:30 pagi".
- An urgent override exists, but it needs a written reason, is logged and is counted in reports.
- Working days follow each school's own calendar and weekend setting, including schools whose weekend is Friday and Saturday.
- The time logic is treated as the product itself, so it is written as pure functions with an injected clock and tested case by case.

## What is in this repository today

| Part | What it is | State |
|---|---|---|
| `Sapientia_Project_Plan.md` | The master plan: phases, sprints, go/no-go gates, risks, security and testing approach | Written |
| `prototypes/login` | Sign-in screen prototype (Bahasa Melayu and English) | Static HTML, no real authentication |
| `prototypes/landing` | Landing page prototype with several design directions | Static HTML |
| `prototypes/student-dashboard` | Gamified student home (see below) | Static HTML, data kept in the browser only |
| `sapientia/` | Next.js application skeleton | Created from the starter template, not yet built on |

There is no database, API or real sign-in yet.

## The student dashboard prototype

A single HTML file that shows what the student side could feel like. It is built as a pixel-art dungeon game, but the underlying content is ordinary school work.

**School life**
- **Quest map:** each homework task is a "room". Marking it done earns XP and coins.
- **Level and streak:** XP raises the student's level; a streak counts consecutive days of work.
- **Today's timetable and a weekly timetable**, including a marker when a relief teacher covers a lesson.
- **This week's torches:** weekday reminders, sent in the afternoon only.
- **Relics:** milestone badges that unlock as the student progresses.
- **Subject mastery** bars and a **class party** progress bar.
- **Weekly guardian:** a boss whose health falls as the week's quests are finished.

**Monster Lair (quiz battles)**
- Each subject has its own monster, with its own difficulty: Number Golem (Maths), Lab Slime (Science), Language Tiger (Malay) and Grammar Dragon (English).
- The battle screen is laid out like a classic handheld RPG: the monster at the top right, the student's knight at the bottom left, name and HP plates, typed text and an answer menu.
- A right answer damages the monster. A wrong answer damages the knight, and that question comes back until it is answered correctly.
- If the knight's health runs out, the student retries with the questions and answers in a **new order**. The screen lists the topics to revisit.
- Keyboard play works (keys 1 to 4 and the arrow keys), and animations switch off for people who ask for reduced motion.

**Personalisation**
- **My Knight:** choose armour colour, cape and plume colour, helmet (plume, horns, crest), weapon (sword, axe, spear) and a name.
- **Profile photo:** upload a picture, which is cropped, shrunk and stored in the browser.
- **Shop:** coins buy cosmetic skins, card frames and avatars. Items are cosmetic only and never affect marks. Skins are Stone Keep, Royal Hall, Forest Ruins, Ember Forge and Sakura Garden, each with its own pixel-art background.
- **Languages and themes:** Bahasa Melayu and English, light and dark.

The 12 sample quiz questions are placeholders and have not been reviewed against the school syllabus.

## Planned features

The plan splits the work into phases. Each phase is useful on its own, and the minimum viable product is the end of Phase 1.

| Phase | Theme | Main features |
|---|---|---|
| 0 | Validation | Teacher interviews, ranked problem list, user stories, paper sketches |
| 1 | Foundation and tasks (MVP) | Accounts, roles and invitations; task board and comments; audit log; held delivery with a holiday calendar; push and email notifications; installable web app; Bahasa Melayu and English |
| 2 | Capacity | Weekly timetable; feasibility check for deadlines (warns, never blocks); one-tap extension requests; workload view; relief teacher suggestions |
| 3 | Evidence | One-tap lesson records; monthly principal report (PDF and Excel); school-level wellbeing indicators; a private hours log only its owner can read; shared material bank |
| 4 | Students and guardians | Student timetable and homework; cross-subject homework load warning; guardian read-only view; institution accounts |
| 5 | Bullying reporting | Child-friendly reporting, a trusted-teacher choice, time-based escalation, append-only records. Gated on a legal review |
| 6 | AI and open standards | Turning an instruction into a task (a person always confirms), duplicate detection, a weekly digest, a read-only MCP server |

## Design principles

- **No monitoring of teachers.** There is no "last online", no time-in-app and no location tracking. Teachers see everything recorded about themselves.
- **Warn, never block.** Capacity checks inform people and leave the decision with them.
- **Data minimisation.** For students: name, class and a school-issued number only. No identity card number, address or health data.
- **Deny by default.** Every service checks the user's role and their relationship to the record. Unauthorised access returns "not found".
- **School isolation.** Every query is scoped to a school; refusal tests prove one school cannot read another.
- **Plain language.** The game theme appears in headings and friendly messages. Labels, buttons and error messages stay in plain Bahasa Melayu or English.
- **Calm where it matters.** Teacher, administrator and guardian screens, and the whole bullying module, stay neutral and quiet.

## Technology

**Prototypes:** plain HTML, CSS and JavaScript (no build step). Pixel art is drawn from letter grids as SVG. Text uses the Pixelify Sans font from Google Fonts.

**Planned back end and web app** (decisions are in the plan and may change): Node.js LTS, Fastify, PostgreSQL 16 or later, pg-boss for scheduled jobs, React with Vite as an installable web app, Zod for validation, Luxon for time zones, Vitest and Playwright for tests. Argon2id password hashing, HttpOnly cookies and rate limiting are planned for sign-in.

**Application skeleton in `sapientia/`:** Next.js, React and Tailwind CSS, created from the starter template.

## Running it

**Prototypes.** Open any of these files in a modern browser:

- `prototypes/login/index.html`
- `prototypes/landing/index.html`
- `prototypes/student-dashboard/index.html`

An internet connection is needed for the Google Fonts file. Student dashboard progress (photo, knight, shop purchases and battle records) is saved in the browser's local storage, so clearing site data resets it.

**Application skeleton.**

```bash
cd sapientia
npm install
npm run dev
```

Then open http://localhost:3000.

## Roadmap

Sprints are two weeks, worked part-time. These dates are estimates and are re-estimated after each sprint.

| Sprints | Dates | Phase |
|---|---|---|
| S0 | 19 October to 30 October 2026 | 0 Validation |
| S1 to S5 | 2 November 2026 to 8 January 2027 | 1 Foundation and tasks (MVP) |
| S6 to S8 | 11 January to 19 February 2027 | 2 Capacity |
| S9 to S10 | 22 February to 19 March 2027 | 3 Evidence |
| S11 to S14 | 22 March to 14 May 2027 | 4 Students and guardians |
| S15 to S17 | 17 May to 25 June 2027 | 5 Bullying reporting (after legal review) |
| S18 onwards | from 28 June 2027 | 6 AI and open standards |

Each phase ends with a go/no-go gate. The next phase does not start until the gate passes.

## Data protection and legal notes

- Everything here uses fictional names and data. Do not add real school, teacher or student information to this repository, its screenshots or its demos.
- Phases 4 and 5 involve children's data and sensitive reports. They must not be built for real use before a written legal review of the workflow, parental consent arrangements and Personal Data Protection Act obligations.
- A real deployment would also need the relevant approvals from the Ministry and the school.
- Nothing in this repository is legal advice.
- The login prototype shows example wording about data protection and encryption. It is placeholder text for the design and is not a statement of compliance.

## Status and licence

Early stage. The plan and prototypes are the current deliverables, and the first working milestone is the Phase 1 MVP.

Licence: to be decided. Until a licence file is added, all rights are reserved by the author.

Author: KHAIRUL HAKIMI BIN MA'AMOR
