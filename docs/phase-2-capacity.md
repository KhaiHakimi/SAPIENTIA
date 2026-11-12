# Phase 2: Capacity (Sprints 6 to 8)

Written 11 November 2026, before Sprint 6, as the plan requires for every phase (Section 7): user stories with acceptance criteria, and a short threat model. All people and schools in tests and seeds are fictional.

These stories were written from the plan, not from the Phase 0 teacher interviews. If the interviews said something different about deadlines, extensions or relief, revise the stories first.

## Sprint split

| Sprint | Scope | Status |
|--------|-------|--------|
| S6 | Subjects, classes, task types; weekly timetable; free-time and feasibility rules; `POST /api/tasks/feasibility`; warning on the create form; flagged-deadline marker | Built 11 November 2026 |
| S7 | Extension requests (teacher asks, sender approves or proposes a date, recorded on the task); workload view when assigning | Built 12 November 2026 |
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

## User stories: Sprint 7

**S7-1. Ask for more time.** As a teacher, I want to ask for a later due date in one step, with the reason already worked out, so that asking is quicker than apologising.

- Given a delivered task of mine that is not done, when I choose "Ask for more time", then the form opens with my own figures for this task (time needed, free working time before the due date, timetable and other work as totals) and the earliest realistic date already filled in.
- Given the task has no estimate, then the form says no date can be suggested and I choose one myself.
- I may change the date to any day later than my current due date, and add a reason of up to 500 characters; the reason is optional.
- Given I already have a request waiting for an answer on this task, then I cannot send another.
- Given the task is held, done, or not mine, then I cannot ask, and the server answers 404.

**S7-2. Answer a request.** As the sender, I want to approve the date or set another, so that the teacher has an answer and a date.

- Given a request on a task I sent, when I open the task, then I see who asked, the dates, the figures as they were when the teacher asked, and the reason if one was given. My sent list marks tasks with requests waiting.
- When I approve, the teacher's due date becomes the date asked for. When I set a different date later than their current one, their due date becomes that date.
- Only that teacher's due date moves. The task's own date and the other assignees' dates stay as they were.
- There is no "refuse" answer: the plan gives two answers, approve or propose a date. A sender who cannot give more time says so in a comment and leaves the request open. Review this with teachers and senders.
- Given a request has been answered, then it cannot be answered again; a teacher who needs longer asks again.

**S7-3. A record of the exchange.** As either party, I want the request and its answer to stay on the task, so that nobody has to remember what was agreed.

- Each request and answer is listed on the task, oldest first, and in the sender's history. An assignee sees only their own requests.
- The audit log records who asked, who answered and the dates. It does not record the reason.

**S7-4. Workload when assigning.** As a sender, I want to see how much work each person already has this week while I choose assignees, so that I can spread tasks fairly.

- Given the new-task form, then beside each name I see that person's estimated, unfinished work due by the end of this week (Sunday), overdue work included. People with none show nothing.
- Only senders and administrators can read it. It is a total of minutes: no titles, senders or dates.
- An extension moves the work with it: work extended into next week leaves this week's total and the capacity check for earlier dates.

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

Added for Sprint 7 (extension requests and the workload view):

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| A request shows the sender what else the teacher is working on | Sender | The request carries two totals only (time needed, free time before the due date). The fuller breakdown is shown to the teacher alone, about themselves. |
| A teacher inflates the figures to justify a request | Assignee | The figures are worked out on the server when the request is saved; the browser sends only a date and an optional reason. |
| A colleague reads another teacher's request or reason | Assignee | An assignee is given only their own requests. The reason is never written to the audit log. |
| Someone other than the sender grants an extension, or a teacher grants their own | Staff | Only the task's creator can answer; everyone else, including other administrators, gets 404. A request can be answered only through its own task. |
| Two answers to one request both apply | Sender (two tabs) | One conditional update decides the request and moves the date; a second answer finds it no longer pending and gets 409. |
| Request spam | Assignee | One open request per person per task (a unique index); the reason is length-limited in the database. |
| The workload view becomes a league table of teachers | Management | It exists only on the new-task form, for this week, as a figure beside each name the sender is choosing from. Nothing is stored, sorted, exported or shown to teachers about each other. |
| Extension counts are used against a teacher | Management | There is no per-teacher count or report of requests. The plan's Phase 5 indicator is school-level only. |

Open questions for later sprints:

- The teacher who asks is not notified of the answer, and the sender is not notified of a request (they see a marker on the sent list). Notifications for both would follow held delivery: nothing outside working hours.
- S8 relief suggestions rank teachers by relief already done. Keep the ranking inside the suggestion and never show it as a league table.
- "Committed work as a single total" (plan risk): a task counts in full once its due date falls inside the period checked, and not before. It is deliberate and simple; revisit if teachers say the warnings are wrong.
