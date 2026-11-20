# Phase 5: Bullying reporting (threat model)

The threat model that gate G6 asks for, written on 19 November 2026 **before any Phase 5 code**. Phase 5 itself is not built and must not start until G6 passes. This document does not give legal advice, and nothing in it has been checked by a lawyer.

## State of gate G6

| G6 condition | State |
|--------------|-------|
| Written legal review of the bullying workflow against Act 876 | **Outstanding.** No reviewer named (decision D7). The project owner chose on 19 November 2026 to build Phase 6 instead of starting Phase 5 without it. |
| Threat model for Phase 5 written | Done: this document. The legal review may change it. |
| MFA ready for committee members | Built 18 November 2026 (`features/mfa`): staff can turn on an authenticator app with recovery codes, a school can require it for administrators, an administrator can reset a colleague's. Phase 5 must extend the requirement to the committee role it creates. |

## Scope being modelled

From plan Section 7, Phase 5: a pupil reports bullying (what, when, where, who if they want, still happening, screenshots) to one teacher or the counsellor they choose; witnesses can report and may stay anonymous; the pupil sees received, read or being handled; the teacher may share with the school's committee with the pupil's informed consent; a report nobody opens by the end of the next school day goes to the committee automatically; serious-harm categories go to the committee at once; every view is logged; report content can never be changed or deleted.

## Who is involved

| Who | What they may do |
|-----|------------------|
| Reporting pupil | Write a report, add to it, see its status. Never sees who else read it. |
| Witness pupil | Write a witness report, named or anonymous. |
| Named pupil (alleged) | Nothing. The app never tells them a report exists; any conversation is a human process. |
| Chosen teacher or counsellor | Read reports addressed to them, acknowledge, add notes, share with the committee after recording consent. |
| Committee member (new role) | Read reports shared or escalated to the committee. MFA required. |
| Administrator | Appoints the committee and counsellors. Does **not** read reports by virtue of being administrator. |
| Guardian | Nothing. Guardian sessions never reach this module. |
| Developer or database operator | Should not be able to read report content from a database dump alone (see encryption below). |

## Threat model: Phase 5

| What could go wrong | Who | How the design should prevent it |
|---------------------|-----|----------------------------------|
| The bully, or friends of the bully, learn who reported | Pupil, staff | Only the chosen teacher or counsellor (and the committee once shared or escalated) can open a report; everyone else gets 404, the same as a report that does not exist. Notifications, the audit log, the monthly report and every list outside the module carry no names and no report text. Status is shown only to the reporter. |
| An anonymous witness is identified | Witness | The witness's pupil id is kept in a separate table that only the reporter's own status query reads; handlers see "anonymous witness" and the report's class-free details. Small-school risk (few pupils saw it) is stated on the form so the witness can judge. |
| A staff member who was not chosen reads a report | Teacher, administrator | Deny by default: access is a row in a grants table (chosen handler, committee after share or escalation), never a role alone. Administrators have no implicit access. Refusal tests on every endpoint, including for administrators. |
| A read is denied afterwards ("I never saw it") or reads go unnoticed | Staff | Every view, including each attachment opened, writes a `report_view_log` row in the same transaction as the read. The log is append-only like the report. Pupils see "read", never by whom. |
| A report is changed or deleted to cover something up | Staff, developer | Append-only at three levels: no UPDATE or DELETE path in code; triggers that raise on UPDATE or DELETE of `bullying_reports`, `report_additions`, `report_escalations` and `report_view_log`; the app's database role granted INSERT and SELECT only on those tables. Corrections are new rows that reference the old one. Gate G7 checks that no update or delete path exists. |
| A report is ignored | Handler | Automatic escalation to the committee if not acknowledged by the end of the next school day, by a pg-boss job keyed on the report id (singletonKey) and a conditional insert, so a retry or a crash cannot escalate twice. Uses the school calendar, so weekends, public holidays and term breaks are counted correctly; tested with an injected clock (leave, weekend, public holiday, end of term). |
| The chosen handler is on leave, removed or disabled | Handler | Choosing a handler who is away is refused at submission; if a login is disabled or removed while a report waits, the report escalates at once (same job). |
| A child is in danger now | Pupil | Emergency contacts (999, Talian Kasih 15999) shown before the form and on the confirmation, without needing to submit. **Every number must be verified against the original source, and any contacts the Act or KPM specify added, before release.** Serious-harm categories escalate immediately. The app states plainly that it is not monitored at night. |
| A committee member's or administrator's account is taken over | Staff | MFA required for the committee role and administrators before Phase 5 goes live (built for administrators; extend to the committee role). Committee sessions get a shorter idle limit. |
| A database dump, backup or log reveals report content | Developer, operator | Report text and attachments encrypted at rest with AES-256-GCM under a key held outside the database (same pattern as the MFA secret), so a dump alone shows ciphertext. Report text is never logged; structured logs carry ids only. Backups follow the same retention as the legal review sets. |
| Notifications leak a report | Anyone near a phone | Email and push say only that something in Sapientia needs attention, with no category, names or text, and are held to working hours except for serious-harm escalations (to be confirmed by the legal review). |
| Screenshots hold other children's images, personal data or indecent images of a child | Pupil, staff | Same upload pipeline as Phase 3 (type from bytes, metadata stripped, never public), opened only by those with a grant, every opening logged, never shown as a thumbnail in lists or notifications. How staff must handle indecent images of a child is a **legal question for the reviewer**; until answered, the attachment feature must not ship. |
| A pupil on a shared computer leaves a report visible, or is watched while writing | Pupil | Nothing kept in browser storage (no drafts); a "leave quickly" button that clears the page and goes to the plain sign-in page; pupil sessions keep the Phase 4 idle limit; the status page shows the minimum. |
| A pupil is pressured into showing their report | Pupil | Status shows only received, read or being handled; the text and the handler's notes are not shown back after submission. |
| False or malicious reports, or a pupil flooding the module | Pupil | Rate limit per pupil (a small number per day) without blocking emergency contacts; the named pupil is never told by the app; outcomes are a human process outside the app. |
| A report is shared with the committee without the pupil's consent | Handler | Sharing requires recording consent (who, when, how given) in the same transaction; the consent row is append-only. What counts as informed consent for a child, and when sharing without it is required, is a **legal question for the reviewer**. |
| Named pupils' details leave the module | Anyone | No export, no reports outside the module, no AI (plan Phase 6: never anything from student or bullying records), no foreign keys from other features into report tables. |
| Guardians see a report | Guardian | Guardian sessions are a separate table and cookie; no Phase 5 check accepts them. Whether and how guardians are told is a human decision for the school, guided by the legal review. |

## Questions for the legal reviewer (D7)

These decide parts of the design above and must be answered before Phase 5 starts:

1. What Act 876 and the Ministry's standards require of a school's reporting channel, handling times and committee.
2. Informed consent for a child: who may give it, and when a teacher must share without it.
3. Handling of indecent images of a child received as evidence.
4. Retention: how long reports, view logs and attachments must or may be kept, and who may destroy them.
5. Whether guardians must be told, by whom, and when.
6. Which emergency and helpline contacts must be shown, in which languages.
7. PDPA obligations for this data: legal basis, breach notification (including the 72-hour expectation the plan mentions) and whether a Data Protection Officer is needed.
