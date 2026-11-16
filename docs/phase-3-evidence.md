# Phase 3: Evidence

User stories, acceptance criteria and the threat model for plan Phase 3 (Sprints 9 and 10), written before the code as the plan asks. The stories come from the plan, not from teacher interviews: the Phase 0 interviews and report templates have not been gathered. Gate G4 was passed on 12 November 2026, when the project owner asked for the work to continue into this phase.

## Sprint split

| Sprint | Scope | State |
|--------|-------|-------|
| S9 | Lesson records (one tap, reason when not held, optional e-RPH link); private hours log with an optional shared monthly total | Built 12 November 2026 |
| S10 | Monthly principal report with PDF and Excel export; school-level wellbeing indicators; shared material bank; file uploads (photo on a lesson record, files in the bank); gate G5 | Built 13 November 2026: report, exports, wellbeing indicators (part 1); uploads, lesson photos, material bank (part 2). Gate G5 evidence below; the decision is open |

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

## User stories: Sprint 10, part 1

**S10-1. A monthly report for the principal.** As an administrator, I want one page that sums up a month, so that I can report on the school without collecting figures by hand.

- I choose a month that has started (last month by default). A finished month is counted in full; the current month up to yesterday.
- Lessons: scheduled against held, not held (with the reasons) and not recorded, by subject; relief arranged and recorded as held.
- Tasks: delivered, due in the month (by each assignee's own date) and whether they were done on time, late or not yet; deadlines sent despite a warning; urgent sends with the reason given; requests for more time and their answers.
- The hours totals staff chose to share, by name, in alphabetical order. Never an entry, and never a ranking.

**S10-2. Save it as PDF or Excel.** As an administrator, I want the report as a file, so that I can print it or send it on.

- The PDF and the Excel file say exactly what the page says, in Bahasa Melayu or English.
- Each export is in the audit log: who, which month, which format.

**S10-3. Wellbeing at school level.** As an administrator, I want a few indicators of how stretched staff are, without singling anyone out.

- Average free working time per teacher per working day (working hours less lessons, duties and relief), average estimated task work per teacher, deadlines sent with a warning, and requests for more time.
- Averages only, and withheld when fewer than five people teach, because the average of two or three known people points at them.

## Threat model: Sprint 10, part 1

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| The report becomes a league table of teachers | Management | No figure is per teacher except the shared hours totals, which the teacher chose to share and which are listed by name, not ranked. |
| A small school's "average" describes one person | Management | Wellbeing averages are withheld below five teaching staff. |
| The report leaks private notes | Administrator | The report reads no note from lesson records or the hours log; the only school-wide hours query reads shared totals (tests check both). |
| A file carries a formula that runs when opened | Sender | Text is written to Excel as text, never as a formula. |
| An exported file is passed on without a trace | Administrator | Each export is audited with the month and format. |

## User stories: Sprint 10, part 2

**S10-4. A photo on a lesson record.** As a teacher, I want to add a photo of the board or the pupils' work to a lesson I recorded, so that the record shows what was taught.

- Once a lesson is marked held or not held, I can add one photo, change it, or remove it, while the record is still open (30 days).
- The photo is seen by the same people as the record: me, and the class's own teacher when I covered it. Not administrators, not colleagues.
- The page shrinks the photo and removes its location data before sending it; the server removes metadata again.

**S10-5. A shared material bank.** As a teacher, I want to share and find teaching materials by subject, year or form, and topic, so that colleagues do not each make the same worksheet.

- I share a link (preferred: DELIMa content is linked, not copied) or a file: PDF, Word, Excel, PowerPoint, JPEG or PNG, up to 10 MB.
- Everyone on the school's staff can search and filter the bank and open what is in it. No other school can.
- I can remove what I shared; an administrator can remove anything.

**S10-6. Uploads are safe to keep and to open.** As the school, we want uploaded files to be what they claim, stored where only the app can reach them.

- The kind of file is decided from its bytes. A program or web page named `.pdf` is refused.
- Files are kept outside the web root under random names and served only after a check of who is asking; anything but a picture downloads rather than opens in the site.

## Threat model: Sprint 10, part 2

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| A phone photo reveals where a teacher was, or when | Anyone who sees the photo | The page redraws photos; the server strips EXIF, comments and PNG text chunks again (tested with a GPS marker). |
| A photo shows pupils' faces (children's data, before Phase 4's safeguards) | Teacher | The page asks for the board or the work, not faces; photos are seen only by the recorder and the class's teacher, never shared school-wide. To revisit in the Phase 4 threat model. |
| A script or program is uploaded and served as part of the site | Anyone with an account | Kind decided from the bytes (JPEG, PNG, PDF, Office only; HTML and SVG refused); `nosniff`; a sandbox CSP on every file; non-pictures sent as `attachment`. |
| A file is read by someone who should not see it | Colleague, another school | One route serves files, after a check by purpose; every other case is 404 (tested for colleague, administrator, other school, no sign-in). |
| A stored name reaches outside the upload folder | Attacker | Names on disk are random 64-character hex, checked before use; the uploader's name is only offered back in Content-Disposition, cleaned and encoded. |
| Uploads fill the disk | Anyone with an account | Size checked before the body is read; 5 MB for photos, 10 MB for materials, 2 GB per school. |
| A file stays on disk after its record is gone, or a record points to no file | System | Bytes are removed if the database step fails, and after a record is deleted. |

## Gate G5: evidence

The gate asks for two things (plan Section 4). The decision to pass it is the project owner's; this is the evidence.

1. **The monthly report exports to PDF and Excel.** `GET /api/reports/monthly/export` returns both, in Bahasa Melayu or English (integration tests check type, file name and the audit entry). A Playwright journey downloads both from the report page on desktop and phone. A sample of each was opened: the PDF rendered on three A4 pages; Excel opened the workbook without repair, counts as numbers and text never as formulas.
2. **The private hours log is provably unreadable by anyone but its owner.** Three independent checks: (a) every hours endpoint is under `/api/me/hours` and takes the owner from the session, with refusal tests for a colleague, an administrator and another school; (b) a source test fails if any file but the hours repository names the log's tables, or if any statement there skips the owner filter, the only exception being the report's read of totals people chose to share, which never touches the log; (c) the report's own tests show a note from an entry never appears in it.

Not covered by the gate, and still open: Phase 0 interviews (G0), so the report layout, the lesson reasons and the minimum group of five are unchecked with teachers.

## Open questions

- Phase 0 has not been done: the record reasons and the 30-day window are judgements to check with teachers.
- A lesson not recorded in 30 days stays unrecorded. The monthly report will count it as "not recorded".
- A teacher absent with no relief arranged has no one to record their periods.
