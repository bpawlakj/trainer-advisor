---
id: T-005
title: Google Cloud Console OAuth setup
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-001]
blocks: [T-009]
plan_anchor: A5-google-cloud-console
---

## Scope

Create a Google Cloud project that grants the app read-only access to a
trainer's Google Calendar events. The OAuth consent screen stays in Testing
mode for MVP (only test users can sign in — fine while the only user is the
founder).

Outputs:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- OAuth consent screen approved Testing mode with founder as test user
- Calendar API enabled

## Approach

1. Sign in at https://console.cloud.google.com (Google account).
2. Create new project: `trainer-advisor`.
3. **APIs & Services → Library** → enable **Google Calendar API**.
4. **APIs & Services → OAuth consent screen**:
   - User Type: **External** (Internal requires Google Workspace)
   - App name: `Trainer Advisor`
   - User support email: founder's email
   - App logo: optional PNG
   - App domain: `https://<domain>` (from T-001)
   - Authorized domains: bare domain (e.g. `traineradvisor.pl`)
   - Developer contact: founder's email
   - **Scopes** → add `https://www.googleapis.com/auth/calendar.events.readonly`
   - **Test users** → add founder's own Gmail address
   - Save & Continue through each step until consent screen exists
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Trainer Advisor Web`
   - Authorized JavaScript origins: `https://<domain>`
   - Authorized redirect URIs: `https://<domain>/api/auth/callback/google`
   - Click Create — popup shows Client ID + Client secret
6. Copy both. Store in password manager and prep for T-009 secrets.

## Acceptance

- [ ] Google Cloud project `trainer-advisor` exists
- [ ] Calendar API status: Enabled
- [ ] OAuth consent screen: Testing mode, founder added as test user
- [ ] Scope `calendar.events.readonly` present in scopes table
- [ ] OAuth Web client created with the production redirect URI
- [ ] Client ID + Secret stored for T-009

## Notes

`Testing` mode is sufficient for MVP — Google review is only required when
ready to accept non-test users. Plan that for v2 when the first non-founder
trainer joins.
