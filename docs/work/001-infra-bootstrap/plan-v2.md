> **Roadmap ref:** F-03 in [`docs/roadmap.md`](../../roadmap.md) — **cloud deploy infrastructure** (was F-01 until 2026-05-26 restructure for local-first execution model).
>
> **Scope change:** T-004 (Supabase) and T-005 (Google OAuth) were moved out — T-004 to F-01 local-dev unblockers in [`docs/work/003-local-dev-unblockers/`](../003-local-dev-unblockers/), T-005 deferred to S-01. Their `status: obsolete` in this folder is a tombstone, not lost work. Remaining 10 tasks in this initiative are pure cloud-deploy (Hetzner, domain, DNS, Caddy, GHCR, Actions, R2, UptimeRobot, Resend DKIM).

# Plan — Infrastructure Registration & Preparation Files

## Context

Repozytorium `trainer-advisor` ma scaffold Next.js 16 + decyzję stackową (`docs/analyzes/language-and-infrastructure-stack-decision.md`) i `permission policy`, ale **żadnego elementu infrastruktury nie założono jeszcze**. Aby zacząć M1L5 (Plan Mode → deploy-plan.md → wdrożenie), trzeba najpierw:

1. **Zarejestrować zewnętrzne konta i serwisy** — Hetzner Cloud, Supabase, Google Cloud Console (Calendar OAuth), Cloudflare R2 (backupy), domain registrar, email sender, monitoring.
2. **Wygenerować lokalne pliki konfiguracyjne** które (a) deklarują co jest potrzebne (`.env.example`), (b) automatyzują setup boksa Hetzner (`scripts/server-setup.sh`), (c) konfigurują deploy (`Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/deploy.yml`).

Ten plan opisuje **tylko bootstrap infrastruktury** — nie implementację featurów aplikacyjnych (Better Auth wiring, Drizzle schema, next-intl, biz logic). Te lądą jako osobne inicjatywy w `docs/work/` po zakończeniu deploya.

Cel końcowy planu: **mieć wszystkie konta założone, sekrety w GitHub Actions, infrastrukturę boksa Hetzner gotową do `docker compose up -d`**. Po tym kroku jeden push na `main` → publiczny URL (M1L5 zamknięte).

## Stack reference (z decyzji)

| Warstwa | Wybór | Cost |
|---|---|---|
| App host | Hetzner CX22 (Falkenstein/Helsinki) | €4.49/mo |
| Reverse proxy + TLS | Caddy (auto Let's Encrypt) | €0 |
| Database | Supabase Postgres (Frankfurt, free tier) | €0 |
| Container registry | GitHub Container Registry (GHCR) | €0 (free for public repos / public packages) |
| CI/CD | GitHub Actions | €0 (2000 min/mo free) |
| OAuth provider | Google Cloud Console (Calendar API) | €0 |
| Token encryption key | env var (libsodium master key) | €0 |
| Background jobs | Supabase `pg_cron` + `pg_net` → calls `/api/sync` | €0 |
| DNS / domain | TBD: OVH (.pl ~12 PLN/y) vs Cloudflare Registrar (.app ~$15/y) | €3–13/y |
| Email sender (password reset) | TBD: Resend (EU, free 100/d) vs Brevo (EU) vs Postmark | €0 |
| Backup storage | Cloudflare R2 (free 10 GB) | €0 |
| Monitoring (uptime) | UptimeRobot (free 50 monitors) | €0 |
| Monitoring (errors) | Sentry free tier (EU region) — opcjonalne | €0 |
| **TOTAL** | | **< €5/mo + ~€10/y domain** |

## Phase A — External accounts to register (in order)

Kolejność oddana po zależnościach (każdy późniejszy może potrzebować outputu wcześniejszego).

### A1. GitHub (already have)
- Account: `bpawlakj` ✅
- Repo: `bpawlakj/trainer-advisor` ✅
- **Do dorobienia:** Personal Access Token (PAT) z `write:packages` scope → GHCR auth z lokalnego Dockera (`docker login ghcr.io`). Lub Deploy Key na repo zamiast PAT dla SSH-deploy.
- **Sekrety w GitHub Actions** (settings → secrets and variables → actions) — wypełnić w kroku A4–A8:
  - `HETZNER_HOST` — IP boksa (Phase A3)
  - `HETZNER_SSH_KEY` — private key dla deploy usera
  - `GHCR_TOKEN` — albo `GITHUB_TOKEN` jeśli use built-in
  - `SUPABASE_DATABASE_URL` — pooled connection string (Phase A4)
  - `SUPABASE_DIRECT_URL` — direct connection (dla migracji)
  - `BETTER_AUTH_SECRET` — random 32-byte hex (generate locally)
  - `LIBSODIUM_MASTER_KEY` — random 32-byte hex (encryption key)
  - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Phase A5)
  - `RESEND_API_KEY` (or alt — Phase A6)
  - `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET` (Phase A7)
  - `APP_URL` — `https://<your-domain>`

### A2. Domain registrar — DECISION FIRST
- Two viable choices (Open Q #6 in stack decision):
  - **OVH** — `.pl` domain, ~12 PLN/y, polskie GUI. Recommended for Polish-only product.
  - **Cloudflare Registrar** — `.app` (~$15/y), at-cost pricing, requires Cloudflare DNS (which is fine — free tier).
- **Action:** wybrać domain name (np. `trener.app`, `traineradvisor.pl`), zarejestrować.
- **Output:** nameservery do skonfigurowania w DNS provider (krok A3).

### A3. Hetzner Cloud
- Sign-up: `https://accounts.hetzner.com/signUp` (Hetzner Cloud, NOT Hetzner Robot).
- **Account verification:** Hetzner sometimes asks for ID — załatwić od razu, blokuje resource creation.
- **Project:** "trainer-advisor".
- **SSH key:** dodać public SSH key do projektu (Settings → Security → SSH Keys). Lokalny klucz: `~/.ssh/id_ed25519_hetzner` (nie reuse'uj GitHub key — separation of concerns).
- **VM creation:**
  - Location: **Falkenstein** lub **Helsinki** (oba EU; Falkenstein bliżej Polski).
  - Image: **Ubuntu 24.04 LTS**.
  - Type: **CX22** (€4.49/mo post-April-2026).
  - Volume: brak (domyślne 40 GB dysku CX22 wystarczy na MVP).
  - Networking: domyślne IPv4 + IPv6.
  - SSH key: ten dodany powyżej.
  - User data (cloud-init): **WKLEIĆ zawartość `scripts/server-setup.sh`** (Phase B5 — zbootstrapuje box przy starcie).
- **Output:** publiczne IP (`HETZNER_HOST`), które trafia do DNS (krok A3.5) i GitHub secrets.

### A3.5. DNS (po Hetzner IP)
- W panelu domain registrar (OVH / Cloudflare):
  - `A` record: `@` → `<HETZNER_HOST>`
  - `AAAA` record: `@` → `<HETZNER_HOST_IPV6>`
  - `A` record: `www` → `<HETZNER_HOST>` (lub CNAME `@`)
- **Propagation:** ~5–60 min. Verify: `dig <domain>` z lokalnego terminala.

### A4. Supabase
- Sign-up: `https://supabase.com/dashboard/sign-up` (GitHub OAuth najszybciej).
- **New Project:**
  - Name: `trainer-advisor`
  - Database password: random 32+ char (zapisz w password manager, NIE w `.env.example`)
  - Region: **`Central EU (Frankfurt)`** (`eu-central-1`) — RODO requirement.
  - Pricing plan: Free.
- **Output (zapisz do GitHub secrets):**
  - `Settings → Database → Connection string`:
    - **Pooled** (port 6543, transaction mode) → `SUPABASE_DATABASE_URL` ← używane przez app.
    - **Direct** (port 5432) → `SUPABASE_DIRECT_URL` ← używane przez `drizzle-kit migrate`.
- **Extensions enable:** Database → Extensions → enable `pg_cron`, `pg_net`. Te będą wywoływać `/api/sync` co 5 min (konfiguracja po deployu w fazie implementacyjnej).
- **Keepalive note:** Free tier pauzuje po 7 dniach bez ruchu. `pg_cron` ping na `/api/sync` co 5 min sam to rozwiąże po deployu; do tego momentu uważaj.

### A5. Google Cloud Console (Calendar API OAuth)
- Sign-in: `https://console.cloud.google.com` (Google account).
- **New Project:** `trainer-advisor`.
- **APIs & Services → Library:** enable **Google Calendar API**.
- **APIs & Services → OAuth consent screen:**
  - User Type: **External** (Internal wymaga Google Workspace).
  - App name: `Trainer Advisor`
  - User support email: Twój
  - App logo: opcjonalnie (PNG)
  - App domain: `https://<your-domain>`
  - Authorized domains: `<your-domain>`
  - Developer contact: Twój email
  - **Scopes:** add `https://www.googleapis.com/auth/calendar.events.readonly` (read-only, per decyzja).
  - **Test users:** add Twój własny Gmail (dopóki app jest w `Testing` mode, tylko test users mogą się zalogować — przed publiczną wersją trzeba przejść Google review, dla MVP wystarczy Testing).
- **Credentials → Create Credentials → OAuth client ID:**
  - Application type: **Web application**
  - Name: `Trainer Advisor Web`
  - Authorized JavaScript origins: `https://<your-domain>`
  - Authorized redirect URIs: `https://<your-domain>/api/auth/callback/google`
- **Output:** `Client ID` + `Client secret` → GitHub secrets jako `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.

### A6. Email sender — DECISION FIRST
- Recommendation: **Resend** (per Open Q #5 hinted preference: EU region available, free 100 emails/day, dev-friendly DX, React Email-native).
- Sign-up: `https://resend.com` (GitHub OAuth).
- **Domain verification:** add SPF + DKIM records to your domain (DNS provider z A3.5). Status `Verified` zanim wysyłasz prod emaile.
- **API key:** `Resend Dashboard → API Keys → Create` → scope: `Sending access` → save jako `RESEND_API_KEY` (GitHub secrets).
- Alternative jeśli Resend dropuje free tier: Brevo (EU) lub Postmark.

### A7. Cloudflare R2 (backups + free tier)
- Sign-up: `https://dash.cloudflare.com/sign-up` (jeśli nie masz konta CF).
- **R2 → Create bucket:** `trainer-advisor-backups`, location: **EU (auto)**.
- **R2 → Manage R2 API Tokens → Create API token:**
  - Permissions: `Object Read & Write` na bucket `trainer-advisor-backups`.
  - TTL: brak (rotacja co rok manualnie).
- **Output:** `Access Key ID` + `Secret Access Key` + `Account ID` → GitHub secrets jako `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_ACCOUNT_ID` + `R2_BUCKET=trainer-advisor-backups`.

### A8. UptimeRobot
- Sign-up: `https://uptimerobot.com` (free tier 50 monitors).
- **New Monitor:**
  - Type: `HTTP(s)`
  - Friendly name: `Trainer Advisor`
  - URL: `https://<your-domain>/api/health`
  - Interval: 5 minutes
  - Alert contact: Twój email (default)
- Działa po deployu — endpoint `/api/health` musi zwracać 200 (zaimplementować w późniejszej inicjatywie).

### A9. Sentry — OPTIONAL (Open Q #8)
- Recommendation: **defer** dla MVP, dodać przed pierwszym non-founder trainerem.
- Jeśli teraz: Sentry account, project Next.js, region EU, `SENTRY_DSN` → GitHub secret.

## Phase B — Files to prepare locally (in order)

Każdy plik ma cel: albo deklaruje contract sekretów, albo automatyzuje setup serwera, albo orkiestruje deploy.

### B1. `.env.example` (commit do repo)
**Cel:** kanoniczny rejestr WSZYSTKICH zmiennych środowiskowych. Każde nowe konto z Phase A dorzuca tu jedną linię. `.env.local` (gitignored) ma realne wartości.

```bash
# App
APP_URL=https://your-domain.example
NODE_ENV=production

# Database (Supabase pooled for app, direct for migrations)
SUPABASE_DATABASE_URL=postgresql://postgres:<password>@<host>:6543/postgres?pgbouncer=true
SUPABASE_DIRECT_URL=postgresql://postgres:<password>@<host>:5432/postgres

# Better Auth
BETTER_AUTH_SECRET=<32-byte-hex>
BETTER_AUTH_URL=https://your-domain.example

# Google Calendar OAuth
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# Refresh-token encryption (libsodium crypto_secretbox)
LIBSODIUM_MASTER_KEY=<32-byte-hex>

# Email sender (Resend)
RESEND_API_KEY=<from-resend>
RESEND_FROM=trener@your-domain.example

# Backups (Cloudflare R2)
R2_ACCOUNT_ID=<from-cf>
R2_ACCESS_KEY_ID=<from-cf>
R2_SECRET_ACCESS_KEY=<from-cf>
R2_BUCKET=trainer-advisor-backups
```

**Walidacja w aplikacji:** `src/env.ts` z Zod schema parsing `process.env` — fail-fast jeśli czegoś brakuje (do dodania w fazie implementacyjnej Better Auth).

### B2. `.dockerignore`
**Cel:** zmniejszyć Docker build context. Wykluczyć `node_modules`, `.next`, `docs/`, `*.md`, `.git`, `.idea`, `.playwright-mcp`, `.env*` (sekrety zawsze przez build args lub runtime env).

### B3. `Dockerfile` (multi-stage, Next.js standalone output)
**Cel:** budować obraz produkcyjny do GHCR.

Standard pattern dla Next.js standalone:
1. **deps stage** — `node:22-alpine`, COPY `package.json` + `pnpm-lock.yaml`, `pnpm install --frozen-lockfile`.
2. **build stage** — COPY whole repo, `pnpm build` (Next.js produkuje `.next/standalone` jeśli włączysz `output: 'standalone'` w `next.config.ts`).
3. **runtime stage** — `node:22-alpine`, non-root user, COPY `.next/standalone` + `.next/static` + `public`. ENTRYPOINT `node server.js`.

Wymaga edycji `next.config.ts` → dodać `output: 'standalone'`.

### B4. `docker-compose.yml` (na boksie Hetzner, NOT lokalnie)
**Cel:** orkiestracja kontenera aplikacji + Caddy reverse proxy.

```yaml
services:
  web:
    image: ghcr.io/bpawlakj/trainer-advisor:latest
    restart: unless-stopped
    env_file: .env
    expose: ["3000"]
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
volumes:
  caddy_data:
  caddy_config:
```

### B5. `Caddyfile` (reverse proxy + auto TLS)
**Cel:** terminacja HTTPS, automatic Let's Encrypt cert via ACME, proxy do kontenera `web:3000`.

```caddyfile
your-domain.example {
    encode gzip
    reverse_proxy web:3000
}
```

(Caddy automatycznie zarządza certyfikatami Let's Encrypt jeśli domain rozwiązuje na IP boksa.)

### B6. `scripts/server-setup.sh` (cloud-init dla Hetzner CX22)
**Cel:** zbootstrapować świeży Ubuntu 24.04 box do stanu "ready for docker compose up".

Operacje:
1. `apt update && apt upgrade -y`
2. Install: `docker.io`, `docker-compose-plugin`, `ufw`, `fail2ban`, `unattended-upgrades`
3. UFW: allow 22 (SSH from any — albo `from <your-ip>` jeśli statyczne), allow 80, allow 443, deny rest, enable.
4. Create deploy user `deploy` z `usermod -aG docker deploy`.
5. Configure unattended-upgrades for security patches.
6. Enable fail2ban with SSH jail.
7. `mkdir /home/deploy/app && chown deploy:deploy /home/deploy/app`.
8. Print: "Setup complete. Add deploy SSH key to /home/deploy/.ssh/authorized_keys."

Skrypt wkleisz w "Cloud config / User data" przy tworzeniu CX22 → Hetzner odpali go przy boot.

### B7. `scripts/backup-postgres.sh` (uruchamiany przez Supabase pg_cron lub lokalnie)
**Cel:** nightly `pg_dump` → encrypted gzip → upload do R2.

Operacje:
1. `pg_dump $SUPABASE_DIRECT_URL --no-owner --no-acl | gzip | openssl enc -aes-256-cbc -pbkdf2 -pass pass:$BACKUP_ENC_PASS`
2. `aws s3 cp - s3://$R2_BUCKET/$(date +%Y-%m-%d).sql.gz.enc --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com`

Wymaga `awscli` lub `rclone` na maszynie wykonującej (boks Hetzner lub GitHub Actions scheduled workflow).

### B8. `.github/workflows/deploy.yml`
**Cel:** CI pipeline: lint → typecheck → test → build Docker image → push do GHCR → SSH na Hetzner → `docker compose pull && up -d`.

Job structure:
1. `checkout`
2. `pnpm install`
3. `pnpm build` (smoke test — actually rebuilds w Docker, ale verify lokalnie zielony)
4. `docker/login-action` → GHCR
5. `docker/build-push-action` → tag `ghcr.io/bpawlakj/trainer-advisor:latest` + `:<sha>`
6. `appleboy/ssh-action` → SSH na `$HETZNER_HOST` jako `deploy` user → `cd ~/app && docker compose pull && docker compose up -d`
7. (optional) curl `https://$APP_URL/api/health` to verify deploy.

Triggers: `push` to `main`, `workflow_dispatch` (manual run).

### B9. `.github/workflows/backup.yml` (scheduled)
**Cel:** odpalać `backup-postgres.sh` codziennie (alternatywa dla pg_cron-driven backup).

Trigger: `schedule: cron: '0 2 * * *'` (2 AM UTC = 3/4 AM CET).

### B10. `.github/dependabot.yml`
**Cel:** auto-PRs dla aktualizacji `npm` deps i GitHub Actions versions. Tygodniowy schedule.

(NIE dotyczy Biome/Lefthook które są intentionally version-pinned per AGENTS.md — Dependabot dotyczy reszty.)

### B11. `next.config.ts` (edit existing)
**Cel:** włączyć `output: 'standalone'` żeby Dockerfile mógł skopiować minimalny runtime bundle.

### B12. `src/app/api/health/route.ts`
**Cel:** endpoint dla UptimeRobot + smoke testu po deployu. Zwraca JSON `{ status: "ok", commit: process.env.GIT_SHA }`.

(Do zaimplementowania w fazie infrastrukturalnej, nie wymaga DB/auth — najprostszy pierwszy endpoint po deployu.)

## Phase C — Order of operations summary

Linearne ścieżki bez równoległości (każda zależy od poprzedniej):

```
1. Domain registrar (A2)         ──┐
2. Hetzner Cloud account (A3)      │
3. Create CX22 VM (A3)             │
4. DNS: A record → IP (A3.5)       │ ~30–60 min, wait for propagation
                                   │
5. Supabase project (A4)         ──┤
6. Google Cloud OAuth setup (A5) ──┤
7. Resend signup + DNS records (A6) ──┤
8. R2 bucket + API token (A7)    ──┤
                                   │
9. ───────── Files: B1–B12 in repo (locally, in parallel with A3–A8) ─
                                   │
10. Add all secrets to GitHub (A1) │ (consumes outputs of A3–A8)
                                   │
11. Add ServerSetup.sh via cloud-init OR run manually on Hetzner (B6)
                                   │
12. Test SSH access to Hetzner box │
                                   │
13. Push to main → GitHub Actions deploys (B8)
                                   │
14. Verify public URL renders Next.js shell
                                   │
15. Add UptimeRobot monitor (A8) on /api/health
                                   │
16. M1L5 closed.
```

## Critical files (the plan calls for creating these)

### To CREATE (new files):
- `.env.example` (root) — secret contract
- `.dockerignore` (root)
- `Dockerfile` (root) — multi-stage Next.js standalone
- `docker-compose.yml` (root) — for deploy on Hetzner box
- `Caddyfile` (root) — reverse proxy + ACME
- `scripts/server-setup.sh` — Hetzner cloud-init
- `scripts/backup-postgres.sh` — encrypted dump to R2
- `.github/workflows/deploy.yml` — CI/CD
- `.github/workflows/backup.yml` — scheduled backups
- `.github/dependabot.yml` — auto deps PRs
- `src/app/api/health/route.ts` — health check endpoint

### To EDIT (existing files):
- `next.config.ts` — add `output: 'standalone'` for Dockerfile compatibility
- `.gitignore` — add `.env.local`, `.env.production`, `caddy_data/`, `caddy_config/`
- `package.json` — add deploy-related scripts (optional: `db:migrate`, `db:generate`, `start:prod`)

### Reused from existing context:
- `.claude/settings.json` — already has permission policy (M1L3); `ask` list includes `Bash(docker *)`, `Bash(ssh *)`, `Bash(curl *)`, `Bash(git push *)` so deploy operations pause for confirmation.
- `AGENTS.md` § Conventions — already encodes Drizzle `generate+migrate`, Supavisor `prepare: false`, `requireAuth()` per-page conventions that the deploy and DB code must follow.

## Decisions to make BEFORE execution (resolve via implementation prompts, not now)

1. **Domain name + registrar.** Recommend: `.app` via Cloudflare Registrar IF you want global reach + at-cost pricing; `.pl` via OVH IF strictly Polish-market. ~€10–15/y either way.
2. **Email provider.** Recommend Resend (EU, free 100/d, React Email-native). Fallback Brevo if Resend free tier dies.
3. **GHCR public vs private.** Public is free unlimited; private is free up to 500 MB. App image is ~150 MB → fits private. Recommend **private** (don't leak unnecessary detail of the app's internals).
4. **R2 backup encryption passphrase.** Generate 32-char passphrase, store in password manager AND `R2_ENC_PASS` GitHub secret.
5. **Hetzner location.** Falkenstein (DE) lub Helsinki (FI). Both EU, both <50ms from Warsaw. Recommend **Falkenstein** (closer + same data residency as Supabase Frankfurt = no cross-border traffic).
6. **Sentry now or later.** Recommend **defer** until first non-founder user — for solo dev MVP UptimeRobot + GitHub Actions logs are enough.

## Verification (end-to-end smoke test after all phases done)

1. **Accounts:** Wszystkie konta z Phase A założone, każdy sekret z `.env.example` ma wartość w GitHub Actions secrets.
2. **DNS:** `dig <domain>` zwraca A record na IP Hetzner. `dig _resend._domainkey.<domain>` zwraca SPF/DKIM records.
3. **Hetzner box:** `ssh deploy@<host>` z lokalnego laptopa działa. `docker --version` + `docker compose version` zwracają wersje. UFW status: 22/80/443 open, reszta deny.
4. **GitHub Actions:** trigger manual workflow (`workflow_dispatch`) — wszystkie jobs zielone, image w GHCR widoczny pod `https://github.com/bpawlakj/trainer-advisor/pkgs/container/trainer-advisor`.
5. **Application:** `curl https://<domain>/api/health` zwraca `200 OK` + JSON. Otwórz w przeglądarce — widoczny Next.js shell (default landing page z Phase 1 M1L3).
6. **TLS:** `curl -vI https://<domain>` pokazuje `Let's Encrypt` certificate, ważny.
7. **Supabase:** `psql $SUPABASE_DIRECT_URL -c "SELECT version();"` z lokalnego laptopa zwraca PG version. Extensions `pg_cron`, `pg_net` enabled.
8. **Google OAuth (smoke):** `https://<domain>/api/auth/google/sign-in` redirectuje na Google consent screen (po implementacji Better Auth — to jest Phase 2 work).
9. **UptimeRobot:** monitor `Up` po 5 minutach, email alert test wysłany manualnie.
10. **Backup:** uruchom `backup-postgres.sh` manualnie, sprawdź obecność pliku `.sql.gz.enc` w R2 bucket. Restore test: pobierz, odszyfruj, `psql` import na scratch DB.

Jeśli wszystkie 10 punktów passes → **M1L5 close**, można robić PR na 10xDevs Arena z public URL.

## Out of scope for this plan

- Implementacja kodu Better Auth + Drizzle schema + next-intl + biz logic — to jest M2 work, tracked jako osobne inicjatywy w `docs/work/002-...`, `003-...` etc.
- Email templates (React Email) — wymagane gdy Better Auth password reset jest wired.
- Monitoring zaawansowany (Sentry, Grafana) — defer.
- Multi-tenant rollout — v2.
- 2FA na app account — Open Q #7, decyzja w trakcie M2.
