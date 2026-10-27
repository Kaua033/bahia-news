# Architecture Summary — bahia-news (run-1)

**Target**: `/home/kaua/bahia-news` @ `4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d` (clean). PT-BR news portal "Diário do Farol / Bahia News". No prior runs exist; all units seeded `prior_status: none`.

## Product, principals, authority
Anonymous visitors read articles (client-fetch of `/api/news`); authenticated role ADMIN/EDITOR holders reach `/admin/:path*` via NextAuth v4 Credentials+JWT (`lib/auth.ts`). Content lives at NewsAPI.org, proxied server-side with the `NEWSAPI_KEY`; the Prisma/Postgres layer (articles, categories, comments) has **no active write paths** — admin pages (`app/(admin)/**`), the TipTap editor, `lib/sanitize.ts`, `lib/auth-helpers.ts#requireAuth`, `lib/security-log.ts`, and the `articleSchema`/`categorySchema` validators are declared-but-unwired (grepped: zero call sites). Single tenant; `Article.authorId` never enforced anywhere.

## Stack + deployment paths
Next.js 14.2.3 (App Router, strict TS), React 18, NextAuth 4.24 (JWT 1h, cookie httpOnly/Lax, `secure` gated on NODE_ENV), Prisma 5.14 + PostgreSQL (`relationMode="prisma"`, env `DATABASE_URL`/`DIRECT_URL`), Zod, bcryptjs (cost 12), DOMPurify+JSDOM (unused), Tailwind, Cloudinary SDKs (unused). Deployment modes: (a) Docker — multi-stage node:20-alpine, non-root `nextjs`, standalone iff `DOCKER_BUILD=true` (`next.config.js:26`); compose entrypoint `npx prisma@5.14.0 db push && node server.js`; (b) Vercel — git history only (`newsapi` error copy, `postinstall`, Neon pooler commits); no `vercel.json` in repo. Deterministic switch: that single env var.

## Entry surfaces → sinks
1. `GET /api/news` (`app/api/news/route.ts`): unauthenticated. `x-forwarded-for`/`x-real-ip` → in-memory rate limit (10/min); `q` (≤100 chars via Zod, else 400) → hard-coded `newsapi.org/v2/everything` fetch with key in URL query; upstream body `console.error` (log sink); upstream JSON returned **unvalidated** except `[Removed]` filter + 12-item slice; poisoned-key error messages echoed; `{next:{revalidate:300}}` data cache on URL.
2. `GET/POST /api/auth/[...nextauth]`: NextAuth credentials login (Zod loginSchema, per-IP limiter, per-email 5-fails/15-min lockout Map, `prisma.user.findUnique`, `bcrypt.compare`, JWT with role+id). Not covered by middleware matcher.
3. `middleware.ts` sole gate for `/admin/:path*` + `/api/admin/:path*`: `!!token` presence only, no role check; `callbackUrl` = request pathname echo; `/api/admin/*` matches **no existing routes**.
4. Public client pages `(public)/page.tsx`, `artigo/[slug]`, `categoria/[slug]` (`"use client"`): render third-party feed JSON — `article.url` → `<a href>` sink (6 sites, `target="_blank" rel="noopener noreferrer"`, no scheme validation), `urlToImage` → `<Image unoptimized>` (browser loads any https URL), title/author/content escaped by React; slug → `?q=` fetch (none >100 chars enforced client-side).
5. `next.config.js`: CSP global (`script-src` `'unsafe-eval'` `'unsafe-inline'`; `img-src https: data: blob:`; `connect-src` newsapi+cloudinary; frame-ancestors/upgrade), HSTS preload, `images.remotePatterns`: cloudinary (env cloud), `picsum.photos`, `media.base44.com` (host-qualified any-path).
6. Deploy overlay: `docker-compose.yml` publishes Postgres `:5432` to host by default, requires `POSTGRES_PASSWORD`; injects all secrets as env; Dockerfile non-root, dumb-init, `npm ci` (lockfile v3, integrity hashes only-registry.npmjs.org).
7. `prisma/seed.ts`: admin `ADMIN_EMAIL`/`ADMIN_PASSWORD` **fallback `admin@bahianews.com.br`/`admin123`**, bcrypt 12. Seed script is manual (`npm run db:seed`), not in compose entrypoint.

## Comparables
NextAuth v4 credentials+JWT pattern (docs-canonical); NewsAPI proxy pattern (typical key-held-server-side). Calibration anchor, not license: Next 14.2.x line predates patched releases (lockfile `package-lock.json:6653` carries the npm deprecation/security advisory for the pinned `next@14.2.3`).

## Trust boundaries and strongest source-visible control
| # | Boundary | Strongest control |
|---|---|---|
| B1 | anonymous URL/header → `/api/news` limiter | `lib/rate-limit.ts#checkRateLimit` (IP from client-controllable header) |
| B2 | anonymous `q`/upstream JSON → outbound fetch / log / browser | `lib/validations.ts#newsQuerySchema` (`q` ≤100); **no upstream-response schema** |
| B3 | anonymous → `/admin` pages / future `/api/admin` | `middleware.ts#authorized` (token presence only; role claim never checked) |
| B4 | attacker → login control state | `lib/auth.ts#authorize` (per-IP limiter keyed on XFF + per-email lockout Map) |
| B5 | credential → identity | bcrypt 12 + JWT signed with `NEXTAUTH_SECRET`; **no revocation list** (`isActive` at next login only) |
| B6 | third-party feed → browser DOM | React escaping + CSP baselines (`unsafe-inline/eval` script-src; `img-src https:`) |
| B7 | environment/registry → container | compose env vars (no defaults for secrets), lockfile `npm ci`; **boot-time unbound `npx prisma@5.14.0`** |
| B8 | seed env → privileged account | env-only override; weak hardcoded defaults in source |

## Prior coverage / gaps
No prior ledgers. All 14 units are first-seen work; none carried.

## Companion selection (per attack classes found)
Selected: **WEB-PROTOCOL-AND-AUTH.md** (credentials login, JWT/cookie, forwarded headers, API key in URL — B1–B5,B7); **CLIENT-SIDE.md** (third-party JSON → href/img sinks, CSP, clickjacking — B2,B3,B6); **CLOUD-AND-DEPLOYMENT.md** (compose ports/secrets/overlay, seed defaults — B7,B8); **SUPPLY-CHAIN-AND-RELEASE.md** (lockfile resolution, boot-time npx, advisory-pinned next — B7); **RESOURCE-EXHAUSTION-AND-AVAILABILITY.md** (limiter maps, pre-auth proxy quota, no fetch timeout — B1,B2,B4); **DATA-ISOLATION-AND-LIFECYCLE.md** (stale-JWT after `isActive=false`; latent moderation/lifecycle defaults — B3,B5). Excluded repo-wide with source facts: **AI-AND-LLM.md** (no model/tool-call code), **DESKTOP-MOBILE-AND-LOCAL-IPC.md** (no webview/deep-link/IPC code), **PROTOCOLS-RPC-AND-MESSAGING.md** (no broker/webhook/gRPC code), **MEMORY-SAFETY-AND-BINARY.md** (no native/binary parsers).

## Local execution limits
No `node_modules`; `npm ci` needs network (prohibited for target execution). No tests exist. Node v26 runs plain `.ts` (type stripping) so pure modules (`lib/rate-limit.ts`, `lib/validations.ts`, `lib/sanitize.ts` needs dompurify absent) are runnably checkable with stubs; route-to-DB/e2e paths (Prisma/NextAuth runtime, Google Fonts build) cannot execute locally. Sandbox capability verified: `unshare -U -r -n` (loopback-only netns), bubblewrap `--ro-bind/--clearenv/--unshare-net`, `systemd-run --scope` MemoryMax/CPUQuota/TasksMax, `prlimit`/`timeout`. Parent-side promotion via Node O_NOFOLLOW/O_EXCL descriptors feasible (offline-verified APIs).
