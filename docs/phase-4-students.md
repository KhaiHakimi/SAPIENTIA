# Phase 4: Students and guardians

User stories, acceptance criteria and the threat model for plan Phase 4 (Sprints 11 to 14), written before the code as the plan asks ("threat-model this phase first: it introduces children's data"). The stories come from the plan, not from teacher, pupil or guardian interviews: Phase 0 has not been done. Gate G5 was passed on 16 November 2026 by the project owner.

## Conditions for this phase

- **Fictional data only.** Nothing in this phase may hold a real pupil's or guardian's details until a legal review covers children's data under the PDPA (parental consent, retention, breach notification) and the school has agreed. Plan Section 8: no production environment for real schools.
- **Decision D7 is open.** No legal reviewer for Act 876 had been named when Phase 4 started (the plan asked for one first). The project owner chose on 16 November 2026 to continue with fictional data and log this as a risk. Phase 5 (bullying reporting) stays blocked by gate G6, which needs the written legal review. The review request is still due in Sprint 11.

## Sprint split

| Sprint | Scope | State |
|--------|-------|-------|
| S11 | Pupil accounts: classes and enrolment, the administrator adds pupils from a class list, printed sign-in slips, pupil sign-in with a password of their own, managing pupils (class, disable, new slip, remove); the student board opens for a real signed-in pupil | Built 16 November 2026 |
| S12 | Homework set by teachers, the pupil's homework list and week, the pupil's timetable from the class timetable (relief included), the cross-subject load warning, marking time in the teacher's capacity, paper hand-in by tapping names | Part 1 (homework, warnings, marking time, hand-in, pupil homework and timetable APIs) built 16 November 2026; part 2 (the board shows them) built 18 November 2026 |
| S13 | Guardians: linked by the administrator only, refusing or removing a link with a reason, the read-only guardian view, a printable summary, meeting requests in working hours | Part 1 (guardian accounts on printed slips, links, refusal and removal, the read-only view) and part 2 (the printed summary, meeting requests in working hours) built 18 November 2026. Started with no legal reviewer named: the project owner accepted the risk again on 18 November 2026, fictional data only |
| S14 | Institution accounts with individual staff logins, afternoon-only pupil reminders, teacher-to-pupil comments on homework (logged), polish and the phase review | Built 18 November 2026. The project owner chose: the school is the institution (removing a staff login, no new tables), the reminder on the board only (no push to pupils), comments as short text kept and audited |

## Data kept about a pupil

Data minimisation (plan Phase 4): **name, class and a school-issued number only.** No MyKad number, birth date, address, photo, email, phone or health data. The school-issued number is optional and is refused if it looks like a MyKad number (12 digits, with or without dashes), so one is not typed in by habit.

The account adds a username, a password hash, whether the pupil has set their own password yet, and whether the account is active. **No last-sign-in time or any activity record is kept**, so the school cannot watch when a child uses the app.

## Data kept about a guardian

Plan Phase 4: **the guardian's name and, for each child, the relationship type only** (mother, father, guardian, grandparent, other relative, other). Never the circumstances: no reason a child lives with them, no custody details, no MyKad number, address, email or phone. The account is a username, a password hash, whether the guardian has set their own password and whether the account is active; like pupils, **no sign-in times**.

A link that is refused or removed keeps a reason from a fixed list, never free text, so no circumstances are written down by accident. The audit log keeps ids and those reason codes.

A meeting request (part 2) keeps the teacher, a topic, a preferred time of day and, once answered, the meeting time or a decline reason. Every one of these is a code from a fixed list: no message box, so nothing about a family is written down. A request belongs to the link and ends with it.

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

**S12-5. The board shows my homework and my week (part 2).** As a pupil, I want my board's quests and timetable to be my class's real ones, so that the board is worth opening.

- Each piece of homework is a room on the quest map with its subject, the teacher's name, the teacher's message and when it is due (today, tomorrow, a date, or a date that has passed), worked out on the school's clock, not the device's.
- Once my teacher records my hand-in the room is cleared for good, marked as received by the teacher, and I cannot undo it. Before that I can tick it myself as my own checklist; the tick never reaches the teacher and resets when the page reloads, like XP and coins, which stay sample values until progress is kept on the server.
- Today's lessons and the weekly scroll (Monday to Friday, a weekend day only when it is a school day, last and next week) come from the class timetable, with relief marked and holidays shown as no school. The current lesson is highlighted with the minutes left.
- The class goal shows this week's hand-ins across the class as two numbers, never names. It is withheld in a class under 5 pupils (`CLASS_GOAL_MIN_PUPILS`), where a count points at the few who have not handed in.

## User stories: Sprint 13

Sprint 13 is built in two parts. Part 1 is guardian accounts, links and the read-only view; part 2 is the printable summary and meeting requests. The project owner chose on 18 November 2026: guardians sign in with a printed slip like pupils (no email or phone stored), the guardian may refuse a link and the administrator may remove one, each with a reason.

**S13-1. Add a guardian and link them to a child.** As an administrator, I want to add a guardian with a link to their child and print a slip, so that they can see their child's homework without the school storing contact details.

- I type the guardian's name, choose the child (class, then pupil) and the relationship type. The guardian gets a username beginning with `penjaga.` and a starting password, shown once on a slip to print and hand over in person, like a pupil's.
- I can link the same guardian to more children (up to 10) and a child to more guardians. A guardian already linked to a child cannot be linked to them twice.
- Guardians are never self-claimed: no screen lets a guardian or pupil make a link.
- Teachers, senders, pupils, guardians and other schools get 404 for all of this.

**S13-2. Manage guardians.** As an administrator, I want to print a new slip, disable or remove a guardian, and remove a link with a reason.

- Removing a link needs a reason from a list (entered in error, the guardian asked, a school decision, the pupil has left). The guardian no longer sees that child at once.
- A new slip replaces the password and signs the guardian out everywhere; disabling signs them out and stops sign-in; removing deletes the guardian and their links.
- I see each guardian's links, including ones the guardian refused (with the reason) or I removed.

**S13-3. Sign in and see my child.** As a guardian, I want to sign in with my slip, choose my own password, and see each linked child's homework and week.

- The sign-in page takes the `penjaga.` username; I must replace the slip's password (at least 10 characters) before anything else opens. Signing in as a guardian ends any staff or pupil session in that browser, and the other way round.
- For each child: name, class, my relationship, their homework from a week ago (subject, teacher, due date, the teacher's message, whether **this child's** hand-in is recorded) and this week's timetable with relief marked. Read only.
- Calm theme (plan D8): no game, no XP.

**S13-4. Refuse a link that is wrong.** As a guardian, I want to refuse a link to a child who is not mine, so that I do not see a child I should not.

- I choose a reason (not my child, I am not responsible for this child, other) and confirm. The child disappears from my view at once; the administrator sees the refusal and the reason.
- I cannot undo a refusal; the administrator can link again if it was a mistake.

**S13-5. A printed summary for a guardian without a smartphone (part 2).** As an administrator, I want to print one sheet for a guardian, so that a family without a smartphone still knows the homework and the week.

- From the guardian's row I open "Printed summary": the school, the guardian's name and the date printed, then for each active link the child's class homework due in the next two weeks (due date, subject, title, teacher, the teacher's message) and this week's or next week's timetable with relief marked. Only the sheet prints.
- Hand-ins are not on the sheet: they stay with the teacher who set the work (Sprint 12), and the guardian sees them when they sign in.
- Administrators of the guardian's school only (404 for anyone else). Each view is audited with ids only, because it puts a child's school week on paper.

**S13-6. Ask a teacher for a meeting (part 2).** As a guardian, I want to ask one of my child's teachers for a meeting, so that I can talk to them without needing their phone number.

- Under each child I choose a teacher who teaches the class (from the timetable), a topic (homework, progress, conduct, other) and a time of day that suits me. There is no message box.
- The request reaches the teacher in working hours only, worked out exactly as a task's delivery: one sent at night, at the weekend or on a holiday waits for the next working start, and the page tells me when it will arrive. The teacher gets an email or push saying only that a guardian asked; the names stay in the app.
- At most 3 requests waiting at once, and one per teacher per child. I can withdraw a request still waiting. If my link ends, waiting requests are cancelled.

**S13-7. Answer a meeting request (part 2).** As a teacher, I want to see guardians' requests and answer them in my working time.

- "Meetings" lists requests that have reached me: the guardian's name only (no username, relationship or other children), the pupil and class, the topic and preferred time.
- I accept with a date and time inside working hours on a working day, within 60 days, or decline with a reason from a list (see another teacher, not available, other). The guardian sees my answer when they sign in. Anyone else, including administrators, gets 404.

## User stories: Sprint 14

The project owner chose on 18 November 2026: the school is the institution and its staff logins sit beneath it (no new tables); pupil reminders appear on the board only; teacher comments are short text, kept and audited.

**S14-1. Disable or remove a staff login.** As an administrator, I want to end a colleague's access when they leave, so that a former teacher cannot reach pupils' or guardians' records.

- On Users I can disable a login (it signs them out at once and stops sign-in and invites) and enable it again, or remove it for good after a confirmation that says what removal means.
- Removal keeps the row so tasks, homework and records keep the name, shown as former staff. Their email is replaced (so the address can be invited again as a new account), and their password, last sign-in time, devices and private hours log are deleted. Totals they chose to share stay in the monthly report. Meeting requests still waiting for them are cancelled.
- I cannot change my own login, which also means the school always keeps an active administrator. Teachers, senders and other schools get 404.

**S14-2. An afternoon reminder.** As a pupil, I want to be reminded in the afternoon about homework due on the next school day, so that I remember it before the evening, never at night.

- From 2 pm to 6 pm school time, my board shows the homework due on the next school day (Friday reminds about Monday; holidays are skipped) that my teacher has not received and I have not ticked. Each line opens its scroll.
- Outside that window the reminder is not shown. Nothing is sent to my device and nothing new is stored.

**S14-3. A note from my teacher.** As a teacher, I want to write a short note to one pupil about their homework, so that feedback reaches them and their family.

- Only the teacher who set the work writes, reads or hides notes on it. A note is up to 300 characters, at most 10 per pupil per piece of homework; text that contains a number written like a MyKad number is refused.
- The pupil sees it on the homework's scroll, and their linked guardians under the homework. The pupil cannot reply; there is no pupil-to-pupil messaging anywhere.
- A note is never edited or deleted on its own; the teacher may hide it, and it goes only if the homework is removed. Adding and hiding are audited with ids, never the text.

## Threat model: Phase 4

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| A pupil reaches staff pages or data | Pupil | Pupil sessions are a separate table and cookie. No staff check accepts them (`requireUser` reads only staff sessions) and no pupil check accepts a staff session. Tested both ways on every endpoint. |
| On a shared classroom computer, a pupil inherits a teacher's open session (or the other way round) | Pupil, teacher | Signing in as either kind ends any session of the other kind in that browser, on the server as well as the cookie. Pupil sessions end after 30 minutes idle and 8 hours at most. |
| A starting password on a lost slip is used by someone else | Anyone | The slip's password only opens the "choose your password" step, works for 14 days, and is replaced by a new slip. Only its hash is stored. |
| Guessing pupils' passwords | Anyone | Same throttling as staff (per account and per address), one error for unknown username and wrong password, argon2id hashes. Starting passwords are random (8 characters from 31, about 40 bits) and expire. |
| Collecting more about a child than needed | School, developer | Name, class and school number only; MyKad-like numbers refused; no activity or sign-in times stored; nothing about pupils in the audit log beyond ids. |
| A pupil sees another pupil's records (S12 onwards) | Pupil | Pupil endpoints take the pupil from the session and never accept a pupil id; refusal tests per endpoint. Late-hand-in lists are never shown to pupils (plan). The class goal is two counts, withheld below 5 pupils. |
| A teacher reads another class's hand-ins, or sets homework for a class they do not teach (S12) | Teacher | Homework can be set only for a class and subject on the setter's own timetable; hand-ins are read and changed by the setter only (404 for anyone else, administrators included). The load warning shows dates and subjects, never names. |
| A guardian sees a child who is not theirs (S13) | Guardian | Links made by the administrator only, never self-claimed; every guardian query filtered by link; refusal tests. A guardian refers to a child by the link's id, never the pupil's, and a refused or removed link answers 404. |
| A guardian's circumstances (custody, family situation) end up stored | Administrator, guardian | Only a relationship type from a fixed list; refusal and removal reasons from fixed lists, never free text. Meeting requests take codes only (topic, time of day, decline reason); a body with any other field is refused. |
| Guardians reach teachers at night or flood them with requests (S13) | Guardian | Requests reach the teacher only in working hours (the held-delivery rule) and stay off the teacher's list until then; at most 3 waiting per guardian and one per teacher per child; a guardian may ask only teachers on the child's class timetable. |
| A meeting request tells more than the guardian's name, or leaks by email (S13) | Teacher, guardian | The teacher sees the guardian's name only; the email or push names no one. The printed summary carries no hand-ins, and each view is audited. |
| A teacher who has left still reaches pupils' or guardians' records (S14) | Former staff | Disabling or removing a login deletes its sessions in the same transaction, and every staff check requires an active login; removal also revokes invites, clears the password and email, and deletes devices (tested). |
| A teacher writes something about a child that should not be kept, or to the wrong pupil (S14) | Teacher | Notes are short, to one pupil of the setter's own class only (another pupil is refused), MyKad-like numbers refused, a warning on the form, hidden on request; the audit log keeps ids, never the text. Pupils cannot reply. |
| A reminder disturbs a child at night (S14) | Pupil | The reminder exists only on the board, from 2 pm to 6 pm school time; nothing is pushed to a child's device. |
| A guardian, pupil and staff member share a computer and inherit each other's session | Anyone | Signing in as any kind ends the other kinds' sessions in that browser; guardians have their own session table and cookie, and no staff or pupil check accepts a guardian session. |
| Children's data is held without a legal basis | School | Fictional data only in this phase; legal review before any real pupil (see Conditions). |
| Slips or pupil lists are left on a shared printer or screen | Administrator | Passwords are shown once and are useless after the pupil chooses their own. The page warns to hand slips out in person. |

## Phase 4 review

Checked on 18 November 2026 against the plan's list for Phase 4 (Section 4). The decision to close the phase is the project owner's; this is the evidence. Every item below was built with fictional data only.

| Plan item | Status | Evidence |
|-----------|--------|----------|
| Threat-model the phase first | Done | The threat model above, written in Sprint 11 and extended each sprint |
| Tables | Done, with one change | `students`, `class_enrolments`, `homework`, `homework_status`, `guardians`, `guardian_links`, plus sessions, `meeting_requests` and `homework_comments`. No `institutions` or `institution_staff`: the project owner chose the school as the institution (S14-1) |
| Data minimisation | Done | Pupils: name, class, optional school number (MyKad-like numbers refused). Guardians: name and relationship type. Reasons, topics and answers are codes; the only free text about a pupil is a teacher's short note, with MyKad-like numbers refused |
| Guardians linked by the administrator only; refusal and removal with a reason; teachers see the guardian's name only | Done | S13-1 to S13-4 and S13-7; refusal tests per endpoint |
| Pupil timetable (relief included) and homework with the week | Done | S12-4, S12-5 |
| Cross-subject load warning; marking time in capacity | Done | S12-1, S12-2 |
| Paper hand-ins by tapping names | Done | S12-3 |
| Pupil reminders in the afternoon only | Done, on the board | S14-2: 2 pm to 6 pm, no push to pupils |
| Guardian view, meeting requests in working hours, printable summary | Done | S13-3, S13-5 to S13-7 |
| Teacher to pupil communication only on homework, logged; no pupil-to-pupil messaging | Done | S14-3; no endpoint lets a pupil send anything to anyone |
| Institution accounts with staff logins; access ends when a login is removed | Done, as the school | S14-1; sessions end in the same transaction (tested) |
| Start the legal review request in S11 | **Not done** | No reviewer named (decision D7). The project owner accepted the risk at the start of S12 and S13; fictional data only |
| Tests: a pupil cannot see another's records; late lists never visible to pupils; a guardian sees only linked children | Done | Integration refusal tests for every pupil and guardian endpoint; hand-ins are read by the setter only; the class goal is two counts, withheld below 5 pupils |

Still open after Phase 4:

1. **Legal review (D7) and gate G6.** Phase 5 (bullying reporting) must not start until a written legal review is received and the Phase 5 threat model is written. The third condition, MFA, was built on 18 November 2026 (two-step sign-in; OWASP review).
2. **No real pupil data** until a legal review covers children's data under the PDPA and a school agrees (Conditions above).
3. **Phase 0 interviews** are still outstanding: the slip lifetime, the reminder window, the note length and the meeting limits are judgements.
4. **XP, coins, streak, relics and mastery** on the pupil's board are still sample values kept in the browser.
5. **A removed or disabled teacher's timetable slots stay** until an administrator changes the timetable, so a class may still show their lessons; the meeting list already leaves them out.

## Open questions

- Phase 0 has not been done: the 14-day slip, the 8-character minimum and the 50-pupil batch are judgements to check with schools.
- One class per pupil. Secondary schools with elective groups may need more than one; the table allows it to change later.
- Usernames are the first name's letters plus four digits. Names with no Latin letters get `murid` plus digits; the slip carries the full name.
