# Phase 3: Evidence

User stories, acceptance criteria and the threat model for plan Phase 3 (Sprints 9 and 10), written before the code as the plan asks. The stories come from the plan, not from teacher interviews: the Phase 0 interviews and report templates have not been gathered. Gate G4 was passed on 12 November 2026, when the project owner asked for the work to continue into this phase.

## Sprint split

| Sprint | Scope | State |
|--------|-------|-------|
| S9 | Lesson records (one tap, reason when not held, optional e-RPH link); private hours log with an optional shared monthly total | Built 12 November 2026 |
| S10 | Monthly principal report with PDF and Excel export; school-level wellbeing indicators; shared material bank; file uploads (photo on a lesson record, files in the bank); gate G5 | Not started |

No blank report templates were obtained in Phase 0, so the monthly report in Sprint 10 uses a generic format (plan Section 12, item 6). The README will say so.

## User stories: Sprint 9

**S9-1. Record a lesson in one tap.** As a teacher, I want to mark each period on my timetable as held or not held, so that the school has a record without my writing a report.

- Given a period on my timetable that has started today, or one on an earlier working day in the last 30 days, when I tap "Held", then it is recorded as held.
- When I tap "Not held", then I choose a reason (official duty, leave, school programme, pupils away, examination, other) and may add a short note. A period cannot be "not held" without a reason.
- I may add a link to my e-RPH (lesson plan) entry; it must be an https address. Sapientia links to e-RPH and does not rebuild it.
- I can change a record later in that window. A period in the future, on a holiday, or more than 30 days ago cannot be recorded.

**S9-2. Relief teachers record the class they covered.** As a relief teacher, I want the class I covered to appear in my lesson records, so that the record shows who taught it.

- Given relief I cover on a date, and I have been told of it, then that period is in my list for that date and I record it as for my own.
- The absent teacher sees their own period as covered by me, and cannot record it.
- Nobody else can record or read a lesson record of mine except through the monthly report (Sprint 10).

**S9-3. A private hours log.** As a teacher, I want to note the hours I work outside school hours, privately, so that I can see my own workload over a month.

- I add an entry: a date (today or earlier, up to a year back), hours and minutes (up to 24 hours), a kind of work (marking, preparation, administration, meetings, other) and an optional note.
- I see my entries for a month, newest first, with the month's total, and I can delete an entry.
- No one else can see, count or delete my entries: not a colleague, not an administrator, not another school. Not even the audit log records them.

**S9-4. Share a monthly total, never the entries.** As a teacher, I want to choose to share my total for a month, so that the school can see the hours behind the work if I want it to.

- When I share a month, the total at that moment is kept as what I shared. Later entries do not change it until I share again; the page tells me when my total has changed since.
- I can withdraw a shared total at any time.
- Only the total is ever shared. In Sprint 10 the monthly report shows shared totals to administrators, and nothing else from the log.

## Threat model: Sprint 9

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| Lesson records become attendance surveillance of teachers | Management | A record is one tap per period, made by the teacher. Nothing measures when or how fast they tap, and there is no "last online", time-in-app or location (plan hard rule). A missing record is shown as "not recorded", never as absence. |
| A teacher records, or reads, someone else's lesson | Colleague | Only the period's own teacher can record it, or the relief teacher once relief is arranged and delivered. Anyone else gets 404. |
| A record is back-dated or made for the future to look better | Teacher | The server checks the date: started, not more than 30 days back, a working day, the period's own weekday. Each record and change is in the audit log (who, which period, which date, held or not). |
| An e-RPH link carries a script | Anyone | Only https addresses up to 500 characters are accepted; links open in a new tab with rel="noopener noreferrer". |
| A deleted timetable period takes its history with it | Administrator | A record keeps a copy of the period's time, class, subject and teacher; deleting the period only clears the link to it. |
| The private hours log is read by anyone but its owner | Administrator, colleague, another school | Every query on the log takes the owner's id from the session, never from the request. Only the hours feature's repository touches the table, and a test fails if any other file does. Refusal tests cover every endpoint. Entries are not in the audit log. |
| A shared total is used to compare or rank teachers | Management | Sharing is opt-in per month and can be withdrawn. Sprint 10 shows shared totals beside names only to administrators, in the monthly report, with no ranking. |
| Notes contain personal or health details | Teacher | Notes are optional, limited to 200 characters, and the page says they are private. The log is for the teacher alone. |

## Open questions

- Phase 0 has not been done: the record reasons and the 30-day window are judgements to check with teachers.
- A lesson not recorded in 30 days stays unrecorded. The monthly report will count it as "not recorded".
- A teacher absent with no relief arranged has no one to record their periods.
