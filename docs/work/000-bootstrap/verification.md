# Bootstrap verification — M1L3

Initiative: `000-bootstrap`
Date: 2026-05-23
Stack basis: `docs/analyzes/language-and-infrastructure-stack-decision.md`
Layout basis: `docs/analyzes/project-structure-trainer-advisor-decision.md`

## Phase 1 — Pre-scaffold

| Check | Status | Note |
|---|---|---|
| Git repository initialized | passed | Local + `origin git@github.com:bpawlakj/trainer-advisor.git` |
| Stack decision frozen on disk | passed | Next.js 15+ (App Router) + TS + Tailwind 4 + pnpm |
| Layout decision frozen on disk | passed | `src/` directory + route groups + `[locale]` (Phase 2) |
| Node available | passed | Node 26.0.0 present locally; `.nvmrc` pins to 22 for deploy parity |
| pnpm available | installed | `npm install -g pnpm` → 11.2.2 |

## Phase 2 — Scaffold

| Step | Command | Status |
|---|---|---|
| Bare Next.js scaffold | `pnpm dlx create-next-app@latest <temp> --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint=false --use-pnpm --yes` | passed |
| Sync generated files into repo | (manual cp, skipping `README.md`, `.gitignore`, `node_modules`, `pnpm-lock.yaml`, `eslint.config.mjs`) | passed |
| Project name rewritten in `package.json` | `ta-scaffold` → `trainer-advisor` | passed |
| ESLint scripts/deps removed | per layout decision (Biome replaces ESLint+Prettier; Biome wiring is Phase 2 work) | passed |
| `.gitignore` merged | Next.js entries (`.next/`, `.vercel`, `next-env.d.ts`, `*.tsbuildinfo`, `.pnp.*`, `.yarn/*`) added to existing | passed |
| `.nvmrc` written | `22` (decision: Node 22 LTS pinned) | passed |
| `pnpm install` | After `pnpm approve-builds sharp` (sharp required for Next.js image optimization) | passed |
| `pnpm build` | Static prerender succeeds: `/`, `/_not-found` | passed |

## Phase 3 — Post-scaffold audit

`pnpm audit --prod`:

| Severity | Count | Detail |
|---|---|---|
| critical | 0 | — |
| high | 0 | — |
| moderate | 1 | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — `postcss < 8.5.10` XSS via unescaped `</style>` in CSS stringify. Transitive via `next` → `postcss`. Patched in `>= 8.5.10`; needs Next.js minor bump or override in `package.json` `pnpm.overrides`. Not exploitable for our static-build server-rendered output; track and bump when Next.js publishes a release with patched postcss. |
| low | 0 | — |

Decision on postcss CVE: **deferred, not blocking**. Trainer Advisor does not let users author CSS at runtime — postcss runs only at build time in trusted context. Re-evaluate when Next.js 16.3 / 17 lands.

## Phase 4 — Permission policy (M1L3 in-execution gate)

Written `.claude/settings.json` with the canonical M1L3 policy:

- **allow**: `pnpm *`, `npm *`, `npx *`, `node *`, all local git operations (`add`, `commit`, `diff`, `log`, `status`, `branch`, `checkout`, `stash`), and the in-tool `Read` / `Edit` / `Write` primitives.
- **ask**: `curl *`, `wget *`, `git push`, `docker *`, `docker compose *`, `ssh *`, `scp *`. Network egress and remote-state changes pause for confirmation.
- **deny**: `Bash(rm -rf *)`. Unconditional block — agent never has the option to execute a recursive force-delete.

`.claude/settings.local.json` (machine-specific) stays in `.gitignore`.

## Scope explicitly NOT covered by this initiative

The following are decided but **not** wired up in Phase 1. Each becomes its own initiative under `docs/work/`:

- Better Auth integration (`src/lib/auth.ts`, schema, middleware composition with next-intl).
- Drizzle setup (`drizzle.config.ts`, `src/db/schema/<entity>.ts`, `src/db/queries/<entity>.ts`, Supavisor pooled/direct URL split).
- next-intl routing (`src/i18n/routing.ts`, `src/i18n/request.ts`, `src/messages/pl.json`, `[locale]` segment).
- Route groups: `(marketing)`, `(auth)`, `(protected)` directories under `src/app/[locale]/`.
- Biome config (`biome.json`, version-pinned per decision).
- Lefthook config (`lefthook.yml`, version-pinned per decision).
- Vitest + Playwright + PGlite test scaffolding.
- React Email + Resend.
- PWA manifest (`src/app/manifest.ts`) + icons.
- GitHub Actions → GHCR → SSH deploy workflow.

Rationale for the split: M1L3 produces a **runnable shell** + **safety policy** + **audit report**. The wiring above is implementation work (M2 territory in the course), tracked separately so each piece can be planned and atomized in isolation.

## Verdict

**passed (with one deferred moderate CVE)**. Project boots, `pnpm build` succeeds, permission policy in place. Ready for M1L4 (`/agents-md`) and the per-feature initiatives that wire up auth, DB, i18n, tests, deploy.
