# Phase 2: Capacity (Sprints 6 to 8)

Written 11 November 2026, before Sprint 6, as the plan requires for every phase (Section 7): user stories with acceptance criteria, and a short threat model. All people and schools in tests and seeds are fictional.

These stories were written from the plan, not from the Phase 0 teacher interviews. If the interviews said something different about deadlines, extensions or relief, revise the stories first.

## Sprint split

| Sprint | Scope | Status |
|--------|-------|--------|
| S6 | Subjects, classes, task types; weekly timetable; free-time and feasibility rules; `POST /api/tasks/feasibility`; warning on the create form; flagged-deadline marker | Built 11 November 2026 |
| S7 | Extension requests (teacher asks, sender approves or proposes a date, recorded on the task); workload view when assigning | Built 12 November 2026 |
| S8 | Relief assignments and suggestions; optional completion question; gate G4 review | Built 12 November 2026; the gate decision is open |

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

## User stories: Sprint 8

**S8-1. Suggest relief.** As an administrator, I want a short list of teachers who could cover an absent colleague's class, so that I can arrange relief quickly and share it fairly.

- Given a period on a teacher's timetable and a date, when I ask for suggestions, then I see at most three members of staff who are free in that period: no lesson or duty of their own, no other relief then, and not away themselves that day.
- They are ordered by fewest relief classes this month, then least estimated work due that week; each shows those two figures.
- Only staff with a timetable are suggested. The absent teacher is never suggested.
- Given the date is in the past, not that period's weekday, not a working day, or the period is already over, then nothing is suggested and the screen says why.
- Given nobody is free, then the screen says so.

**S8-2. A person decides.** As an administrator, I want to choose the relief teacher myself, so that the system informs the decision and does not make it.

- When I choose someone who is free, then the period is theirs for that date. Nothing is assigned without my choosing.
- A period has one relief teacher, and a teacher cannot cover two classes at the same time; the database refuses both even if two administrators act at once.
- I can cancel a relief, and the period can then be given to someone else. Both are in the audit log.

**S8-3. Relief follows held delivery.** As a teacher, I want to learn of a relief class during working hours only, so that my evening is not interrupted by tomorrow's cover.

- Given relief is arranged inside working hours, then I see it at once under "My relief classes".
- Given it is arranged outside working hours, then it does not exist for me until the next working start; the administrator sees when I will be told.
- A relief class counts as teaching time on its date in the deadline check, for me only.

**S8-4. Completion question.** As a teacher, I want to say roughly how long a finished task took, if I choose to, so that the estimates get better.

- Given a task of mine is done, then I may choose under 1 hour, 1 to 3 hours, or over 3 hours. I may skip it, change it, or take it back. Reopening the task removes the answer.
- My answer is never shown beside my name: not to the sender, not to an administrator.

**S8-5. Estimates improve.** As an administrator, I want to see how the answers compare with each task type's estimate, so that I can correct estimates that are wrong.

- Given a task type has answers from at least three people, then I see the count in each band beside its estimate, and whether most answers were longer, shorter, in line, or mixed.
- Given fewer than three answers, then nothing is shown for that type.

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

Added for Sprint 8 (relief and the completion question):

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| Relief suggestions become a league table of who does least | Management | Only the top three for one period are returned, and only to an administrator arranging that period. There is no list of all staff by relief count, no report, and nothing is stored about who was suggested. |
| The suggestion is treated as the decision, and one teacher gets every relief | Administrator | Nothing is assigned until a person chooses. The first ordering rule is fewest relief classes this month, so the list itself pushes towards sharing. |
| Relief reveals who is away and why | Staff | The relief teacher learns only that they cover a named colleague's period. No reason for absence is recorded anywhere; there is no absence register. |
| A relief duty reaches a teacher at night | Administrator | Relief uses the same delivery plan as tasks: arranged outside working hours, it is invisible to the relief teacher until the next working start. There is no urgent override for relief. |
| A teacher is double-booked | Two administrators at once | A unique constraint (one relief per period per date) and an exclusion constraint (one place at a time per relief teacher per date) in the database. |
| The completion question becomes a timesheet, or is used to judge a teacher | Management, sender | It is optional and has three broad bands. An answer is readable only by the person who gave it; everyone else gets counts per task type, and only from three answers up. It is not in the audit log. |
| Cross-school access | Staff of another school | Every query takes the school first; composite foreign keys tie a relief to a period and people of its own school. Refusal tests cover each endpoint. |

Open questions for later sprints:

- Relief has no notification: the teacher sees it on the Relief page once it is delivered. An email or push at delivery time would use the Sprint 5 notification job.
- The relief teacher is not told when a relief is cancelled; it simply leaves their list.
- "Away that day" is inferred from relief already arranged for a teacher's own periods. A teacher who is absent with no relief arranged yet can still be suggested for a colleague's class.
- The teacher who asks is not notified of the answer, and the sender is not notified of a request (they see a marker on the sent list). Notifications for both would follow held delivery: nothing outside working hours.
- The three-answer threshold for task-type feedback is a judgement, not a rule from the plan. Raise it if schools are small enough that three answers still point at people.
- "Committed work as a single total" (plan risk): a task counts in full once its due date falls inside the period checked, and not before. It is deliberate and simple; revisit if teachers say the warnings are wrong.

## Gate G4 review

The plan's condition: "Infeasible deadlines flagged with an earliest realistic date; relief suggestions work; unit tests cover the calculations." Evidence gathered on 12 November 2026, all with fictional data on a development machine:

| Condition | Evidence |
|-----------|----------|
| Infeasible deadlines flagged with an earliest realistic date | `capacity.integration.test.ts` ("feasibility (G4)", "warns but never blocks"); journey `e2e/capacity.spec.ts` (warning, suggested date, flagged badge) |
| Relief suggestions work | `relief.integration.test.ts` ("suggestions (G4)": free in the period, ordering, top three, refusals); journey `e2e/relief.spec.ts` |
| Unit tests cover the calculations | `capacity.service.test.ts` (free time, feasibility, relief time), `relief-ranking.service.test.ts` (overlap, ordering), `time-feedback.test.ts`, `extension-dates.test.ts` |

Not evidence, and still open before calling the gate passed:

- The stories were written from the plan, not from teacher interviews (gate G0). Nothing here has been tried by a teacher or an administrator.
- Nothing is deployed; the phase has only run locally and in the test database.
- The decision to pass the gate is a go or no-go for the project owner, so the plan's checkbox is left unticked.
