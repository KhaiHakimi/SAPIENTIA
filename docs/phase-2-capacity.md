# Phase 2: Capacity (Sprints 6 to 8)

Written 11 November 2026, before Sprint 6, as the plan requires for every phase (Section 7): user stories with acceptance criteria, and a short threat model. All people and schools in tests and seeds are fictional.

These stories were written from the plan, not from the Phase 0 teacher interviews. If the interviews said something different about deadlines, extensions or relief, revise the stories first.

## Sprint split

| Sprint | Scope | Status |
|--------|-------|--------|
| S6 | Subjects, classes, task types; weekly timetable; free-time and feasibility rules; `POST /api/tasks/feasibility`; warning on the create form; flagged-deadline marker | Built 11 November 2026 |
| S7 | Extension requests (teacher asks, sender approves or proposes a date, recorded on the task); workload view when assigning | Not started |
| S8 | Relief assignments and suggestions; optional completion question; gate G4 review | Not started |

## User stories: Sprint 6

**S6-1. Timetable.** As an administrator, I want to enter each teacher's weekly lessons and fixed duties, so that the system knows when a teacher is not free.

- Given I am an administrator, when I add a period for a teacher in my school with a day, start and end, and either a class and subject or a label, then it appears in that teacher's week.
- Given a teacher already has a period from 08:00 to 09:00 on Monday, when I add 08:30 to 09:30 on Monday for the same teacher, then it is refused with a message naming the clash; 09:00 to 10:00 is accepted.
- Given I am a teacher, when I open Timetable, then I see my own week and cannot change it or see a colleague's.

**S6-2. Task types.** As an administrator, I want to keep a list of common tasks with the time each usually takes, so that senders do not have to guess.

- Given I add a task type with a name and an estimate from 5 to 6000 minutes, then senders can choose it on the new-task form and the estimate is filled in.
- Given I remove a task type, then it can no longer be chosen, and tasks already sent keep their estimate.

**S6-3. Feasibility check.** As a sender, I want to be told when a due date does not leave a teacher enough working time, so that I can choose a realistic date.

- Given a task with an estimate, assignees and a due date, when I look at the form, then for each assignee who has less free working time than the estimate between delivery and the end of the due day, I see their name, the time needed, the free time, and the earliest realistic date.
- Free time counts working hours on working days only, minus timetable periods, minus the estimates of that teacher's unfinished tasks due by then. Evenings, weekends and holidays are never free.
- Given a task created at 10 pm, then its free time starts at the next working morning, when it is delivered.
- Given no estimate, then nothing is checked and the form says why.

**S6-4. Warn, never block.** As a sender, I want to be able to send a task even when warned, so that the system informs my judgement instead of replacing it.

- Given the warning is showing, when I send the task anyway, then it is created, marked "tight deadline", and the audit log records how many assignees were short of time.
- Given the warning offers a date, when I choose it, then the due date changes and the warning clears.

## Threat model: Phase 2

New data: timetables (where a teacher is, hour by hour, every week), time estimates, and derived free and committed time per teacher.

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| The timetable becomes a way to locate or watch a colleague | Any staff member | A teacher can read only their own week. Only an administrator can read another teacher's, and anyone else gets 404. No "who is free now" search exists. |
| The feasibility check leaks what a colleague has been asked to do | Sender | It returns totals of minutes only: no titles, senders or due dates of other tasks. Only senders and administrators can run it, and only for staff of their own school. |
| Capacity numbers are used to rank or discipline teachers | Management | Nothing stores a per-teacher score, and there is no report of "who had free time". The check runs only while a task is being created. Hard rule from Phase 3 applies already: no last-online, no time-in-app, no location. |
| Cross-school access | Staff of another school | Every table carries `school_id`; repositories take it first; composite foreign keys stop a period pointing at another school's teacher, class or subject. Refusal tests cover each endpoint. |
| A wrong estimate makes the tool cry wolf, or hides a real overload | Sender, administrator | The estimate is visible and editable on the form; the warning shows its arithmetic (needed, free, teaching, other tasks); the sender decides. The simplification is documented in the README. |
| Two administrators double-book a teacher at the same moment | Administrator | A database exclusion constraint refuses overlapping periods, whatever the application does. |
| Flooding the lists or the timetable | Compromised administrator account | Caps on list size and periods per teacher; bodies are size-limited and validated; names are length-limited in the database. |

Open questions for later sprints:

- S7 exposes more: an extension request shows the teacher's conflicts to the sender. Show totals, as here, not other tasks' titles.
- S8 relief suggestions rank teachers by relief already done. Keep the ranking inside the suggestion and never show it as a league table.
- "Committed work as a single total" (plan risk): a task counts in full once its due date falls inside the period checked, and not before. It is deliberate and simple; revisit if teachers say the warnings are wrong.
