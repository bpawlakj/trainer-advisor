// Health endpoint — consumed by UptimeRobot, docker-compose healthcheck, and
// the GitHub Actions post-deploy smoke test. Intentionally minimal: must not
// require DB/auth/config to be wired (those land in later initiatives).
//
// Returns 200 with a tiny JSON envelope so UptimeRobot's keyword check can
// match "ok" if ever needed.

import { NextResponse } from "next/server";

// Disable any RSC/route cache — health must reflect the live container,
// not a cached value from an earlier deploy. AGENTS.md § requireAuth() note
// flags App Router caching as a multi-tenant footgun; the same caching
// reflex would make a health endpoint lie about a stale instance.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: "ok",
      service: "trainer-advisor",
      commit: process.env.GIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Defence in depth even with `dynamic = 'force-dynamic'`.
        "Cache-Control": "no-store",
      },
    },
  );
}
