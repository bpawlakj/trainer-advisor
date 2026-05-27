# Roadmap — Trainer Advisor

## Vision recap

Trainer Advisor is a Polish-language, mobile-first PWA that turns Google Calendar into a single-trainer attendance and revenue ledger: the trainer signs in with Google, sees today's session list with a one-tap binary attendance toggle (came / didn't come — never a third "late" or "excused" state), and at month-end copies a per-client PLN summary into their messenger of choice. v1 is single-tenant, learning-first (10xDevs Arena certification, not commercial), and aggressively scoped — no scheduler, no calendar write-back, no payments, no 2FA. The roadmap follows **ordering A (north-star-first)** with a **local-first execution model**: minimal foundation for local dev (F-01) → app skeleton runs locally (F-02) → vertical slices S-01..S-04 ship locally → cloud deploy as a separate foundation (F-03) on demand. Rationale: main_goal=NAUKA and top_blocker=TIME both reward reaching the end-to-end demo as fast as possible — and "local demo working" is a stronger forcing function than "cloud deploy live". Cloud deploy unlocks **production launch / sharing**, not feature work. Slice ordering inside the app: US-03 → US-01 → US-02 (PRD order), with client management folded into US-03's first-sync and finished as S-04.

## Foundations

### F-01: Local-dev unblockers (Supabase project)
- **Outcome:** A Supabase project exists in `Central EU (Frankfurt)` with `pg_cron` + `pg_net` extensions enabled; `SUPABASE_DATABASE_URL` (port 6543 pooled) and `SUPABASE_DIRECT_URL` (port 5432 for migrations) are in local `.env.local`; `LIBSODIUM_MASTER_KEY` generated locally via `openssl rand -hex 32`. Together these are the minimum a developer needs to run `pnpm dev` against a real backend and `drizzle-kit migrate` successfully. No domain, no Hetzner, no GitHub Actions — that's all F-03.
- **Unlocks:** F-02
- **Status:** ready (small initiative, see `docs/work/003-local-dev-unblockers/`)

### F-02: App skeleton — Better Auth (Google-only), Drizzle schema, next-intl, route groups
- **Outcome:** Better Auth configured with `encryptOAuthTokens` and **Google as the sole identity provider** (read-only Calendar scope — no email+password, no register form, no password-reset flow); libsodium `crypto_secretbox` helper for refresh-token at-rest encryption; Drizzle 7-table schema in `src/db/schema/` generated and migrated against Supabase (every business table has `trainer_id NOT NULL` from day one); Supavisor pooled connection (`prepare: false`) for app, direct connection for migrations; next-intl wired with `[locale]` segment and `src/messages/pl.json` as the single Polish string catalog; route groups `(marketing)`, `(auth)`, `(protected)` scaffolded with a working `requireAuth()` per-page guard; `(auth)/login` is a single "Zaloguj przez Google" button; pg_cron + pg_net job calling `/api/sync` every 5 min defined but no-op until S-02. **Runs locally end-to-end** — no cloud deploy required.
- **Unlocks:** S-01, S-02, S-03, S-04
- **Status:** ready (blocked on F-01 done, see `docs/work/002-app-skeleton/`)

### F-03: Cloud deploy infrastructure
- **Outcome:** Production deployment ready end-to-end: domain registered, Hetzner CX22 VM provisioned with cloud-init server-setup, DNS A/AAAA records propagated, Caddy reverse proxy with Let's Encrypt TLS, GHCR image push via GitHub Actions, deploy SSH key + GH Actions secrets wired, Resend domain DKIM verified, Cloudflare R2 backup bucket, UptimeRobot monitor pinging /api/health. **Does NOT unlock slice work** — slices ship locally. F-03 unlocks "publish the URL to 10xDevs Arena" / production launch only.
- **Unlocks:** production launch (closes M1L5 cert milestone)
- **Status:** in-progress — see `docs/work/001-infra-bootstrap/` (this is the original 12-task plan, minus T-004 Supabase which moved to F-01 in `003-local-dev-unblockers/`).

## Slices

> Ordering A: each slice ships a vertical the trainer can open on their phone and verify. S-01 → S-02 → S-03 is the north-star path end-to-end; S-04 closes the loop on client management once real data exists to edit. **All slices develop and verify locally** — F-03 (cloud deploy) is independent of slice work.
>
> Dev-time guards (Biome, Lefthook, structured logging beyond `console.log`, observability beyond UptimeRobot) are **overlapping work** done inside F-02 and refined during slices — they do not get their own Foundation row because they unlock nothing concrete and "orphan foundations" are an explicit code smell in the roadmap contract.

### S-01: Trainer signs in with Google and sees their calendar events
- **Outcome:** Trainer lands on marketing page, taps "Zaloguj przez Google", completes OAuth in the system browser (NOT in-app webview per US-03 acceptance) — granting `calendar.events.readonly` scope in the SAME consent screen. On return, trainer is signed in (auto-create on first sign-in, restore on subsequent) and within ≤5 sec sees today's calendar events listed. On first sync, every distinct attendee email becomes a `client` row owned by the trainer (FR-009 mapping); attendees without email are skipped pending resolution of Open Roadmap Question 3. The refresh token is stored encrypted at rest in `trainer_google_tokens(nonce, ciphertext)`. No attendance UI yet — just "I signed in, I see my sessions." Auth + first-sync are **the same slice** (merged from old US-03 "connect Google" — now there's no separate connect step).
- **Change ID:** `google-connect-and-first-sync`
- **PRD refs:** US-03, FR-001, FR-002, FR-003, FR-008, FR-009, FR-010
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Risk:** Google Calendar API edge cases (event moved/deleted between syncs, recurring-event expansion, attendee email casing, declined attendees) need concrete tie-break rules before code — FR-010 says "attendance follows the event" but leaves implementation detail open. If first-sync auto-creates noisy `client` rows (one-off guests), trainer's client list becomes garbage and they abandon. Mitigate by gating client-creation behind "attendee appeared in ≥1 confirmed session" or letting trainer dismiss in S-04.
- **Status:** proposed

### S-02: Trainer marks attendance for today's sessions in ≤2 taps
- **Outcome:** Daily view is the default landing for an authenticated trainer with a connected Google account; today's sessions render in chronological order with a single-tap binary attendance toggle per attendee (came / didn't come / unmarked — cycling per FR-012). Tap → optimistic UI → confirmation chip in ≤1s (NFR). The session's snapshot rate (PLN per attendee at time of marking) is captured immutably on the attendance row (FR-014) so later rate changes don't rewrite history. Past days are reachable via day-nav (FR-013), also editable. Attendance is **binary** — never introduce a `cancellation_reason`, `O1`/`O2`, or "excused" enum (AGENTS.md critical rule).
- **Change ID:** `daily-attendance-toggle`
- **PRD refs:** US-01, FR-011, FR-012, FR-013, FR-014
- **Prerequisites:** F-02, S-01
- **Parallel with:** —
- **Blockers:** —
- **Risk:** FR-014 + FR-010 edge: what happens to an attendance row when the underlying Google event is deleted or moved after marking? Two failure modes: (a) silently lose data, (b) confuse trainer with orphaned rows. The product-spec rule is "attendance follows the event; deletion preserves attendance as orphaned" — need an explicit "event deleted upstream" UI state. ≤1s confirmation budget is tight on mobile 4G — may need optimistic-write + background reconcile.
- **Status:** proposed

### S-03: Trainer reconciles a month and copies per-client summary text
- **Outcome:** Monthly dashboard reachable in ≤2 taps from daily view (FR-016 reachability acceptance); shows grand total PLN for the month plus a per-client breakdown (sessions came × snapshot rate, no-shows surfaced separately but not billed — attendance is binary). Each client row has a copy-summary button that places onto the clipboard a Polish-formatted message matching FR-017 byte-for-byte (date range, session count, line items, total, all in PLN with `Europe/Warsaw` dates, formatted via `Intl.NumberFormat('pl-PL', {style:'currency', currency:'PLN'})` → `1 200,50 zł`). Historical months are navigable (FR-018) and editable — late corrections write through to attendance rows, dashboard recomputes. This slice closes the north-star demo: sign-in → see sessions → mark attendance → send month summary.
- **Change ID:** `monthly-summary-and-copy`
- **PRD refs:** US-02, FR-015, FR-016, FR-017, FR-018
- **Prerequisites:** F-02, S-02
- **Parallel with:** S-04 (no shared files beyond schema; S-04 can run alongside if time permits, but S-03 is higher priority for the north-star demo)
- **Blockers:** —
- **Risk:** FR-017 Polish copy format must match exactly — a single misplaced non-breaking space or comma in a screenshot test breaks the demo. Pin the canonical string in `src/messages/pl.json` with a snapshot test. Open: does the summary line include a payment-link / IBAN line, or is it text-only? (See Open Roadmap Question 2.)
- **Status:** proposed

### S-04: Trainer manages clients (rename, set rate, hide one-off attendees)
- **Outcome:** Clients list screen shows every `client` auto-created by first-sync (S-01) plus any manually added; trainer can edit display name, set/override PLN rate, soft-deactivate (FR-006 — never hard-delete in v1), and add a client manually for the "no-email" case if a placeholder convention is adopted (Open Roadmap Question 3). Rate changes are forward-only — historical attendance rows keep their snapshot rate (FR-014 invariant). This slice exists because by the time the trainer has used S-01..S-03 once, the auto-created client list will need cleanup; shipping it earlier would be premature UI for empty data.
- **Change ID:** `client-management-ui`
- **PRD refs:** FR-004, FR-005, FR-006, FR-007
- **Prerequisites:** F-02, S-01
- **Parallel with:** S-03 (independent enough; do S-03 first if forced to choose)
- **Blockers:** —
- **Risk:** Scope creep into RODO erasure UI (Open Question 1), bulk-import, or client merge — all v2. Hold to the four FRs. The "no-email client" placeholder convention is unresolved (Open Roadmap Question 3) and could push this slice if it requires a new identifier scheme on `clients`.
- **Status:** proposed

## Open Roadmap Questions

These are PRD Open Questions whose resolution affects roadmap sequencing or scoping. They live here (not in product-spec.md) because answering them changes slice content, not product vision. Owners and resolution-by targets carry from product-spec.md § Open Questions.

1. **RODO erasure UI** — PRD acknowledges GDPR/RODO obligations but v1 has no self-serve erasure screen. Is a manual SQL runbook acceptable for v1, or does S-04 need a "delete client + cascade attendance" button? **Owner:** Bartosz. **Resolution by:** before MVP is used with any client other than the founder's own list.
2. **Payment line in monthly summary (FR-017)** — does the copied Polish text include IBAN / BLIK / payment link, or is it purely informational (sessions × rate = total)? Affects S-03 string template and whether trainer profile needs a payment-details field. **Owner:** Bartosz. **Resolution by:** end of S-03 build.
3. **No-email client placeholder (FR-009)** — Google Calendar attendees without an email cannot be auto-mapped. Convention options: (a) skip them entirely on first sync (current S-01 default), (b) generate a synthetic local-only identifier, (c) prompt trainer on first sync. Affects S-01 first-sync logic and S-04 manual-add flow. **Owner:** Bartosz. **Resolution by:** end of S-01 build.
4. **Sync cadence detail** — pg_cron every 5 min is the floor (NFR "≤5min stale"), but should there also be a manual "sync now" pull-to-refresh on the daily view for trainers who just edited a session in Google Calendar? Affects S-01/S-02 UX. **Owner:** Bartosz. **Resolution by:** end of S-02 build.
5. **Recurring events (FR-010)** — Google Calendar recurring-event instances can be moved or cancelled individually. Does v1 expand them lazily on read, or eagerly on sync? Affects S-01 sync logic and S-02 "event deleted upstream" handling. **Owner:** Bartosz. **Resolution by:** end of S-01 build.

## Done

_(empty — populated as slices flip to `status: done` and migrate from `## Slices` to here, with link to their `docs/work/<NNN>-<change-id>/` folder)_
