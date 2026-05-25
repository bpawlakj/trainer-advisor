---
id: T-003
title: Configure DNS records
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-001, T-002]
blocks: [T-006, T-011]
plan_anchor: A3.5-dns
---

## Scope

Point the domain at the Hetzner CX22 box so Caddy can fetch its Let's Encrypt
certificate on first deploy and the app becomes reachable.

## Approach

1. Open the registrar's DNS panel (OVH or Cloudflare from T-001).
2. Add records (replace `<HETZNER_HOST>` with IPv4 from T-002,
   `<HETZNER_HOST_V6>` with IPv6 if Hetzner assigned one):

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | A | @ | `<HETZNER_HOST>` | 1h |
   | AAAA | @ | `<HETZNER_HOST_V6>` | 1h |
   | A | www | `<HETZNER_HOST>` | 1h |

3. (Cloudflare only) Disable orange-cloud proxy on these records — Caddy needs
   to terminate TLS itself; CF proxy would conflict with Let's Encrypt ACME.
4. Wait 5–60 min for propagation. Track with `dig <domain>` from local terminal.
5. Verify reverse DNS from the box too: `ssh root@<host> 'dig <domain>'`.

## Acceptance

- [ ] `dig <domain> A` returns `HETZNER_HOST`
- [ ] `dig <domain> AAAA` returns the IPv6 (if assigned)
- [ ] `dig www.<domain>` resolves to the same host
- [ ] No CF proxy (orange cloud OFF) if using Cloudflare DNS
- [ ] Propagation visible from both local laptop and the box

## Notes

If the registrar enforces a longer minimum TTL (some do up to 24h), accept it —
just plan around the slower propagation. For OVH the default is fine.
