---
id: T-002
title: Provision Hetzner Cloud CX22 VM
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: []
blocks: [T-003, T-008, T-009]
plan_anchor: A3-hetzner-cloud
---

## Scope

Sign up for Hetzner Cloud (NOT Hetzner Robot — different product), create a
CX22 VM in Falkenstein with `scripts/server-setup.sh` from the repo as
cloud-init User Data so the box arrives ready for `docker compose up`.

Outputs:
- `HETZNER_HOST` — public IPv4 of the VM
- Hetzner project with payment method on file (~€4.49/mo recurring)
- Root SSH access verified

## Approach

1. Sign up at https://accounts.hetzner.com/signUp (Cloud, not Robot).
2. Verify ID promptly — Hetzner sometimes gates resource creation behind it.
3. Create new project `trainer-advisor`.
4. Generate a dedicated SSH keypair for root access:
   `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_hetzner_root -C "trainer-advisor root"`.
   Add the **public** key to the Hetzner project (Settings → Security → SSH Keys).
5. Create a new server:
   - Location: **Falkenstein** (closer to Warsaw, same residency as Supabase Frankfurt)
   - Image: **Ubuntu 24.04 LTS**
   - Type: **CX22** (Shared vCPU, ~€4.49/mo)
   - Volume: none (40 GB included is enough for MVP)
   - Networking: defaults (IPv4 + IPv6)
   - SSH keys: select the one added in step 4
   - **User data** (cloud-init): paste the **entire content** of
     `scripts/server-setup.sh` from the repo. Hetzner runs it on first boot.
6. Wait ~60 seconds for the VM to boot + cloud-init to finish.
7. Verify root SSH: `ssh -i ~/.ssh/id_ed25519_hetzner_root root@<host>`.
8. Sanity check on the box: `docker --version && docker compose version && ufw status`.

## Acceptance

- [ ] CX22 VM running, public IPv4 visible in Hetzner dashboard
- [ ] Root SSH works from local laptop
- [ ] `docker` + `docker compose` installed (cloud-init ran successfully)
- [ ] UFW status: 22/80/443 allowed, default deny
- [ ] `deploy` user exists with `/home/deploy/app` directory ready
- [ ] IPv4 noted as `HETZNER_HOST` (to be added in T-009 secrets)
