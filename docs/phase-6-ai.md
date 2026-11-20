# Phase 6: AI and open standards

Stories, design choices and the threat model for plan Phase 6, built on 19 November 2026. The project owner chose to build Phase 6 while Phase 5 (bullying reporting) waits for the written legal review that gate G6 needs; Phase 6 never touches pupil, guardian or bullying records, so it does not depend on that review. Like every phase so far, the stories come from the plan, not from teacher interviews (Phase 0 has not been done).

## Conditions for this phase

- **Fictional data only**, as in every phase.
- **Every AI feature can be switched off without breaking anything** (plan). The language model is off unless `AI_PROVIDER` and `OLLAMA_MODEL` are set; the MCP server is off unless `MCP_SERVER=on`; the WebMCP experiment is off unless `NEXT_PUBLIC_WEBMCP=on` at build time. Duplicate warnings and the weekly digest need no language model at all.
- **Send task text only, never names, and never anything from student or bullying records** (plan).
- **AI output is untrusted, and a person always confirms** (plan).

## Parts

| Part | Scope | Commit |
|------|-------|--------|
| 1 | One switchable LLM client (`shared/server/llm`), redaction, instruction to task, duplicate warnings | d8c4455 |
| 2 | The Monday-morning weekly digest | 555edb7 |
| 3 | The read-only MCP server with personal access tokens; the WebMCP experiment | 444aef5 |

One migration holds all three: `1795079632599_ai-and-open-standards.sql` (`ai_requests`, `users.weekly_digest`, `digest_sends`, `api_tokens`).

## User stories

**P6-1 Instruction to task.** As a sender, I paste an instruction (a message from a meeting, say) and the form fills itself, so I only check it, choose the people and send.
- The panel appears on the new-task form only when AI is on, folded away by default.
- Before anything leaves the server, every name the school holds (staff, pupils, guardians, and each distinctive part of those names), emails, phone numbers and MyKad-like numbers are replaced by `[nama]`, `[emel]` or `[nombor]`. The screen says how many were removed and asks people not to type other personal details.
- The model gets today's date and a three-week calendar in the school's time zone, so "Khamis depan" is read off a list.
- The answer must be a JSON object whose title passes the task title rule; every other field must pass the same Zod rule as `POST /api/tasks` (and a date must fall between today and a year ahead). A field that fails is left out and named, never repaired. Nothing is saved and nothing is sent: the person presses Send on the normal form.
- 20 requests per person per hour, failures included. Each request is counted in `ai_requests` (who, when, outcome), never its text.
- Only Ollama is supported, so instructions stay on a machine the school runs. A hosted provider can be added behind the same `LlmClient` interface, but would need its own data-protection review first.

**P6-2 Duplicate warning.** As a sender, I am told when a task like the one I am writing is still open, so the same people do not get it twice.
- Checked as the title is typed (after a pause), against open tasks from the last 30 days that I sent or that someone I have chosen already has. Word overlap and letter-triple similarity, no language model.
- Up to three are shown with the title, who sent it, the due date and how many of the chosen people already have it. My own tasks link to the task; another sender's do not, because I cannot open it.
- It warns and never blocks.

**P6-3 Weekly digest.** As a member of staff, I get one email on the first working morning of each week listing my own work, so I can plan the week.
- Overdue tasks, tasks due this week (each by my own due date after any extension), relief classes already delivered to me, and requests for more time waiting for my answer. Lists stop at 10 with "and n more".
- Sent from the start of working hours on the school's first working day of the week (Tuesday after a Monday holiday); not made up later in the week if the worker missed that day.
- Nothing is sent when there is nothing to say. Each person's week is recorded once, so it is never sent twice; a temporary email failure is retried by the next sweep (every 15 minutes).
- Each person turns it on or off on the Notifications page; on by default, independent of task emails.
- Only my own work: never anyone else's load. No language model is involved.

**P6-4 MCP server.** As a member of staff, I let an AI assistant read my tasks and relief classes, so I can ask it about my week.
- `/api/mcp` speaks MCP over Streamable HTTP (stateless, JSON answers). Four read-only tools: `list_my_tasks`, `get_task`, `list_sent_tasks`, `list_my_relief`. Each calls the same service as the matching page, acting as me, so it sees exactly what I see.
- I sign it in with a personal access token made on the Security page: I name it, type my password again, and see the token once. Tokens last 90 days, at most 5 at a time, and I can revoke one at once. Only a SHA-256 of a token is stored. Making and revoking are audited with ids.
- Whatever signs me out everywhere also revokes my tokens: a password set from a new invite, my account disabled or removed, or my two-step sign-in reset by an administrator.

**P6-5 WebMCP experiment.** Behind a build-time flag, a browser that offers `navigator.modelContext` gets two read-only tools (my tasks, my relief) while I have the app open. The browser API is still a draft, so the code checks every member before use.

## Threat model: Phase 6

| What could go wrong | Who | How the design prevents it |
|---------------------|-----|----------------------------|
| Names or children's data reach a model provider | Sender, developer | Only Ollama, on a machine the school runs. Every name the school holds and common identifiers are removed before sending; nothing from pupil, guardian, homework or bullying tables is ever sent (the names are read only to remove them). The screen asks people not to type other personal details. |
| The model's answer is wrong, or crafted by text in the instruction ("prompt injection") | Sender | The answer is untrusted: it must pass the task rules field by field, failing fields are dropped, and it only fills a form. The model has no tools and nothing is saved or sent without a person pressing Send. The system prompt fences the instruction and says it is data. |
| One account ties up the shared model | Anyone with sender rights | 20 requests per person per hour; a timeout on every request (1 to 120 seconds, default 20); one retry only for an unreachable model. |
| Instructions or answers end up in logs | Developer, operator | Neither is logged or stored; `ai_requests` holds who, when and outcome only. |
| The duplicate warning leaks other senders' work | Sender | Only tasks sent by the caller, or already given to someone the caller has chosen, are compared; the answer has the title, sender, due date and a count, with no link to a task the caller cannot open. A held task can be listed to another sender who chooses the same person before it is delivered: accepted, because the warning exists to stop that person getting the same work twice. |
| The digest reveals someone else's load | Staff | Each email is built from the recipient's own assignments, relief and requests only. |
| The digest is sent twice or at night | Staff | `digest_sends` has one row per person per week (primary key); sends start at the school's working-hours start on its first working day. |
| A leaked access token exposes a teacher's work | Anyone holding the token | Read-only tools, the owner's own access only, no pupil or guardian data; 90-day expiry; revocable at once; revoked with every session when a password is set from an invite, the account is disabled or removed, or two-step sign-in is reset. Tokens start with `sap_` so secret scanners and people recognise them. Only the SHA-256 is stored. |
| A web page uses a signed-in browser to reach the MCP server (CSRF, DNS rebinding) | Any website | `/api/mcp` ignores cookies entirely (bearer token only) and refuses any browser `Origin` other than the app's own. |
| A token is made from an unattended signed-in screen | Someone at the teacher's desk | Making a token asks for the password again (counted against the sign-in throttle). |
| A token bypasses two-step sign-in | Token holder | Accepted, with limits: the token is read-only and is made only after a password check inside a session that already passed two-step sign-in; administrators who must set up two-step sign-in first are refused by the MCP server too. |
| The WebMCP experiment exposes data to an agent the teacher did not choose | Browser agent | Off unless built with the flag; read-only tools calling the same API as the page; the browser decides which agents may call them. |
| The MCP SDK brings vulnerable dependencies | Developer | `@modelcontextprotocol/sdk` 1.32.2 pinned (released 23 October 2026), lockfile committed, `npm audit` clean on 19 November 2026, audit in CI. |

## Phase 6 review (19 November 2026)

| Plan item | State |
|-----------|-------|
| One LLM client with one `complete()` function; Ollama locally; provider by configuration; switchable | Done (`shared/server/llm/llm-client.service.ts`; TypeScript, not `lib/llmClient.js`, to match the app) |
| Instruction to task, validated with the task schema; a person confirms | Done |
| Duplicate detection | Done, without a language model |
| Monday-morning weekly digest | Done, without a language model |
| MCP server: read-only tools acting strictly as the signed-in user | Done, with personal access tokens |
| WebMCP behind a feature flag | Done as an experiment; not tested in a browser that has `navigator.modelContext` (none was available) |
| Send task text only; never names or student or bullying records | Done (redaction; no pupil data reachable from any Phase 6 path) |

Verified on 19 November 2026: typecheck, lint, unit tests, integration tests (task drafts, similar tasks, digest, MCP), Playwright journeys for the duplicate warning and the access-token flow on desktop and phone with an accessibility scan. Not verified: a real Ollama model (none installed on the development PC), so the prompt's quality with a real model is untested; a real MCP client such as Claude Desktop against `/api/mcp`.

## Open questions

1. Which Ollama model gives good drafts in Bahasa Melayu on school hardware? Try a few with real (fictional) instructions before switching AI on anywhere.
2. Should the weekly digest also go by push? It is email only for now, as push has room for one line.
3. Should administrators be able to see or revoke staff access tokens (for example when a laptop is lost)? Today only the owner can revoke one; disabling the account ends them all.
