---
project: "Trainer Advisor"
version: 1
status: draft
created: 2026-05-21
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 5
  hard_deadline: null
  after_hours_only: true
---

# Trainer Advisor — Product Specification

## Vision & Problem Statement

A solo personal trainer in Poland with roughly twenty active clients already uses Google Calendar to schedule sessions. The trainer creates events, invites the client as an attendee, moves and cancels sessions as life intervenes — and Google Calendar handles all of that perfectly well. What Google Calendar does NOT do is track **attendance** (did the client actually show up?) or aggregate that into a **monthly revenue picture**. Today the trainer covers that gap with a monthly Excel sheet — separate from the calendar, manually populated, painful on mobile, error-prone, and a chore to summarize for each client at month-end. Attendance data lives in a different tool than the schedule, the two drift, and the trainer ends the month uncertain about what was actually performed and what should be charged.

Trainer-facing SaaS (Trainerize, Mindbody, Glofox, FitSW) all want to be the schedule, the marketplace, the workout-plan host — they replace tools the trainer already trusts. The insight here is the opposite: **leave Google Calendar as the schedule, layer a tiny attendance + revenue tool on top of it.** The trainer opens the app on their phone after a session, taps one button to mark "came" or "didn't come" against an event Google Calendar already knows about, and at month-end has a clean per-client summary ready to paste into a message — without ever leaving Google Calendar as the source of truth for who-is-when.

## User & Persona

**Primary persona — the founder-trainer.** The product's first user is the founder: a solo personal trainer in Poland, currently managing ~20 active clients (plus inactive history) using Google Calendar as their schedule and a monthly Excel sheet for attendance + revenue tracking. The trainer also runs a parallel physio / massage / therapy service line (parked out of MVP scope). They reach for the tool at two distinct moments:

- **Right after a session** — to tap "came" or "didn't come" on today's session list (the list itself was pulled from Google Calendar, so no one had to type anything). This is the most critical entry point because every miss here propagates into a wrong month-end revenue total.
- **At month-end** — to open the dashboard for the closing month and copy each client a ready-to-paste Polish summary message ("in May we had 8 sessions, you attended 6, owed: 720 PLN").

Two adjacent moments are intentionally out of scope: (1) "week-start planning" — Google Calendar already provides the week view, and the app does not duplicate it; (2) "client asks for their balance" — clients are message recipients, not app users.

### Secondary persona

*Post-MVP, informational only.* Other solo personal trainers facing the same Excel-and-calendar drift. The MVP serves only the founder; multi-trainer / subcontractor scenarios are out of scope for v1 and revisited after the founder use case is proven.

## Success Criteria

### Primary

- **Excel replacement (the proof outcome).** Within the first full calendar month of use after launch, the trainer marks ≥ 95% of GCal-sourced sessions in the app — not after-the-fact in the Excel sheet. Falling back to Excel for attendance means the app failed at its core job.
- **Month-end "no math needed" outcome.** At month-end, the trainer can open the dashboard for the closing month and produce the per-client copy-paste summary for every active client in under 5 minutes total, without cross-checking against any other source. If they still feel the need to verify against Excel or count events in Google Calendar manually, the dashboard hasn't earned their trust.

### Secondary

- The month-end dashboard's per-client summary text is good enough to copy-paste straight into a client message (WhatsApp / SMS / email) with zero rewording. If the trainer regularly re-edits the copy, the dashboard's text format failed its secondary job.
- The Google Calendar sync stays invisible 95% of the time — events show up in the daily view, moves and deletions update without manual intervention, and the trainer never thinks "is this synced?". A sync layer that calls attention to itself (errors, stale state, manual refresh buttons used often) is one that needs work.

### Guardrails

- **Data durability for attendance.** An attendance mark (came / didn't come) once recorded must persist across logout, app reload, device switch, browser cache clear, week passing, month closing, and — critically — across Google Calendar event mutations. If the trainer marks Adam-on-2026-05-21 as "came", and later Adam moves the event to 2026-05-22, the attendance record must follow the event sensibly (or surface a reconcile prompt, never disappear silently).
- **Mobile-first responsiveness.** Tapping a session in the daily view to mark came / didn't come must complete in ≤ 1 second from tap to confirmed UI feedback. If marking feels slow, the trainer reverts to memory + Excel, the product fails.
- **Single-tenant data isolation.** Even though v1 is single-trainer, the data model and access checks must not foreclose future multi-tenant. Client data and authorization tokens must only be accessible to their owning trainer; design cannot assume "one account = whole database".
- **No silent rate changes.** If the trainer changes a client's rate, sessions that were already attended at the old rate keep their old amounts. Revenue from past months must never silently rewrite when settings change.
- **Authorization-token handling.** The Google authorization refresh token is stored encrypted at rest and never exposed in logs, error messages, or analytics. A leaked token would grant calendar read access to anyone who steals it.

## User Stories

### US-01: Trainer marks attendance immediately after a session ends

- **Given** a trainer who has just finished a session with a client, with their phone in hand, and the app already authenticated (signed in via Google — single sign-on flow per FR-001)
- **When** they open the app — it lands on the daily view (today's Google Calendar events)
- **Then** they see the just-finished session as "unmarked", tap it once to set "came" (green check), and the state is persisted with visible confirmation within 1 second

#### Acceptance Criteria

- The post-session marking flow completes in ≤ 2 taps from app-open (open app → tap event).
- The daily view is the default landing page after sign-in.
- The marked attendance record captures the client's per-session rate at the moment of marking (FR-014).
- Confirmation UI feedback appears within 1 second of the tap.
- If the trainer taps the wrong state (e.g., accidentally marks "didn't come"), one more tap cycles to the correct state (FR-012).
- The flow is fully usable on a phone in portrait orientation without zooming or horizontal scroll.

### US-02: Trainer reconciles the month and sends each client their summary

- **Given** the trainer at month-end with the app open on either phone or laptop
- **When** they navigate to the closing month's dashboard, open a specific client's monthly card, and tap "Copy summary"
- **Then** the hard-coded Polish summary text (FR-017) is placed on their clipboard, ready to paste into WhatsApp / SMS / email

#### Acceptance Criteria

- Summary text matches the FR-017 format exactly.
- "Copy" succeeds with one tap; the clipboard payload is plain text (no markdown).
- After copying, the trainer can navigate to the next client and copy their summary without losing context.
- Grand-total view (FR-016) for the same month is reachable in ≤ 2 taps from any per-client card.
- The dashboard for past months is reachable via month navigation (FR-018), and "Copy summary" works identically on historical months.

### US-03: Trainer signs in for the first time via Google and the daily view starts populating

- **Given** a trainer who has never used the app before
- **When** they land on the marketing page and tap "Zaloguj przez Google", they are taken through Google's standard authorization consent flow (FR-001 + FR-002), granting the app `calendar.events.readonly` scope on their primary calendar
- **Then** on returning to the app, they are signed in (trainer account auto-created on first sign-in) and today's Google Calendar events appear in the daily view within 5 seconds (initial sync)

#### Acceptance Criteria

- "Zaloguj przez Google" is the **single** call-to-action on the marketing landing page and login page — no register form, no email+password fallback, no password-reset link.
- The authorization flow opens in the system browser (not an in-app webview) so Google's anti-phishing protections apply.
- On successful return from authorization, the trainer does not have to manually trigger sync — events appear automatically (initial sync runs as part of the post-login redirect).
- If authorization is cancelled or fails, the app returns to the marketing landing page with the "Zaloguj przez Google" CTA still present; no half-authenticated limbo state.
- Any Google Calendar event whose attendee email matches an existing client record is mapped on first sync (FR-009). First-sign-in's first sync may auto-create client rows from attendee emails — see Open Question 4.

## Functional Requirements

### Authentication & Google connection

- FR-001: Trainer signs in to the app via **Google OAuth** — single sign-on flow. The same authorization grants the app read-only access to their primary Google Calendar (see FR-002). There is no separate email + password layer; the Google identity IS the app identity. The first sign-in creates the trainer's account; subsequent sign-ins re-authenticate. Priority: must-have
  > Socratic: counter-argument considered — "support email + password as a fallback for trainers without Google". Resolution: rejected for v1. The primary persona already uses Google Calendar (entire product is layered on it), so they have a Google account by definition. Forcing two identity options doubles the auth surface for marginal value. Email/password can be added in v2 if a non-Google subcontractor scenario materializes.

- FR-002: The Google OAuth scope requested is `https://www.googleapis.com/auth/calendar.events.readonly` — read-only on the trainer's primary calendar. The app stores only the OAuth refresh token (encrypted at rest via libsodium `crypto_secretbox`), never the trainer's Google password. The OAuth consent screen presents this scope once, at first sign-in. Priority: must-have
  > Socratic: counter-argument considered — "request additional scopes upfront (e.g. profile picture, contacts)". Resolution: rejected. Minimum scope = minimum trust required = faster Google review later. Adding scope = product decision, not implementation detail.

- FR-003: Trainer can revoke the app's Google authorization at any time, either inside the app (a "Sign out & revoke access" action) or via their Google account dashboard (`myaccount.google.com/permissions`). Revocation logs the trainer out and stops new calendar syncs; existing attendance records remain in the database, recoverable when the trainer re-authorizes (their `trainer_id` is preserved across re-auth). Priority: must-have

### Client management

- FR-004: Trainer can add a new client with: a single name field (free text), **required email** (used for matching with Google Calendar events — see FR-009), optional phone, per-session rate (PLN). Priority: must-have
  > Socratic: counter-argument considered — "make email optional (some clients don't share email)". Resolution: email is REQUIRED for v1 because the entire Google-Calendar-to-client mapping uses the attendee email address (FR-009). Without email there is no automatic match. If the trainer wants to track a client who has no email, they will need a placeholder address (e.g., `adam-no-email@trainer-advisor.local`) — recorded as Open Question for UX polish.

- FR-005: Trainer can edit any field on an existing client. Priority: must-have

- FR-006: Trainer can toggle a client's status between active and inactive. Clients are never hard-deleted in v1; deactivation preserves the full attendance history for past months. Priority: must-have
  > Socratic: counter-argument considered — "GDPR/RODO right-to-erasure may legally require hard delete." Resolution: soft-delete only for MVP. Productizing the erasure workflow is post-MVP. See Open Question 1.

- FR-007: Trainer can view the client list filtered by status: active / inactive / all. Priority: must-have

### Google Calendar sync

- FR-008: The app pulls events from the trainer's primary Google Calendar covering at minimum the current month and the previous month. Sync runs automatically on app open and periodically (e.g., every N minutes when the app is foreground), and can be manually refreshed by the trainer. Priority: must-have
  > Socratic: counter-argument considered — "should we sync only the current month?" vs. "should we pull a whole year?". Resolution: current + previous month is the minimum useful window for the month-end reconciliation use case (the trainer at the start of June still needs May's data). Pulling more is fine; pulling less breaks month-end. The exact upper bound is downstream of API rate-limit considerations (Open Question 5).

- FR-009: Each Google Calendar event is mapped to a client by matching attendee email addresses on the event to client email addresses in the app. If no client matches an attendee, the event appears in the daily view as "unknown attendee — [email]" with a one-tap action to add the attendee as a new client (FR-004 pre-filled). Priority: must-have
  > Socratic: counter-argument considered — "match by event title (e.g., 'Adam — Trening')" — rejected as too fragile (typos break matching, multiple Adams ambiguous). Counter-argument considered — "match by both attendee email AND event title for robustness" — rejected as adding complexity without clear gain; email is sufficient when the trainer invites the client as an attendee.

- FR-010: When a Google Calendar event is created, moved (date/time changed), or deleted in Google Calendar, the change is reflected in the app on next sync. Attendance marks attached to that event follow it through moves. For deletions where attendance was already recorded, the attendance record is preserved and flagged as "orphaned" with a UI for the trainer to keep (e.g., the session happened, the calendar event was just cleaned up) or delete. Priority: must-have
  > Socratic: counter-argument considered — "on calendar deletion, silently delete the attendance record" — rejected, loses revenue data without trainer's knowledge. The orphan-flag flow is more complex but safer.

### Daily attendance marking (the core flow)

- FR-011: Trainer can view "today" — a time-ordered list of Google Calendar events for today's date, each showing client name (or "unknown attendee" — see FR-009), event start time, and attendance state (unmarked / came / didn't come). Priority: must-have

- FR-012: Trainer can tap an event in the daily view to cycle its attendance state: unmarked → came (green check) → didn't come (red X) → unmarked. One tap per state change, confirmed visually within 1 second. Priority: must-have
  > Socratic: counter-argument considered — "use two separate buttons (came / didn't come) instead of a cycle" — rejected for MVP because a cycle minimizes the tap target count on a small mobile screen. Counter-argument considered — "track timestamp of the attendance decision for audit" — kept in scope as an implementation detail, not user-visible in v1.

- FR-013: Trainer can navigate the daily view between days (previous / next, jump to date) to mark attendance for past days they missed or check upcoming days. Priority: must-have

- FR-014: When an event is marked "came", the client's current per-session rate is snapshotted onto the attendance record. Later changes to the client's rate do NOT modify amounts on already-marked sessions. Priority: must-have
  > Socratic: counter-arguments considered — "always use current rate" or "month-level snapshot" — both rejected. Per-session snapshot preserves the guardrail "no silent rate changes" from Success Criteria.

### Monthly settlement dashboard

- FR-015: Trainer can view a per-client monthly summary card showing: scheduled (= count of Google Calendar events for this client this month), attended (= came), no-show (= didn't come), unmarked (= attendance decision not yet recorded), revenue (= attended × snapshot rate). All values in PLN. Priority: must-have
  > Socratic: counter-argument considered — "should the card show trend vs. previous month?" — rejected, deferred to v2.

- FR-016: Trainer can view a month-grand-total across all clients with any events that month: total scheduled, total attended, total no-show, total unmarked, total revenue (PLN). Priority: must-have

- FR-017: Trainer can tap "Copy summary" on any per-client monthly card and have a ready-to-send Polish text message placed on their clipboard. The text format is hard-coded in v1 and follows the pattern: `Cześć [name], podsumowanie [month YYYY]: zaplanowanych X, obecnych Y, nieobecnych Z. Do zapłaty za odbyte sesje: KKK PLN.` Priority: must-have
  > Socratic: counter-argument considered — "format should be customizable via template (so trainer can add bank account number, payment link)" — rejected for v1, kept as Open Question 3.

- FR-018: Trainer can navigate between months: current month, any past month with attendance data. Past months remain editable — the trainer can still cycle attendance state on any historic event the Google Calendar sync surfaced. Priority: must-have

## Non-Functional Requirements

- The application is fully usable on a phone in portrait orientation, with no horizontal scrolling and no zoom required to interact with any control or read any number. Tablet and desktop layouts are allowed but not required for v1.
- A trainer's tap on a daily-view event to cycle attendance state (unmarked → came → didn't come → unmarked) produces visible UI confirmation in ≤ 1 second on a mid-range phone over a 4G connection. Slow feedback at this step is a product-fatal regression.
- All user-facing strings — labels, buttons, validation messages, the generated monthly-summary text in FR-017 — are in Polish. No English fallback in the UI in v1. Internal logs, code identifiers, and developer-facing artifacts may remain English.
- A trainer's data (client records, attendance records, authorization tokens) is visible only to the trainer who owns the account. The design must not foreclose future per-tenant isolation even though v1 has one tenant.
- The Google authorization refresh token is stored encrypted at rest and never appears in logs, error messages, analytics events, or any other observable surface. Leakage would expose the trainer's calendar contents to whoever steals the token.
- Money is exclusively PLN in v1. Numbers are formatted with Polish conventions (space-separated thousands, comma decimal — e.g. "1 200,50 zł"). No multi-currency support.
- Time zone is exclusively Europe/Warsaw in v1. All event times read from Google Calendar are converted to Warsaw-local for display; monthly boundaries are "midnight Warsaw time on the last day of the calendar month".
- Google Calendar sync staleness: the daily view never shows calendar data more than 5 minutes stale when the trainer is actively using the app. On-demand manual refresh always pulls fresh data.
- Offline support is explicitly OUT of scope for v1. Marking attendance requires connectivity at the moment of tapping. Initial Google Calendar sync and ongoing refresh both require connectivity.

## Business Logic

**Rule of operation (one sentence):** Trainer Advisor reads each scheduled session from the trainer's Google Calendar, lets the trainer mark each session's attendance (came / didn't come) with one tap on a mobile-first daily view, and automatically aggregates those attendance decisions into a per-client and grand-total monthly revenue picture — eliminating the spread of attendance data between calendar and spreadsheet, and the manual math at month-end.

The rule consumes three user-facing inputs: (1) the **calendar events** on the trainer's primary Google Calendar (each event = one scheduled session, with start time, attendee email identifying the client, and event identity that survives moves), (2) the **per-session rate** for each client as set on the client profile in the app (PLN), and (3) the trainer's **attendance decision** per session — came (green check) or didn't come (red X), tapped after the event occurs.

From those, the rule emits per client and per month: **scheduled count** (= calendar events for that client in that month), **attended count** (= came), **no-show count** (= didn't come), **unmarked count** (= attendance not yet decided), and **revenue** (`attended × snapshot rate`). The trainer encounters these outputs as the per-client monthly summary card (FR-015), the month-grand-total view (FR-016), and the ready-to-paste Polish text summary (FR-017).

Two domain invariants follow from the rule:

- **Rate snapshot per session.** The rate used in revenue calculations is the rate captured at the moment "came" is marked, not the trainer's current rate (FR-014). Raising a client's rate forward does not retroactively rewrite past months' revenue.
- **Attendance follows the event.** If a calendar event moves to a different date/time after attendance was already marked, the attendance decision follows the event (the trainer's "Adam came" doesn't suddenly become "didn't come" because the event moved); if the event is deleted in Google Calendar, the attendance record is preserved and surfaced as orphaned (FR-010), not silently dropped.

The rule explicitly does NOT classify cancellations by their cause (in-regulation vs. out-of-regulation). Attendance is binary: came → billed at snapshot rate; didn't come → not billed. If the trainer wants to charge for no-shows under their cancellation policy, that transaction lives outside the app.

## Access Control

**MVP authentication: trainer only, single layer (Google OAuth).**

The trainer signs in via Google OAuth — a single authorization consent screen that simultaneously creates/restores their trainer account AND grants the app `calendar.events.readonly` scope on their primary Google Calendar. The app stores only the OAuth refresh token (encrypted at rest via libsodium `crypto_secretbox`), never the trainer's Google password. There is no email + password layer, no role split (no admin / no member tiers), no separate "connect Google" step after sign-in — it's all one flow.

**Clients are not users.** Clients are addressable as data subjects — the trainer creates and edits their records, sees them in Google Calendar events as attendees, and pushes them monthly summary messages — but they never log in to the application in v1. No client portal, no per-client login link.

**Implications carried forward:**

- The credential surface is single-tier: Google OAuth refresh token (compromise exposes calendar read access + app account access). Sensitive but blast radius is one tenant. 2FA is Google's responsibility — handled at sign-in time on Google's side, no app-level 2FA needed (was an open question in the stack decision doc — now resolved by Google-only auth).
- No password reset flow in the app — Google handles forgotten-password / account-recovery on their side.
- If the trainer revokes the Google authorization grant (via the app's "Sign out & revoke" action OR Google's account dashboard), the next request invalidates the session and they're logged out. Existing attendance records remain in the database — recoverable on next sign-in (the same Google account = same `trainer_id` per Google's stable user ID claim).
- The eventual multi-trainer / subcontractor extension will require a richer access model. Each trainer would sign in with their own Google account; data isolation is per-trainer via `trainer_id` discipline. This is post-MVP; the v1 design does not box itself out of that future.
- If a future scenario requires a trainer without a Google account (e.g. corporate Microsoft-only environment, GDPR-conscious user wanting non-Google identity), email + password can be added as a SECOND identity provider in v2 — Better Auth supports both simultaneously. v1 explicitly excludes this.

## Non-Goals

Items locked across discovery as explicitly NOT in MVP. Each has a one-line rationale so a future "we should add this" impulse can be checked against the original reasoning.

### Functional non-goals (scope avoids)

- **No native scheduler / calendar UI.** The trainer plans in Google Calendar; the app reads calendar events but does NOT provide its own calendar view for creating, moving, or deleting events. Schedule mutations are a Google Calendar responsibility, full stop.
- **No write-back to Google Calendar.** The authorization scope requested is read-only. The app never creates, updates, or deletes calendar events.
- **No calendar sources other than Google Calendar.** No Outlook, no iCloud, no CalDAV. Google Calendar only in v1.
- **No multiple-calendar support per trainer.** Only the trainer's primary Google Calendar is pulled in v1. A trainer who keeps "personal" and "work" calendars must ensure sessions go on the primary one.
- **No regulamin-based cancellation classification.** Attendance is binary (came / didn't come). The Polish O1/O2 cancellation distinction is intentionally NOT in the app. If the trainer wants to charge for no-shows, they do it outside the app.
- **No automatic message sending to clients.** Monthly summary text is generated and copied to clipboard; trainer pastes manually into WhatsApp / SMS / email. Integrating a messaging channel is deferred to v2.
- **No subcontractor / sub-trainer module.** v1 is single-trainer only. The "I outsource clients to another trainer who logs in and uses the same database for those clients" scenario is a multi-tenant feature with role delegation — explicit v2.
- **No physio / massage / therapy service lines.** The trainer's parallel service lines visible in the legacy spreadsheet are out of v1. They do not have the same cancellation logic and would add a separate billing model. Deferred to v2 as a lighter "count + revenue" tracker.
- **No package billing.** v1 supports per-session rate only. Package billing ("client buys 10 sessions for 1100 PLN, draw from balance, alert when exhausted") is a different financial model and post-MVP.
- **No client portal.** Clients never log in. The "client checks their balance / history online" flow is replaced by trainer-pushed monthly summaries.
- **No multi-trainer / multi-tenant SaaS in v1.** Architecture must not foreclose it, but no UI, no signup flow, no per-trainer isolation is built in v1.
- **No past-month auto-lock.** Trainer can edit historical sessions indefinitely; accounting-style month closure is post-MVP. Reconsider when multi-trainer is on the table.
- **No trend comparison ("X% vs last month").** Monthly summary shows the current month only; comparisons are v2.
- **No template customization for the monthly-summary text.** Format is hard-coded in v1 (FR-017). Customizable templates ({client_name}, {bank_account}, payment links) are v2.
- **No right-to-erasure workflow in the UI.** Erasure requests are handled by direct database operation in v1; productizing the workflow is v2. See Open Question 1.
- **No payment processing.** The app tracks what a client OWES, never charges them. No card-on-file, no payment-gateway integration. Payment happens outside the app (bank transfer, cash, whatever the trainer already uses).
- **No invoicing or government tax-system integration.** Trainer continues using their existing accounting tool. The app feeds them the monthly numbers; it does not replace them.
- **No marketplace.** The app is a trainer-internal tool. "Clients searching for trainers" is a different product category (B2C platform) and explicitly off-table.

### Non-functional non-goals (quality avoids)

- **No offline-first guarantee.** Marking requires connectivity. Buffering + sync + conflict resolution is a substantial investment for a minor convenience win in v1.
- **No behavioral analytics / ML / recommendations.** The app is a counter and a communicator, not an advisor. No churn prediction, no dynamic pricing suggestions, no AI-driven anything. Removing this entire dimension keeps the app legible and trustworthy.

## Open Questions

Items deferred to later resolution but explicitly named so they don't get lost.

1. **GDPR / RODO right-to-erasure workflow.** The MVP design carries soft-delete only (FR-006). When a client formally requests data erasure under RODO Art. 17, the trainer must currently handle it via direct database operation. Open: should v1.x add a "danger zone — hard delete + cascade" UI workflow before the user receives an actual erasure request? Owner: user (legal consult). Resolution by: before MVP is used with any client other than the founder's own list.

2. **Multi-tenant readiness in v1 data model.** The Access Control implications carry that v1 must not foreclose multi-trainer. Open: should the data model already partition every table by `trainer_id` even though v1 has one trainer (cheap insurance), or stay single-tenant and migrate later (riskier but simpler)? Owner: downstream tech-stack-selection step.

3. **Polish bank account number / payment link in monthly summary.** FR-017 hard-codes a Polish text format without payment instructions. Some trainers include their bank account number directly in the message; some send a separate payment request. Open: should the summary text in v1 include a static bank-account line read from the trainer's profile? Owner: user. Resolution by: end of MVP build.

4. **Client without an email — placeholder UX.** FR-004 requires email because Google Calendar matching uses attendee email (FR-009). For a client who doesn't share an email, the trainer would need a placeholder address (e.g., `adam-no-email@trainer-advisor.local`). Open: should the app generate this placeholder automatically when the trainer leaves email blank, or is it OK to insist that email is required and let trainer manage placeholders themselves? Owner: user. Resolution by: end of MVP build.

5. **Sync cadence and refresh strategy.** FR-008 says "automatically on app open and periodically", and the NFR caps user-observable staleness at 5 minutes. The actual implementation mechanism is downstream of tech-stack-selection. Open: which sync strategy meets the 5-minute freshness NFR without burning Google Calendar API quota? Owner: tech-stack-selection step.

6. **Google Calendar API rate-limit handling.** Google Calendar API has per-user-per-second and daily quotas. For a single trainer with ~20 active clients and ~150 events / month, this is well below limits — but the multi-tenant future opens up quota questions. Open: should we plan for delegated tokens (one authorization client across all trainers) or each trainer authorizing their own? Owner: tech-stack-selection step.

7. **Recurring Google Calendar events.** Google Calendar supports recurring events ("every Mon and Thu 18:00 with Adam, until end of year"). Each instance has its own event-id but inherits the master event's attendees. Open: does the app treat each instance independently for attendance (likely yes), and how does it handle modifications to a single instance vs. the whole series? Owner: tech-stack-selection step + UX validation with the user during build.
