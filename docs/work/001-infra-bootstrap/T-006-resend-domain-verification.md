---
id: T-006
title: Resend account + domain SPF/DKIM verification
status: obsolete
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-001, T-003]
blocks: [T-009]
plan_anchor: A6-email-sender
---

## Obsoleted on 2026-05-27

PRD FR-001 was simplified to Google-only auth (single sign-on via Google OAuth — see `docs/product-spec.md` § Authentication and `docs/roadmap.md` § F-02). No more email/password sign-up, no password-reset flow, no app-sent emails in v1. Resend is therefore not required by F-02 or any current slice.

Reconsider if/when a v1 use case for app-sent email emerges:
- Nightly backup failure notifications from F-03 (could go via Slack/Discord webhook or UptimeRobot 5xx alert instead — Resend isn't the only path)
- Future v2 features (subcontractor invitations, monthly summary auto-send) — would need Resend then, but those are explicit v2 Non-Goals

Tombstone, not lost work. The original task body below is preserved for the future re-evaluation.

## Scope

Sign up for Resend (recommended email sender — EU region available, free
100/day, React Email-native) and verify domain ownership so password-reset
emails won't be flagged as spam.

Outputs:
- `RESEND_API_KEY` — sending-scope API key
- `RESEND_FROM` — sender address on the verified domain (e.g. `trener@<domain>`)
- Domain status: Verified

## Approach

1. Sign up at https://resend.com (GitHub OAuth works).
2. Dashboard → **Domains → Add Domain** → enter the bare domain from T-001.
3. Resend shows TXT/CNAME records to add at the registrar:
   - `_resend._domainkey` (DKIM)
   - SPF (`v=spf1 include:_spf.resend.com ~all`)
   - DMARC (optional but recommended)
4. Add these records at the registrar's DNS panel (same place as T-003).
5. Click **Verify** in Resend. Propagation takes 5–60 min like T-003.
6. Once status shows Verified → **API Keys → Create API Key**:
   - Name: `trainer-advisor-prod`
   - Permission: **Sending access** (NOT full access)
7. Copy the API key (shown once only). Save in password manager.
8. Pick a sender like `trener@<domain>` for `RESEND_FROM`.

## Acceptance

- [ ] Resend account active
- [ ] Domain shows `Verified` status in Resend
- [ ] `dig _resend._domainkey.<domain> TXT` returns DKIM record
- [ ] SPF record visible via `dig <domain> TXT`
- [ ] API key created, scope = sending only, saved for T-009
- [ ] `RESEND_FROM` address decided

## Notes

If Resend free tier ever drops to a paid-only model, alternatives that keep
the same API surface: Brevo (EU), Postmark. The app code uses Resend's REST
API directly via `RESEND_API_KEY` — switching vendors means swapping the
client + provider record at DNS.
