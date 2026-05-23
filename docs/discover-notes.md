---
project: "Trainer Advisor"
context_type: greenfield
created: 2026-05-20
updated: 2026-05-21
# Anticipated spec frontmatter (filled progressively as /discover phases lock decisions):
product_type: web-app          # mobile-first responsive web app (locked Phase 6)
target_scale:
  users: small                 # 1 trainer (the founder); maybe 2-3 beta peers
  qps: low                     # tap-driven UI, ~20 sessions/day max
  data_volume: small           # ~20 active clients × ~10 sessions/month each = trivial
timeline_budget:
  mvp_weeks: 5                 # extended from 3 → 5 after GCal pivot (sustained effort acknowledged)
  hard_deadline: null          # no external deadline
  after_hours_only: true       # founder keeps training day-job; build is evenings + weekends
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "Workflow friction + financial leakage. #1 pain: forgotten O2 charges silently erode revenue. Supporting pains: hours/month on hand-written monthly client summaries; Excel on mobile is hostile after a session, pushing attendance entry to the evening where memory errors compound."
    - topic: "product insight (Socratic)"
      decision: "Existing trainer SaaS (Trainerize, Mindbody, Glofox, FitSW) model bookings and payments but DO NOT model the Polish O1/O2 cancellation regulamin. Without that split, actual-vs-owed revenue is uncomputable. The product's reason-to-exist is the O1/O2 distinction baked into the data model."
    - topic: "primary persona scope"
      decision: "MVP serves the founder (single solo trainer, ~20 active clients). Multi-trainer / subcontractor scenarios are post-MVP and informational only at this stage."
    - topic: "highest-cost moments"
      decision: "Three moments matter, in priority order: (1) immediately post-session — marking attendance/O1/O2 before memory fades; (2) month-end — reconciliation + sending each client a monthly summary; (3) week-start — planning which clients are active that week. The 'client asks for their balance mid-month' moment was offered and explicitly NOT picked — so balance-lookup is a lower-priority feature than push-based monthly summaries."
    - topic: "trainer authentication"
      decision: "Email + password. Cloud-stored so the trainer can work from phone and laptop with the same data."
    - topic: "client authentication"
      decision: "Clients do NOT log in to v1. They are data subjects (the trainer manages records on their behalf) and message recipients (they receive monthly summaries pushed to them), but never users. A client portal is explicitly out of MVP scope."
    - topic: "MVP scope (Phase 3)"
      decision: "Option A: Clients (CRUD + rate/package) + Attendance marking (done / O1 / O2) + Month-end dashboard (per-client planned/done/O1/O2/revenue/loss). NO automatic message sending — trainer copy-pastes from dashboard for v1. NO calendar/scheduler — trainer plans externally or via active-clients list. The smallest end-to-end flow that directly resolves Pain #1 (forgotten O2 revenue leakage)."
    - topic: "MVP timeline budget"
      decision: "≤3 weeks of after-hours work. Aligned with the natural greenfield momentum window and the locked smallest-scope MVP (Option A). Longer timelines would have required explicit sustained-effort acknowledgment, which was offered and not selected."
    - topic: "billing model (Phase 4)"
      decision: "Per-session rate only in MVP. Each client has one per-session rate (e.g., 120 PLN/session). 'Done' or 'O2' sessions accrue at that rate. Package billing ('client buys 10 sessions for 1100 PLN, draw from balance') is explicitly post-MVP — captured as a future feature, not built."
    - topic: "service lines in MVP (Phase 4)"
      decision: "Personal training only in MVP. The physio / massage / therapy lines visible in the user's current Excel sheet have a different (simpler) tracking model — no O1/O2 logic — and they are not the source of Pain #1. They are deferred to v2 with a 'lighter tracking' model (count + revenue, no cancellation classification)."
    - topic: "planned-sessions data source (Phase 4)"
      decision: "Each client has a 'planned-sessions-per-month' field on their profile (a number). The monthly dashboard compares planned vs done. The trainer can adjust the planned-count per client when the commitment changes. Calendar/scheduler-based planning was rejected as inconsistent with the Option-A scope lock."
    - topic: "session-state cardinality (Phase 4.5 Socratic)"
      decision: "3 states only: done / O1 / O2. No 4th 'no-show' state — financially identical to O2."
    - topic: "rate snapshot semantics (Phase 4.5 Socratic)"
      decision: "Per-session snapshot. Rate captured at the moment of session recording, frozen on that session record. Phase-3 'no silent rate changes' guardrail requires it."
    - topic: "past-month editability (Phase 4.5 Socratic)"
      decision: "Past months remain editable indefinitely in v1. No accounting-style auto-lock. Reconsider in v2 with multi-trainer scope."
    - topic: "week-planning view (Phase 4.5 Socratic)"
      decision: "Kept as separate FR-013. Monthly dashboard is too heavy for a Monday-morning glance; week view is a lightweight active-clients-with-progress surface."
    - topic: "business rule wording (Phase 5)"
      decision: "Option A: 'Aplikacja klasyfikuje każdą sesję trenera jako odbytą, O1 lub O2 zgodnie z polskim regulaminem, i automatycznie wylicza target, przychód i stratę za miesiąc — eliminując ręczne liczenie i zapomniane opłaty.' Locked as the product's reason-to-exist."
    - topic: "NFRs in MVP (Phase 5)"
      decision: "Three picked: (1) mobile portrait, no horizontal scroll/zoom; (2) session-marking tap-to-feedback ≤ 1s; (3) Polish UI mandatory. Offline-first was explicitly offered and DECLINED — marking requires connectivity in v1. PLN currency and Europe/Warsaw timezone follow as inferred consequences of Polish UI."

    # === POST-PHASE-7 PIVOT (2026-05-21) ===
    # User redirected MVP shape: daily list of sessions from Google Calendar, tap green/red for attendance.
    # Four follow-up decisions:
    - topic: "PIVOT: source of session data"
      decision: "Sessions are NOT entered manually. The trainer's Google Calendar is the source of truth for the schedule. The app pulls events and uses them as the session list. Trainers create / move / delete sessions in GCal, not in the app."
    - topic: "PIVOT: O1/O2 cancellation distinction (DROPPED)"
      decision: "User explicitly dropped the O1/O2 classification — against the Recommended option, with full awareness. New model: attendance is binary (came / didn't come). No-show is NOT charged. This OVERRIDES the original Phase-1 'Polish regulamin O1/O2' insight and reframes Pain #1. Trainer accepts that no-show billing is handled outside the app, if at all."
    - topic: "PIVOT: sync direction"
      decision: "GCal → app, one-way only. App reads GCal events; app NEVER writes back to GCal. All scheduling changes happen in GCal."
    - topic: "PIVOT: client-event mapping"
      decision: "Each client has a profile in the app (name, email, rate). GCal events are mapped to clients via the attendee email address on the event. Events with no matching client are flagged for the trainer to resolve (e.g., 'add new client'). Stronger than name-matching, requires trainer to invite the client as an attendee in GCal events."
    - topic: "PIVOT: timeline budget extension"
      decision: "mvp_weeks 3 → 5. User explicitly accepted the sustained-effort cost of the 5-week budget after seeing that GCal OAuth + sync logic adds ~1-2 weeks over the original Option A. See ## Timeline acknowledgment block below."
  frs_drafted: 18                # rewritten post-pivot 2026-05-21 (was 13 pre-pivot)
  quality_check_status: accepted
---

# Discover Notes — Trainer Advisor

## Seed material (from docs/reference/)

Two source documents were provided by the user:

1. **`Aplikacja w zawodzie trenera personalneg1.docx`** — feature wishlist for the app
2. **`TABELKA ROZLICZENIOWA 2026.docx`** — the user's current Excel-based monthly settlement table (the artifact the app is meant to replace)

### Extracted feature scope (raw, unvalidated)

- **Client database**: name, email, phone, per-session rate or package type (e.g. 10-training package), active/inactive status (color-coded).
- **Settlement engine** per client, per week/month:
  - Z (planned) trainings × rate = target revenue
  - P (performed) trainings = actual revenue
  - Cancellations split into two classes:
    - **O1** — cancelled per regulations (timely notice) → no charge
    - **O2** — cancelled NOT per regulations (no/late notice) → charged as performed
- **Monthly summary** (optionally weekly): planned vs performed vs cancelled, in counts + amounts + percentages; financial loss from O1+O2.
- **Mobile calendar / scheduler** for session bookings.
- **Client communicator**: multi-select clients, send messages (esp. monthly summary), tick attendance/cancellation → auto-updates monthly totals.
- **Subcontractor module** (advanced version, NOT MVP): same mechanism for trainers the user subcontracts work to.
- **Second service line**: physio / massage / therapy (visible in the spreadsheet as a parallel section to trainings).

### Current workaround (from TABELKA file)
Manual monthly Excel sheet listing ~20 active clients with columns for rate, payment (+/−), trainings (planned/performed/not-performed), monthly financials (target/revenue/loss), plus separate physio/massage/therapy section.

---

## Pivot Log

### Pivot 1 (2026-05-21) — GCal-driven daily view + drop O1/O2

After Phase 7 closed, the user redirected the MVP shape:

- **Source of truth for the schedule = Google Calendar**, not the app. The trainer continues creating / moving / deleting sessions in GCal. The app reads GCal events.
- **Main view = today's session list from GCal**, with a tap target per session: green check (came) or red X (didn't come). The previous "open client, pick date, choose state" flow is replaced.
- **O1/O2 classification dropped.** Attendance is binary: came = billed at client's rate; didn't come = not billed. The original Phase-1 product insight ("nobody models the Polish O1/O2 regulamin") no longer applies. The new product reason-to-exist is "GCal already schedules — the missing piece is mobile-fast attendance + monthly revenue from those events, without spreading data between GCal and Excel".
- **Sync direction = one-way (GCal → app).** App never writes to GCal.
- **Client identity = app-side profile, mapped to GCal events by attendee email.** Trainer must invite the client as an attendee on the GCal event for matching to work.
- **Timeline = 5 weeks** (was 3). User acknowledged the sustained-effort cost.

All Phase 1-6 sections below are rewritten to reflect this pivot. Pre-pivot decisions are preserved in `gray_areas_resolved` for audit. The schema sections (`## Vision & Problem Statement` etc.) now describe the *post-pivot* product.

---

## Vision & Problem Statement

A solo personal trainer in Poland with roughly twenty active clients already uses Google Calendar to schedule sessions. The trainer creates events, invites the client as an attendee, moves and cancels sessions as life intervenes — and Google Calendar handles all of that perfectly well. What Google Calendar does NOT do is track **attendance** (did the client actually show up?) or aggregate that into a **monthly revenue picture**. Today the trainer covers that gap with a monthly Excel sheet — separate from the calendar, manually populated, painful on mobile, error-prone, and a chore to summarize for each client at month-end. Attendance data lives in a different tool than the schedule, the two drift, and the trainer ends the month uncertain about what was actually performed and what should be charged.

Trainer-facing SaaS (Trainerize, Mindbody, Glofox, FitSW) all want to be the schedule, the marketplace, the workout-plan host — they replace tools the trainer already trusts. The insight here is the opposite: **leave Google Calendar as the schedule, layer a tiny attendance + revenue tool on top of it.** The trainer opens the app on their phone after a session, taps one button to mark "came" or "didn't come" against an event GCal already knows about, and at month-end has a clean per-client summary ready to paste into a message — without ever leaving GCal as the source of truth for who-is-when.

## User & Persona

**Primary persona — the founder-trainer.** The product's first user is the founder: a solo personal trainer in Poland, currently managing ~20 active clients (plus inactive history) using Google Calendar as their schedule and a monthly Excel sheet for attendance + revenue tracking. The trainer also runs a parallel physio / massage / therapy service line (parked out of MVP scope). They reach for the tool at two distinct moments:

- **Right after a session** — to tap "came" or "didn't come" on today's session list (the list itself was pulled from Google Calendar, so no one had to type anything). This is the most critical entry point because every miss here propagates into a wrong month-end revenue total.
- **At month-end** — to open the dashboard for the closing month and copy each client a ready-to-paste Polish summary message ("in May we had 8 sessions, you attended 6, owed: 720 PLN").

Two moments from the original Phase-1 capture have been removed by the pivot: (1) "week-start planning" — Google Calendar already provides the week view, and the app no longer duplicates it; (2) the "client asks for their balance" moment was already low priority before the pivot and remains so. Clients are message recipients, not app users.

### Secondary persona

*Post-MVP, informational only.* Other solo personal trainers facing the same Excel-and-regulamin pain. The MVP serves only the founder; multi-trainer / subcontractor scenarios are out of scope for v1 and revisited after the founder use case is proven.

## Access Control

**MVP authentication: trainer only, two layers.**

1. **App account: email + password.** A single trainer account is created at sign-up using email + password, with standard reset-by-email flow. After sign-in the trainer has full access to their own data; there is no role split (no admin / no member tiers) because there is only one user.
2. **Google account connection: OAuth 2.0.** After signing in to the app, the trainer authorizes the app to read their Google Calendar via standard Google OAuth consent. The app stores only the OAuth refresh token (not the trainer's Google password). The grant requested is **read-only** access to events on the trainer's primary calendar — no write scope, no other Google data. The trainer can revoke the grant at any time, either inside the app or via their Google account dashboard.

**Clients are not users.** Clients are addressable as data subjects — the trainer creates and edits their records, sees them in GCal events as attendees, and pushes them monthly summary messages — but they never log in to the application in v1. No client portal, no per-client login link.

**Implications carried forward:**

- The credential surface is two-tier: app password (compromise exposes the trainer's client list and revenue history) and Google OAuth token (compromise exposes calendar read access). Both are sensitive but blast radius is one tenant.
- Password reset by email is in scope (any email+password system needs it). Password-strength rules and 2FA can be discussed at NFR time but are not Phase 2 commitments.
- If the trainer revokes the Google OAuth grant, the app must degrade gracefully — existing attendance records remain visible, but no new events can be pulled, and the daily view is empty. Surface this state clearly with a "reconnect Google" prompt.
- The eventual multi-trainer / subcontractor extension referenced in Phase 1 will require a richer access model. Each trainer would connect their own Google account; data isolation is per-trainer. This is post-MVP; the v1 design should not box itself out of that future, but does not need to implement it.

## Success Criteria

### Primary

- **Excel replacement (the proof outcome).** Within the first full calendar month of use after launch, the trainer marks ≥ 95% of GCal-sourced sessions in the app — not after-the-fact in the Excel sheet. Falling back to Excel for attendance means the app failed at its core job.
- **Month-end "no math needed" outcome.** At month-end, the trainer can open the dashboard for the closing month and produce the per-client copy-paste summary for every active client in under 5 minutes total, without cross-checking against any other source. If they still feel the need to verify against Excel or count events in GCal manually, the dashboard hasn't earned their trust.

### Secondary

- The month-end dashboard's per-client summary text is good enough to copy-paste straight into a client message (WhatsApp / SMS / email) with zero rewording. If the trainer regularly re-edits the copy, the dashboard's text format failed its secondary job.
- The Google Calendar sync stays invisible 95% of the time — events show up in the daily view, moves and deletions update without manual intervention, and the trainer never thinks "is this synced?". A sync layer that calls attention to itself (errors, stale state, manual refresh buttons used often) is one that needs work.

### Guardrails (must NOT break)

- **Data durability for attendance.** An attendance mark (came / didn't come) once recorded must persist across logout, app reload, device switch, browser cache clear, week passing, month closing, and — critically — across GCal event mutations. If the trainer marks Adam-on-2026-05-21 as "came", and later Adam moves the GCal event to 2026-05-22, the attendance record must follow the event sensibly (or surface a reconcile prompt, never disappear silently).
- **Mobile-first responsiveness.** Tapping a session in the daily view to mark came / didn't come must complete in ≤ 1 second from tap to confirmed UI feedback. If marking feels slow, the trainer reverts to memory + Excel, the product fails.
- **Single-tenant data isolation.** Even though v1 is single-trainer, the data model and access checks must not foreclose future multi-tenant. Client data and OAuth tokens must only be accessible to their owning trainer; design cannot assume "one account = whole database".
- **No silent rate changes.** If the trainer changes a client's rate, sessions that were already attended at the old rate keep their old amounts. Revenue from past months must never silently rewrite when settings change.
- **OAuth token handling.** The Google OAuth refresh token is stored encrypted at rest and never exposed in logs, error messages, or analytics. A leaked token would grant calendar read access to anyone who steals it.

## Functional Requirements

> Rewritten 2026-05-21 after the GCal pivot. Previous FR-001 through FR-013 are superseded. New numbering starts at FR-001. The original Phase 4.5 Socratic round was anchored to the pre-pivot FR list; for the new FRs, Socratic notes are added inline where there was a real trade-off, and elided where the FR is a direct consequence of the locked pivot decisions.

### Authentication & Google connection

- FR-001: Trainer can sign up and sign in to the app with email + password, with a standard reset-by-email flow. Priority: must-have

- FR-002: Trainer can connect their Google account via OAuth 2.0 to grant the app **read-only** access to their primary Google Calendar. The app stores only the OAuth refresh token (encrypted at rest), not the Google password. Priority: must-have
  > Socratic: counter-argument considered — "force OAuth at signup (no app-without-GCal state) vs. let trainer try the app first and connect later?". Resolution: connect-later. Forcing OAuth at signup adds friction before the trainer sees value; the app's empty-state UI must explain that the daily view will populate only after Google is connected.

- FR-003: Trainer can disconnect their Google account from the app. Existing attendance records persist; no new GCal events are pulled until the trainer reconnects. Priority: must-have

### Client management

- FR-004: Trainer can add a new client with: a single name field (free text), **required email** (used for matching with GCal events — see FR-009), optional phone, per-session rate (PLN). Priority: must-have
  > Socratic: counter-argument considered — "make email optional (some clients don't share email)". Resolution: email is REQUIRED for v1 because the entire GCal-to-client mapping uses the attendee email address (FR-009). Without email there is no automatic match. If the trainer wants to track a client who has no email, they will need a placeholder address (e.g., `adam-no-email@trainer-advisor.local`) — recorded as Open Question for UX polish.

- FR-005: Trainer can edit any field on an existing client. Priority: must-have

- FR-006: Trainer can toggle a client's status between active and inactive. Clients are never hard-deleted in v1; deactivation preserves the full attendance history for past months. Priority: must-have
  > Socratic: counter-argument considered — "GDPR/RODO right-to-erasure may legally require hard delete." Resolution: soft-delete only for MVP. Productizing the erasure workflow is post-MVP. See Open Question 1.

- FR-007: Trainer can view the client list filtered by status: active / inactive / all. Priority: must-have

### Google Calendar sync

- FR-008: The app pulls events from the trainer's primary Google Calendar covering at minimum the current month and the previous month. Sync runs automatically on app open and periodically (e.g., every N minutes when the app is foreground), and can be manually refreshed by the trainer. Priority: must-have
  > Socratic: counter-argument considered — "should we sync only the current month?" vs. "should we pull a whole year?". Resolution: current + previous month is the minimum useful window for the month-end reconciliation use case (the trainer at the start of June still needs May's data). Pulling more is fine; pulling less breaks month-end. The exact upper bound is downstream of API rate-limit considerations (Open Question for tech-stack step).

- FR-009: Each GCal event is mapped to a client by matching attendee email addresses on the event to client email addresses in the app. If no client matches an attendee, the event appears in the daily view as "unknown attendee — [email]" with a one-tap action to add the attendee as a new client (FR-004 pre-filled). Priority: must-have
  > Socratic: counter-argument considered — "match by event title (e.g., 'Adam — Trening')" — rejected as too fragile (typos break matching, multiple Adams ambiguous). Counter-argument considered — "match by both attendee email AND event title for robustness" — rejected as adding complexity without clear gain; email is sufficient when the trainer invites the client as an attendee.

- FR-010: When a GCal event is created, moved (date/time changed), or deleted in Google Calendar, the change is reflected in the app on next sync. Attendance marks attached to that event follow it through moves. For deletions where attendance was already recorded, the attendance record is preserved and flagged as "orphaned" with a UI for the trainer to keep (e.g., the session happened, the GCal event was just cleaned up) or delete. Priority: must-have
  > Socratic: counter-argument considered — "on GCal deletion, silently delete the attendance record" — rejected, loses revenue data without trainer's knowledge. The orphan-flag flow is more complex but safer.

### Daily attendance marking (the core flow)

- FR-011: Trainer can view "today" — a time-ordered list of GCal events for today's date, each showing client name (or "unknown attendee" — see FR-009), event start time, and attendance state (unmarked / came / didn't come). Priority: must-have

- FR-012: Trainer can tap an event in the daily view to cycle its attendance state: unmarked → came (green check) → didn't come (red X) → unmarked. One tap per state change, confirmed visually within 1 second. Priority: must-have
  > Socratic: counter-argument considered — "use two separate buttons (came / didn't come) instead of a cycle" — rejected for MVP because a cycle minimizes the tap target count on a small mobile screen. Counter-argument considered — "track timestamp of the attendance decision for audit" — kept in scope as an implementation detail, not user-visible in v1.

- FR-013: Trainer can navigate the daily view between days (previous / next, jump to date) to mark attendance for past days they missed or check upcoming days. Priority: must-have

- FR-014: When an event is marked "came", the client's current per-session rate is snapshotted onto the attendance record. Later changes to the client's rate do NOT modify amounts on already-marked sessions. Priority: must-have
  > Socratic: counter-arguments considered — "always use current rate" or "month-level snapshot" — both rejected. Per-session snapshot preserves the Phase-3 guardrail "no silent rate changes".

### Monthly settlement dashboard

- FR-015: Trainer can view a per-client monthly summary card showing: scheduled (= count of GCal events for this client this month), attended (= came), no-show (= didn't come), unmarked (= attendance decision not yet recorded), revenue (= attended × snapshot rate). All values in PLN. Priority: must-have
  > Socratic: counter-argument considered — "should the card show trend vs. previous month?" — rejected, deferred to v2.

- FR-016: Trainer can view a month-grand-total across all clients with any events that month: total scheduled, total attended, total no-show, total unmarked, total revenue (PLN). Priority: must-have

- FR-017: Trainer can tap "Copy summary" on any per-client monthly card and have a ready-to-send Polish text message placed on their clipboard. The text format is hard-coded in v1 and follows the pattern: `Cześć [name], podsumowanie [month YYYY]: zaplanowanych X, obecnych Y, nieobecnych Z. Do zapłaty za odbyte sesje: KKK PLN.` Priority: must-have
  > Socratic: counter-argument considered — "format should be customizable via template (so trainer can add bank account number, payment link)" — rejected for v1, kept as Open Question 3.

- FR-018: Trainer can navigate between months: current month, any past month with attendance data. Past months remain editable — the trainer can still cycle attendance state on any historic event the GCal sync surfaced. Priority: must-have

## User Stories

### US-01: Trainer marks attendance immediately after a session ends

- **Given** a trainer who has just finished a session with a client, with their phone in hand, and the app already authenticated (both email/password and Google connected)
- **When** they open the app — it lands on the daily view (today's GCal events)
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
- **When** they navigate to the closing month's dashboard and open a specific client's monthly card and tap "Copy summary"
- **Then** the hard-coded Polish summary text (FR-017) is placed on their clipboard, ready to paste into WhatsApp / SMS / email

#### Acceptance Criteria

- Summary text matches the FR-017 format exactly.
- "Copy" succeeds with one tap; the clipboard payload is plain text (no markdown).
- After copying, the trainer can navigate to the next client and copy their summary without losing context.
- Grand-total view (FR-016) for the same month is reachable in ≤ 2 taps from any per-client card.
- The dashboard for past months is reachable via month navigation (FR-018), and "Copy summary" works identically on historical months.

### US-03: Trainer connects Google for the first time and the daily view starts populating

- **Given** a trainer who has just signed up to the app and has not yet connected Google
- **When** they open the daily view, it shows an empty state with a clear "Connect Google Calendar" CTA
- **And when** they tap the CTA, they are taken through the standard Google OAuth consent flow (FR-002), granting read-only calendar access
- **Then** on returning to the app, today's GCal events appear in the daily view within 5 seconds (initial sync)

#### Acceptance Criteria

- The empty-state CTA is not buried in settings; it is on the daily view itself.
- The OAuth flow opens in the system browser (not an in-app webview) so Google's anti-phishing protections apply.
- On successful return from OAuth, the trainer does not have to manually trigger sync — events appear automatically.
- If OAuth is cancelled or fails, the app returns to the empty state with a retry CTA; no half-connected limbo state.
- Any GCal event whose attendee email matches an existing client record is mapped on first sync (FR-009).

## Business Logic

**Rule of operation (one sentence, post-pivot):** Trainer Advisor reads each scheduled session from the trainer's Google Calendar, lets the trainer mark each session's attendance (came / didn't come) with one tap on a mobile-first daily view, and automatically aggregates those attendance decisions into a per-client and grand-total monthly revenue picture — eliminating the spread of attendance data between calendar and spreadsheet, and the manual math at month-end.

The rule consumes three user-facing inputs: (1) the **GCal events** on the trainer's primary calendar (each event = one scheduled session, with start time, attendee email identifying the client, and event identity that survives moves), (2) the **per-session rate** for each client as set on the client profile in the app (PLN), and (3) the trainer's **attendance decision** per session — came (green check) or didn't come (red X), tapped after the event occurs.

From those, the rule emits per client and per month: **scheduled count** (= GCal events for that client in that month), **attended count** (= came), **no-show count** (= didn't come), **unmarked count** (= attendance not yet decided), and **revenue** (`attended × snapshot_rate`). The trainer encounters these outputs as the per-client monthly summary card (FR-015), the month-grand-total view (FR-016), and the ready-to-paste Polish text summary (FR-017).

Two domain invariants follow from the rule and are preserved by the data model:

- **Rate snapshot per session.** The rate used in revenue calculations is the rate captured at the moment "came" is marked, not the trainer's current rate (FR-014). Raising a client's rate forward does not retroactively rewrite past months' revenue. This invariant directly serves the Phase-3 guardrail "no silent rate changes".
- **Attendance follows the event.** If a GCal event moves to a different date/time after attendance was already marked, the attendance decision follows the event (the trainer's "Adam came" doesn't suddenly become "didn't come" because the event moved); if the event is deleted in GCal, the attendance record is preserved and surfaced as orphaned (FR-010), not silently dropped.

### What the rule explicitly does NOT do (post-pivot)

- **No O1 / O2 distinction.** The app does NOT model the Polish regulamin cancellation rules. A no-show is a no-show; the trainer does not bill for it through the app. If the trainer charges a no-show outside the app (manual invoice, agreement with the client, etc.), that lives outside the app's ledger.
- **No "planned-vs-actual at the profile level".** The old `planned-sessions-per-month` field on the client profile is gone. "Planned" = GCal event count. If the GCal calendar is empty for a client, "planned = 0" — no separate intent declaration.
- **No app-side schedule mutation.** The trainer does not create, move, or delete sessions in the app. Schedule operations are GCal's responsibility; the app reflects GCal's truth.

## Non-Functional Requirements

- The application is fully usable on a phone in portrait orientation, with no horizontal scrolling and no zoom required to interact with any control or read any number. Tablet and desktop layouts are allowed but not required for v1.
- A trainer's tap on a daily-view event to cycle attendance state (unmarked → came → didn't come → unmarked) produces visible UI confirmation in ≤ 1 second on a mid-range phone over a 4G connection. Slow feedback at this step is a product-fatal regression — the trainer reverts to memory + Excel.
- All user-facing strings — labels, buttons, validation messages, the generated monthly-summary text in FR-017 — are in Polish. No English fallback in the UI in v1. Internal logs, code identifiers, and developer-facing artifacts may remain English.
- A trainer's data (client records, attendance records, OAuth tokens) is visible only to the trainer who owns the account. The design must not foreclose future per-tenant isolation even though v1 has one tenant.
- The Google OAuth refresh token is stored encrypted at rest and never appears in logs, error messages, analytics events, or any other observable surface. Leakage would expose the trainer's calendar contents to whoever steals the token.
- Money is exclusively PLN in v1. Numbers are formatted with Polish conventions (space-separated thousands, comma decimal — e.g. "1 200,50 zł"). No multi-currency support.
- Time zone is exclusively Europe/Warsaw in v1. All event times read from GCal are converted to Warsaw-local for display; monthly boundaries are "midnight Warsaw time on the last day of the calendar month".
- Google Calendar sync staleness: the daily view never shows GCal data more than 5 minutes stale when the trainer is actively using the app. On-demand manual refresh always pulls fresh data. (Background sync cadence is implementation-defined; this NFR specifies the user-observable freshness ceiling.)
- Offline support is explicitly OUT of scope for v1. Marking attendance requires connectivity at the moment of tapping. Initial GCal sync and ongoing refresh both require connectivity.

## Non-Goals

Items locked across Phases 1-6 as explicitly NOT in MVP. Each has a one-line rationale so a future "we should add this" impulse can be checked against the original reasoning.

### Functional non-goals (scope avoids)

- **No native scheduler / calendar UI.** The trainer plans in Google Calendar; the app reads GCal but does NOT provide its own calendar view for creating, moving, or deleting events. Schedule mutations are a GCal responsibility, full stop (Phase 3 + pivot lock).
- **No write-back to Google Calendar.** The OAuth scope requested is read-only. The app never creates, updates, or deletes GCal events. (Phase pivot lock — sync direction is one-way.)
- **No calendar sources other than Google Calendar.** No Outlook, no iCloud, no CalDAV. Google-only in v1 (Phase pivot lock).
- **No multiple-calendar support per trainer.** Only the trainer's primary Google Calendar is pulled in v1. A trainer who keeps "personal" and "work" calendars must ensure sessions go on the primary one (Phase pivot lock).
- **No O1 / O2 cancellation distinction.** Attendance is binary (came / didn't come). The Polish regulamin classification is intentionally NOT in the app — original Phase-1 product insight superseded by the pivot. If the trainer wants to charge for no-shows, they do it outside the app.
- **No automatic message sending to clients.** Monthly summary text is generated and copied to clipboard; trainer pastes manually into WhatsApp / SMS / email. Integrating a messaging channel (SMTP, Twilio, WhatsApp Business API) is a +1-2 week effort with provider lock-in risk — deferred to v2 (Phase 3 lock).
- **No subcontractor / sub-trainer module.** v1 is single-trainer only. The "I outsource clients to another trainer who logs in and uses the same database for those clients" scenario from the seed docs is a multi-tenant feature with role delegation — explicit v2 (Phase 1).
- **No physio / massage / therapy service lines.** The trainer's parallel FIZJO service from the legacy spreadsheet is out of v1. Those services don't have O1/O2 logic (the source of Pain #1) and would add a separate billing model. Deferred to v2 as a lighter "count + revenue" tracker (Phase 4 lock).
- **No package billing.** v1 supports per-session rate only. Package billing ("client buys 10 sessions for 1100 PLN, draw from balance, alert when exhausted") is a different financial model and post-MVP (Phase 4 lock).
- **No client portal.** Clients never log in. The "client checks their balance / history online" flow is replaced by trainer-pushed monthly summaries (Phase 2 lock).
- **No multi-trainer / multi-tenant SaaS in v1.** Architecture must not foreclose it (carried in Phase 2 implications), but no UI, no signup flow, no per-trainer isolation is built in v1 (Phase 1 lock).
- **No past-month auto-lock.** Trainer can edit historical sessions indefinitely; accounting-style month closure is post-MVP. Reconsider when multi-trainer is on the table (Phase 4.5 lock).
- **No trend comparison ("X% vs last month").** Monthly summary shows the current month only; comparisons are v2 (Phase 4.5 lock).
- **No template customization for the monthly-summary text.** Format is hard-coded in v1 (FR-011). Customizable templates ({client_name}, {bank_account}, payment links) are v2 (Phase 4.5 lock).
- **No GDPR hard-delete in the UI.** Right-to-erasure requests are handled by direct database operation in v1; productizing the workflow is v2 (Phase 4.5 lock). See Open Question 1.
- **No payment processing.** The app tracks what a client OWES, never charges them. No Stripe, no Przelewy24, no BLIK, no card-on-file. Payment happens outside the app (bank transfer, cash, whatever the trainer already uses) (Phase 6).
- **No invoicing / KSeF / e-PUAP / faktury VAT.** Trainer continues using their existing accounting tool (Wfirma, Fakturownia, księgowa). The app feeds them the monthly numbers; it does not replace them (Phase 6).
- **No marketplace.** The app is a trainer-internal tool. "Clients searching for trainers" is a different product category (B2C platform) and explicitly off-table (Phase 6).

### Non-functional non-goals (quality avoids)

- **No offline-first guarantee.** Marking requires connectivity. Buffering + sync + conflict resolution is +1-2 weeks of work for a minor convenience win in v1 (Phase 5 lock).
- **No behavioral analytics / ML / recommendations.** The app is a counter and a communicator, not an advisor. No churn prediction, no dynamic pricing suggestions, no AI-driven anything. Removing this entire dimension keeps the app legible and trustworthy (Phase 6).

## Open Questions

Items deferred to later resolution but explicitly named so they don't get lost.

1. **GDPR / RODO right-to-erasure workflow.** The MVP design carries soft-delete only (FR-006). When a client formally requests data erasure under RODO Art. 17, the trainer must currently handle it via direct database operation. Open: should v1.x add a "danger zone — hard delete + cascade" UI workflow before the user receives an actual erasure request? Owner: user (legal consult). Resolution by: before MVP is used with any client other than the founder's own list.

2. **Multi-tenant readiness in v1 data model.** Phase 2 implication carries that v1 must not foreclose multi-trainer. Open: should the data model already partition every table by `trainer_id` even though v1 has one trainer (cheap insurance), or stay single-tenant and migrate later (riskier but simpler)? Owner: tech-stack-selection step (downstream of /product-spec).

3. **Polish bank account number / payment link in monthly summary.** FR-017 hard-codes a Polish text format without payment instructions. Some trainers include their bank account number directly in the message; some send a separate payment request. Open: should the summary text in v1 include a static bank-account line read from the trainer's profile? Owner: user. Resolution by: end of MVP build.

4. **Client without an email — placeholder UX.** FR-004 requires email because GCal matching uses attendee email (FR-009). For a client who doesn't share an email, the trainer would need a placeholder address (e.g., `adam-no-email@trainer-advisor.local`). Open: should the app generate this placeholder automatically when the trainer leaves email blank, or is it OK to insist that email is required and let trainer manage placeholders themselves? Owner: user. Resolution by: end of MVP build.

5. **Sync cadence and refresh strategy.** FR-008 says "automatically on app open and periodically", and NFR caps user-observable staleness at 5 minutes. The actual implementation (poll every N minutes? webhook from Google? incremental delta sync via Google's `syncToken`?) is downstream of tech-stack-selection. Open: which strategy meets the 5-minute freshness NFR without burning Google API quota? Owner: tech-stack-selection step.

6. **GCal API rate-limit handling.** Google Calendar API has per-user-per-second and daily quotas. For a single trainer with ~20 active clients and ~150 events / month, this is well below limits — but the multi-tenant future opens up quota questions. Open: should we plan for delegated tokens (one OAuth client across all trainers) or each trainer authorizing their own? Owner: tech-stack-selection step.

7. **Recurring GCal events.** GCal supports recurring events ("every Mon and Thu 18:00 with Adam, until end of year"). Each instance has its own event-id but inherits the master event's attendees. Open: does the app treat each instance independently for attendance (likely yes), and how does it handle modifications to a single instance vs. the whole series? Owner: tech-stack-selection step + UX validation with the user during build.

## Timeline acknowledgment

Acknowledged on 2026-05-21: the GCal-pivoted MVP requires approximately five weeks of sustained after-hours effort to build (OAuth + GCal API integration + sync logic + event-to-client mapping + the existing client/dashboard scope). The user explicitly accepted this cost when given the choice between (a) extending the budget from 3 → 5 weeks with sustained effort, (b) cutting FR scope, or (c) abandoning the GCal pivot. Choice (a) was selected.

This acknowledgment block is required by /discover Step 3 when `mvp_weeks > 3`. It exists so the cost is on the record, not discovered halfway through the build.
