---
id: T-001
title: Register domain
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: []
blocks: [T-003, T-005, T-006, T-010]
plan_anchor: A2-domain-registrar
---

## Scope

Buy a domain that will host Trainer Advisor in production. Choose registrar
based on the decision in `plan-v2.md § Decisions to make BEFORE execution`:

- **OVH** with `.pl` TLD (~12 PLN/y) — preferred for Polish-market focus
- **Cloudflare Registrar** with `.app` (~$15/y, at-cost) — preferred for global

Outputs:
- Final domain name (e.g. `traineradvisor.pl` or `trener.app`)
- Access to registrar's DNS panel (will be used in T-003)

## Approach

1. Decide TLD + registrar (one-time choice, hard to reverse cleanly).
2. Search for available domain. Register for 1 year minimum.
3. Enable WHOIS privacy if registrar offers it (default at Cloudflare).
4. Confirm registrar's DNS is operational (you'll edit it in T-003).
5. Record the domain name in your password manager.

## Acceptance

- [ ] Domain owned, paid, visible in registrar dashboard
- [ ] DNS management UI accessible
- [ ] Domain name recorded for use in `.env.example` → `APP_URL` and `RESEND_FROM`
