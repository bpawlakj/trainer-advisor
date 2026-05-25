---
id: T-008
title: Add GitHub Actions deploy SSH key to Hetzner box
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-002]
blocks: [T-009]
plan_anchor: A1-github-secrets-hetzner-ssh-key
---

## Scope

Generate a dedicated SSH keypair that GitHub Actions will use to deploy via
SCP + SSH. Authorize it on the Hetzner box for the `deploy` user (NOT root —
separation of concerns from the root key in T-002).

Outputs:
- `HETZNER_SSH_KEY` — **private key** content (will be a GitHub secret in T-009)
- Public key installed at `/home/deploy/.ssh/authorized_keys` on the box
- `ssh deploy@<host>` works from local laptop

## Approach

1. Generate a separate keypair for GHA (don't reuse root key from T-002):
   ```bash
   ssh-keygen -t ed25519 \
     -f ~/.ssh/id_ed25519_gha_trainer-advisor \
     -C "github-actions trainer-advisor deploy" \
     -N ""    # no passphrase — GHA can't type one
   ```
2. As root on the Hetzner box (use the root key from T-002):
   ```bash
   ssh -i ~/.ssh/id_ed25519_hetzner_root root@<host>
   # On the box:
   cat >> /home/deploy/.ssh/authorized_keys <<'EOF'
   <paste content of id_ed25519_gha_trainer-advisor.pub>
   EOF
   chown deploy:deploy /home/deploy/.ssh/authorized_keys
   chmod 600 /home/deploy/.ssh/authorized_keys
   exit
   ```
3. Verify from laptop:
   ```bash
   ssh -i ~/.ssh/id_ed25519_gha_trainer-advisor deploy@<host> 'whoami && docker --version'
   # Expected: deploy / Docker version 27.x
   ```
4. The **private key** content (`cat ~/.ssh/id_ed25519_gha_trainer-advisor`)
   will go into GitHub secret `HETZNER_SSH_KEY` in T-009.

## Acceptance

- [ ] New ed25519 keypair generated, NO passphrase
- [ ] Public key in `/home/deploy/.ssh/authorized_keys` on the box
- [ ] File permissions: 700 on `.ssh/`, 600 on `authorized_keys`, owned by `deploy:deploy`
- [ ] `ssh -i <new-key> deploy@<host> whoami` returns `deploy`
- [ ] `ssh deploy@<host> docker --version` works (deploy is in docker group)
- [ ] Private key content captured for T-009 secret

## Notes

The deploy user can run Docker but not sudo — this is intentional. If a deploy
ever needs root, do it manually via the root key. The GHA key has narrow blast
radius by design.
