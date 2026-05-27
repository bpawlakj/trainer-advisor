# Index — 001 Cloud Deploy Infrastructure (F-03)

T-*.md frontmatter is the source of truth; this file is a derived view.

Plan: [`plan.md`](./plan.md) (current execution summary).
Audit trail: [`plan-v2.md`](./plan-v2.md) (verbatim M1L5 approved deployment plan, 377 lines — do NOT edit).
Roadmap ref: F-03 in [`docs/roadmap.md`](../../roadmap.md).

## Done

(none yet — F-03 not started)

## In flight

(none)

## Pending

| ID | Title | Depends on | Blocks |
|---|---|---|---|
| T-001 | Register domain | — | T-003, T-010 |
| T-002 | Provision Hetzner Cloud CX22 VM | — | T-003, T-008, T-009 |
| T-003 | Configure DNS records | T-001, T-002 | T-011 |
| T-007 | Cloudflare R2 bucket + scoped API token | — | T-009 |
| T-008 | Add GitHub Actions deploy SSH key to Hetzner box | T-002 | T-009 |
| T-009 | Configure GitHub Actions secrets | T-002, T-007, T-008 | T-011 |
| T-010 | Replace domain placeholders in repo | T-001 | T-011 |
| T-011 | Trigger first deploy + verify GHCR image + smoke test | T-009, T-010 | T-012 |
| T-012 | UptimeRobot monitor + 10-step verification + Arena post | T-011 | — |

## Obsoleted

| ID | Title | Reason | Moved to |
|---|---|---|---|
| T-004 | Create Supabase project + enable extensions | Local-first restructure (2026-05-26) — Supabase belongs to F-01 since it's needed for `pnpm dev` BEFORE cloud deploy | [`docs/work/003-local-dev-unblockers/T-001-supabase-project.md`](../003-local-dev-unblockers/T-001-supabase-project.md) |
| T-005 | Google Cloud Console OAuth setup | Local-first restructure (2026-05-26) — deferred to S-01 (first slice that uses OAuth flow); avoid chicken-and-egg with redirect URI needing the domain from T-001 | S-01 first slice in `docs/work/<NNN>-google-connect-and-first-sync/` (not yet created) |
| T-006 | Resend account + domain SPF/DKIM verification | Google-only auth simplification (2026-05-27) — `emailAndPassword.enabled: false` in Better Auth = no app-sent emails in v1 = Resend not needed | Tombstone only. Reconsider in F-04 / v2 if backup-failure notifications or admin alerts surface as needs |

## Suggested execution order

Critical path (sequential, blocking):

```
T-001 (domain) ──┐
T-002 (Hetzner) ─┤── T-003 (DNS) ──┐
                 │                  ├── T-009 (secrets) ── T-011 (deploy) ── T-012 (verify)
T-007 (R2) ──────┘── T-010 (replace placeholders) ─┘                              ▲
                                                                                  │
                                                                          (T-008 SSH key)
```

Parallelize while waiting on critical path:

- **Batch 1 (zero deps)**: T-001 + T-002 + T-007 — fire all three in browser tabs side-by-side
- **After T-002 lands**: T-008 (SSH deploy key) — runs alongside T-003 DNS propagation wait
- **After T-001 lands**: T-010 (replace placeholders in Caddyfile + .env.example + docker-compose) — small commit, runs alongside T-002 / T-003

Estimated wall-clock: **~85 min active** + 30–60 min DNS propagation + ~5 min UptimeRobot first-ping window.

## Verification log

### 2026-05-25 (initial atomization)

- Mode: INITIAL — no T-*.md present.
- Source: `plan-v2.md` (377 lines verbatim) as primary; `plan.md` summary used for context.
- Phase B (12 local config files) explicitly EXCLUDED from atomization — already implemented in commit `2714979`.
- Decomposition: 12 tasks covering 9 Phase A registrations + Caddyfile/env edit + secrets + deploy + verification.
- Dependency graph validated for cycles (none).

### 2026-05-27 (reconciliation — scope-narrowing)

- T-004 (Supabase) marked `status: obsolete` — moved to F-01 `003-local-dev-unblockers/T-001` per local-first restructure (commit `d7d2ac8`).
- T-005 (Google OAuth) marked `status: obsolete` — deferred to S-01 first slice (commit `d7d2ac8`).
- T-006 (Resend) marked `status: obsolete` — Google-only auth simplification means no app-sent emails in v1 (commit `9c000b7`).
- T-009 `depends_on` updated from `[T-002, T-004, T-005, T-006, T-007, T-008]` → `[T-002, T-007, T-008]`. Frontmatter `plan` ref changed from `../plan-v2.md` → `../plan.md`. Body trimmed `RESEND_*` secrets, marked `GOOGLE_CLIENT_*` as deferred to S-01, clarified `SUPABASE_*_URL` source from F-01.
- `plan.md` summary rewritten to reflect 9-task active scope.
- `plan-v2.md` UNCHANGED (preserved as M1L5 verbatim audit trail).
- Active tasks: 9. Obsolete tombstones: 3. Total T-*.md files: 12 (no deletions per /atomize rule).
