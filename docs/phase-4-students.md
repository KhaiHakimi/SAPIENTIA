# Phase 4: Students and guardians

User stories, acceptance criteria and the threat model for plan Phase 4 (Sprints 11 to 14), written before the code as the plan asks ("threat-model this phase first: it introduces children's data"). The stories come from the plan, not from teacher, pupil or guardian interviews: Phase 0 has not been done. Gate G5 was passed on 16 November 2026 by the project owner.

## Conditions for this phase

- **Fictional data only.** Nothing in this phase may hold a real pupil's or guardian's details until a legal review covers children's data under the PDPA (parental consent, retention, breach notification) and the school has agreed. Plan Section 8: no production environment for real schools.
- **Decision D7 is open.** No legal reviewer for Act 876 had been named when Phase 4 started (the plan asked for one first). The project owner chose on 16 November 2026 to continue with fictional data and log this as a risk. Phase 5 (bullying reporting) stays blocked by gate G6, which needs the written legal review. The review request is still due in Sprint 11.

## Sprint split

| Sprint | Scope | State |
|--------|-------|-------|
| S11 | Pupil accounts: classes and enrolment, the administrator adds pupils from a class list, printed sign-in slips, pupil sign-in with a password of their own, managing pupils (class, disable, new slip, remove); the student board opens for a real signed-in pupil | Built 16 November 2026 |
| S12 | Homework set by teachers, the pupil's homework list and week, the pupil's timetable from the class timetable (relief included), the cross-subject load warning, marking time in the teacher's capacity, paper hand-in by tapping names | Part 1 (homework, warnings, marking time, hand-in, pupil homework and timetable APIs) built 16 November 2026; part 2 (the board shows them) not started |
| S13 | Guardians: linked by the administrator only, refusing or removing a link with a reason, the read-only guardian view, a printable summary, meeting requests in working hours | Not started |
| S14 | Institution accounts with individual staff logins, afternoon-only pupil reminders, teacher-to-pupil comments on homework (logged), polish and the phase review | Not started |

## Data kept about a pupil

Data minimisation (plan Phase 4): **name, class and a school-issued number only.** No MyKad number, birth date, address, photo, email, phone or health data. The school-issued number is optional and is refused if it looks like a MyKad number (12 digits, with or without dashes), so one is not typed in by habit.

The account adds a username, a password hash, whether the pupil has set their own password yet, and whether the account is active. **No last-sign-in time or any activity record is kept**, so the school cannot watch when a child uses the app.

## User stories: Sprint 11

**S11-1. Add a class's pupils at once.** As an administrator, I want to paste a class list and get an account for each pupil, so that a class can start without anyone typing emails.

- I choose a class and paste one pupil per line: the name, optionally followed by a comma or a tab and the school-issued number (a column copied from Excel works).
- Up to 50 pupils at a time. If any line is wrong (a name too long, a number already used in the school, a number that looks like a MyKad number) nothing is added and the line is shown.
- Each pupil gets a username and a starting password. The starting passwords are shown once, as slips I can print and cut, and never again: only their hash is kept.

**S11-2. A pupil signs in and sets their own password.** As a pupil, I want to sign in with the username and password on my slip and then choose my own password, so that only I know it.

- On the sign-in page I type my username (no email needed) and the slip's password.
- I must choose a new password (at least 8 characters, not the slip's) before anything else opens. Until I do, the starting password works for 14 days; after that a new slip is needed.
- A wrong username or password gives the same message, and repeated failures are slowed down, as for staff.

**S11-3. Manage pupils.** As an administrator, I want to move a pupil to another class, correct a name or number, print a new slip when a password is forgotten, disable an account, and remove a pupil who has left.

- A new slip replaces the old password and signs the pupil out everywhere.
- Disabling signs the pupil out and stops sign-in; the account can be enabled again.
- Removing deletes the pupil and their account (the school no longer needs the data).
- Teachers, senders, other schools and pupils get 404 for all of this.

**S11-4. The student board is the pupil's own.** As a pupil, once signed in I see the board with my own name and class.

- The board's quests, timetable and progress remain sample data until homework and the class timetable arrive in Sprint 12; the page says so in the README, not to the pupil.
- Signing out ends the session on the server.

## User stories: Sprint 12

Sprint 12 is built in two parts. Part 1 is the homework itself, the teacher's side and the pupil's data; part 2 puts the pupil's homework and timetable on the board in place of the sample data.

**S12-1. Set homework, knowing what the class already has.** As a teacher, I want to set homework for a class I teach and see what other subjects have set that week, so that pupils are not given everything on the same day (plan Phase 0 question 6).

- I choose one of my lessons (a class and subject on my own timetable), a title, optional details and a due date: a school day, from today up to 60 days ahead.
- Before saving I see the class's homework due that week: the date and subject only, never who set it or anything about pupils.
- If the class already has two pieces of homework due that day, I am warned that mine would be the third. I can still save (warn, never block); the homework is marked as flagged and the audit log records it. Plan Section 10 counts these days.

**S12-2. Marking time is working time.** As a teacher, I want the marking I take on to count against my free working time, so that tasks sent to me take it into account.

- I can give a marking estimate (5 to 600 minutes for the whole class) and the day I plan to finish marking (on or after the due date, within 60 days of it).
- Before saving I see whether that time exists in my working hours by that day, with the same capacity check as tasks. It is advice only.
- Until I mark it as marked, the estimate counts as committed work in every capacity check and workload total, exactly as an open task does. Marking it done, or removing the homework, frees the time.

**S12-3. Paper hand-in by tapping names.** As a teacher, I want to tick off who handed in their exercise book on the class list, so that I need no separate register.

- On my homework I see the class's current pupils by name and tap a name to record a hand-in, or tap again to undo it.
- Only the teacher who set the homework sees or changes this. Other teachers, administrators and pupils get 404.
- No list of who has not handed in is ever shown to pupils (plan Phase 4 test).

**S12-4. The pupil's homework and timetable (data for part 2).** As a pupil, I want my class's homework and my week's timetable.

- `GET /api/student/homework`: my class's homework due from a week ago onwards, with the subject, the teacher's name and whether **my own** hand-in was recorded. Nothing about other pupils.
- `GET /api/student/timetable?weekOf=`: my class's lessons for each school day of that week, from the teachers' timetables. Holidays have no lessons; a lesson a relief teacher covers is marked as relief.
- The pupil comes from the session only: there is no pupil id in any of these requests.

## Threat model: Phase 4

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| A pupil reaches staff pages or data | Pupil | Pupil sessions are a separate table and cookie. No staff check accepts them (`requireUser` reads only staff sessions) and no pupil check accepts a staff session. Tested both ways on every endpoint. |
| On a shared classroom computer, a pupil inherits a teacher's open session (or the other way round) | Pupil, teacher | Signing in as either kind ends any session of the other kind in that browser, on the server as well as the cookie. Pupil sessions end after 30 minutes idle and 8 hours at most. |
| A starting password on a lost slip is used by someone else | Anyone | The slip's password only opens the "choose your password" step, works for 14 days, and is replaced by a new slip. Only its hash is stored. |
| Guessing pupils' passwords | Anyone | Same throttling as staff (per account and per address), one error for unknown username and wrong password, argon2id hashes. Starting passwords are random (8 characters from 31, about 40 bits) and expire. |
| Collecting more about a child than needed | School, developer | Name, class and school number only; MyKad-like numbers refused; no activity or sign-in times stored; nothing about pupils in the audit log beyond ids. |
| A pupil sees another pupil's records (S12 onwards) | Pupil | Pupil endpoints take the pupil from the session and never accept a pupil id; refusal tests per endpoint. Late-hand-in lists are never shown to pupils (plan). |
| A teacher reads another class's hand-ins, or sets homework for a class they do not teach (S12) | Teacher | Homework can be set only for a class and subject on the setter's own timetable; hand-ins are read and changed by the setter only (404 for anyone else, administrators included). The load warning shows dates and subjects, never names. |
| A guardian sees a child who is not theirs (S13) | Guardian | Links made by the administrator only, never self-claimed; every guardian query filtered by link; refusal tests. |
| Children's data is held without a legal basis | School | Fictional data only in this phase; legal review before any real pupil (see Conditions). |
| Slips or pupil lists are left on a shared printer or screen | Administrator | Passwords are shown once and are useless after the pupil chooses their own. The page warns to hand slips out in person. |

## Open questions

- Phase 0 has not been done: the 14-day slip, the 8-character minimum and the 50-pupil batch are judgements to check with schools.
- One class per pupil. Secondary schools with elective groups may need more than one; the table allows it to change later.
- Usernames are the first name's letters plus four digits. Names with no Latin letters get `murid` plus digits; the slip carries the full name.
