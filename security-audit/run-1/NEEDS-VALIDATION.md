# NEEDS-VALIDATION — bahia-news run-1 (standard, sandboxed source-and-local-only)

Source ref: 4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d (clean). These are the run's unresolved
leads: repository-anchored root causes whose decisive remaining fact is a deployment,
identity, registry, or browser-internal observation the repo cannot prove. They are
prioritized leads WITHOUT severity — not confirmed vulnerabilities. One record per
final fingerprint, copied verbatim from findings.json (each Phase-5 verified).


---

## app/api/news/route.ts.pre-auth-upstream-spend.no-global-cap

**Title.** Unauthenticated GET /api/news turns free anonymous requests into operator-metered newsapi.org spend with no aggregate cap anywhere in the repository: the only repo-visible bound is a per-key 10/60s limiter whose intended envelope (600/h per key) can drain a ~100 req/day developer plan in ~10 minutes at max honest pace (operator's actual plan external and unresolved)

### Claimed root cause (source-anchored)

The pre-authentication upstream path has no aggregate quota/cost control anywhere in the repository: every allowed anonymous request is a direct operator-metered outbound call, and the only repo-visible bound (the per-key lib/rate-limit.ts limiter) is not global and is keyed on a client-influenceable identity (key-spoofing facet owned by the pending T1 record, cited as a condition), so its intended honest envelope (10/min sustained = 600/h per key; Q-unit quota drained in ~Q/10 minutes) is disproportionate to commonly reported free developer plans by up to two orders of magnitude per day — the operator's actual plan quota being external and unobserved.

### Trace

1. **entrypoint** `app/api/news/route.ts:9` — app/api/news/route.ts#GET /api/news — unauthenticated GET with the rate gate evaluated first (lib/rate-limit.ts is the sole repo-visible volume bound)
2. **propagation** `app/api/news/route.ts:29` — lib/validations.ts#newsQuerySchema — q read from searchParams and validated (string <=100 chars, lib/validations.ts:57-62, route.ts:31-37); attacker varies q to mint new cache keys and new first-hit upstream calls
3. **propagation** `app/api/news/route.ts:41` — app/api/news/route.ts#GET /api/news — NEWSAPI_KEY configured is the only precondition; no authentication/authorization dimension exists on this route
4. **propagation** `app/api/news/route.ts:49` — app/api/news/route.ts#upstream fetch to newsapi.org — outbound fetch to newsapi.org/v2/everything with the operator key in the URL query (route.ts:52); {next:{revalidate:300}} at :53 — cache keyed by the full URL including attacker q and the secret
5. **propagation** `app/api/news/route.ts:49` — app/api/news/route.ts#error handling — route.ts:56-63,83-88 — error paths return once without retry/backoff; no error response is cached
6. **sink** `app/api/news/route.ts:49` — app/api/news/route.ts#aggregate upstream spend — aggregate — no process/tenant/day counter exists repo-wide (route.ts:9-46 has exactly three guard statements — limiter :14, validation :32, key precondition :41; lib/rate-limit.ts:1-27 holds only the per-key Map counter); intended per-key envelope 10/min sustained = 600/h: a plan quota of Q units drains in ~Q/10 minutes (6 s per allowed call) of honest sustained use, e.g. a 100-unit free tier in ~10 minutes, and with limiter keys attacker-influenceable (pending T1 record, condition) no aggregate cap applies across distinct keys; total operator spend bound = operator plan quota (external, unobserved) x per-key envelope

### Verified evidence

- `app/api/news/route.ts:13` — Sole repo-visible volume bound ahead of the outbound call is the per-key limiter call; the only other pre-fetch branches are input validation (route.ts:32) and the NEWSAPI_KEY precondition (route.ts:41) — none bounds aggregate volume
- `lib/rate-limit.ts:3` — WINDOW_MS=60_000 (line 3) and MAX_REQUESTS=10 (line 4) parsed verbatim from source: intended per-key envelope 10/min sustained = 600/h = 14400/day; the module contains only the single per-key Map counter (no global/aggregate/plan/day dimension)
- `app/api/news/route.ts:49` — One outbound HTTPS call per allowed request that reaches the fetch, carrying the shared operator NEWSAPI_KEY in the URL query and pageSize=20 fixed server-side (route.ts:52){next:{revalidate:300}}
- `app/api/news/route.ts:53` — {next:{revalidate:300}} — repo-visible mitigation serving repeat identical q from the Next data cache within 300s; per-unique-q cache-cardinality growth and framework storage/eviction behavior remain unresolved
- `app/api/news/route.ts:9` — Surface is unauthenticated; middleware.ts:49-51 matcher ["/admin/:path*","/api/admin/:path*"] does not gate /api/news (verified from source)

### Exact blocker(s)

1. Operator's actual NewsAPI.org plan quota/rate envelope is not in the repository — it decides whether the intended per-key envelope (Q-unit quota drained in ~Q/10 minutes of honest sustained repetition at max rate, 600/h) can drain or bill the plan; owner observation: account dashboard quota/usage and, if present, the x-ratelimit-* headers newsapi.org returns on the service's own normal operating traffic — no live probing.
2. Deployed production ingress handling of client-supplied X-Forwarded-For (verbatim pass-through vs normalization/stripping) — not visible in the repository and not observable from source; docker-compose.yml:24-25 (direct port publish) provides at least one shipped direct-termination mode, but the production topology is unobserved; this conditions the honest per-key envelope and intersects the pending T1 record (limiter key client-influenceability), which owns that facet.
3. Next.js runtime data-cache behavior for {next:{revalidate:300}} fetches in the deployed environment (per-instance in-memory vs on-disk .next/cache persistence, eviction policy/size caps, multi-instance multiplicity) — framework internals absent from the repository; decides the unique-q cache-cardinality amplification contribution.

### Bounded local resolution step

Sandboxed harness reproduced the bound shape from target source (agents/verifier-b/artifacts/observed-no-additional-cap.mjs output to agents/verifier-b/artifacts/observed-no-additional-cap.json), run under the parent recipe's controls — env -i with two allowlisted dummy variables, loopback-only network namespace (no network call attempted: fetch stubbed), timeout 120, prlimit as/nproc/fsize caps, repo and toolchain read-only, plus a scratch-only writable bind so the target-controlled process could write its artifact: at pinned commit 4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d it verbatim-extracts route.ts:49-54, re-evaluates the construction with a stub fetch, and confirms a single upstream host (newsapi.org), one apiKey parameter carrying the operator key, pageSize=20, init {next:{revalidate:300}}, and no conditional/cap dimension (any allowed request yields exactly one billable call); the route.ts:9-46 guard inventory shows exactly three if-statements (limiter :14, validation :32, key precondition :41); WINDOW_MS/MAX_REQUESTS are parsed verbatim from lib/rate-limit.ts:3-4 giving 10/min = 600/h per key and a Q-unit quota drain in ~Q/10 minutes (example: 100-unit free tier in 10 exact 60s windows); a negative scan of lib/rate-limit.ts:1-27 shows no global/aggregate/day/plan counter. Correction vs prior artifacts: observed-quota-velocity.json's 'Q minutes' and the units' 'Q/6 minutes' overstate the drift-to-quota time at max honest pace — the verbatim-constant recomputation gives 6 seconds per allowed request (Q/10 minutes), matching the candidate description's ~10-minute free-tier drain example. No node_modules dependency was needed and repo-wide greps show no other limiter beyond the shared per-key module (lib/auth.ts reuses it for login attempts only).

### Owner-observed deployment check

Owner-observed checks (non-destructive, no live upstream probing): (1) read the operator's NewsAPI.org plan quota and current usage from their account dashboard and from any x-ratelimit-* headers present on upstream responses during the service's own normal traffic, then compare against the repo-source envelope 10/min per key (600/h) computed above; (2) confirm from their own ingress logs/configuration whether the production ingress rewrites, preserves, or strips client X-Forwarded-For — one shipped direct-termination mode exists (docker-compose.yml:24-25), production topology unobserved; this conditions the honest single-IP drain rates and intersects the pending T1 record which owns the key-spoofing facet; (3) inspect deployed .next/cache growth and per-instance/multi-instance persistence behavior after a bounded (e.g. <=20 request) unique-q test series of the owner's own traffic only, to size the cache-cardinality amplification, while identical q should demultiplex within the 300s window per route.ts:53.
---

## docker-compose.yml:10-11.postgres-host-port-publish

**Title.** Shipped compose overlay publishes the Postgres management port to the host by default with no bind restriction or network isolation

### Claimed root cause (source-anchored)

docker-compose.yml:10-11 publishes the DB management listener to the host by default with no loopback bind or network isolation override

### Trace

1. **entrypoint** `docker-compose.yml:11` — services.postgres.ports — exposure entrypoint: services.postgres.ports maps the entry '- ${POSTGRES_PORT:-5432}:5432' under a ports: key declared at line 10 - compose short syntax without a host-IP prefix, creating a host publish rule whose default bind address is all host interfaces; renders '5432:5432' on an empty variable set
2. **propagation** `docker-compose.yml:8` — services.postgres.environment — propagation: the only surfaced database credential is POSTGRES_PASSWORD, interpolated bare ('${POSTGRES_PASSWORD}') with neither default nor :? required guard, so it renders empty string on an empty variable set; the app shares the identical variable (line 27), so one deploy-time secret gates the management plane for both the app and any host-side actor
3. **propagation** `docker-compose.yml:3` — services.postgres.image — propagation: image: postgres:16-alpine (mutable tag, no digest pin) - the published listener is the Postgres engine's management plane; the file attaches no user:/read_only/cap_drop/cap_add/tmpfs/mem_limit/ulimits/sysctls/security_opt constraint to this service
4. **propagation** `docker-compose.yml:27` — services.app.environment — propagation: DATABASE_URL renders 'postgresql://bahia_news:@postgres:5432/bahia_news' on an empty variable set - plaintext postgres protocol with no sslmode anywhere in the file, on the default bridge network (no networks: block); confirms the app and the published management plane are gated by the same user/password variable chain
5. **sink** `docker-compose.yml:11` — services.postgres.ports — sink/boundary effect: the host-side bound port for 5432 created by this ports entry - any actor able to route to the bound host interface can speak the pg wire protocol as POSTGRES_USER 'bahia_news' (owner of the created database), gated only by the single shared POSTGRES_PASSWORD

### Verified evidence

- `docker-compose.yml:11` — ports entry '- ${POSTGRES_PORT:-5432}:5432' with no host-IP prefix; POSTGRES_PORT occurs nowhere else in the repo, and no other compose file, .env* fixture, override, or deploy doc exists to restrict it
- `docker-compose.yml:10` — ports: key of the postgres service - the only publication mapping of the DB management plane in the shipped overlay, as a short-syntax list entry
- `docker-compose.yml:8` — POSTGRES_PASSWORD interpolated bare; zero '${VAR:?required}' guards exist in the file (render count 0), so a missing secret renders empty instead of failing fast
- `docker-compose.yml:7` — POSTGRES_USER defaults to 'bahia_news'; the same user appears in DATABASE_URL (line 27) and the healthcheck (line 15) - one management-plane identity
- `docker-compose.yml:27` — DATABASE_URL interpolation shows the app shares the identical user/password/database chain over plaintext postgres protocol (no sslmode anywhere in the file)
- `docker-compose.yml:39` — app entrypoint at lines 39-40 is 'sh -c' running npx prisma@5.14.0 db push && node server.js - the shipped boot path pushes schema against this postgres service, so the exposed DB is the populated business database, not an ephemeral fixture; the entrypoint's supply-chain aspect and the seed fallback are peer-owned units, cited as conditions only

### Exact blocker(s)

1. Deployment fact: whether the active deployment for this overlay actually holds a host listener for 5432 and on which bind address - the repo neither pins a compose/engine version nor carries the deployed object, and an out-of-repo override (docker-compose.override.yml, compose -f selection, docker-run variant) could bind 127.0.0.1, a private address, or drop the port. Owner check (non-destructive): on the deploy host run docker inspect --format '{{json .NetworkSettings.Ports}}' on container bahia-news-db plus ss -ltnp 'sport = :5432' (or netstat), and read host firewall/security-group rules for 5432; a loopback/private bind or a deny rule means exposure is already remediated and the candidate reduces to hardening.
2. Deployment fact: which lower-trust network segments can route to the deployment host's 5432 (VPC/office LAN/home-router port-forward, cloud load balancer) - no repo artifact settles internet- or peer-segment reachability, and the repo contains no deploy documentation at all. Owner check: read the router/NAT port-forwarding, firewall, and cloud security-group configuration governing the deploy host (never probe from outside).
3. Deployment fact: the actual value and potency of POSTGRES_PASSWORD supplied at deploy time - the local render exercises only the empty-string case; an empty value also aborts the postgres image's own init (image-internal behavior, cited as not-source, observable in the container's startup logs). Owner check: on the deploy host run test -n '${POSTGRES_PASSWORD}' and assess the sourced value's entropy, without exfiltrating the secret.

### Bounded local resolution step

Re-run agents/verifier-j/artifacts/observed-compose-render-j.mjs under the parent-approved sandbox (env -i empty environment; unshare -U -r -n loopback-only network namespace; bwrap --ro-bind / for a read-only target; prlimit caps 4 GiB address space / 128 processes / 64 MiB per-file writes; node --max-old-space-size=512; no docker or container-engine invocation): it independently re-confirms at commit 4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d that services.postgres ports render to '5432:5432' (app '3000:3000') with no host-IP prefix on any short-syntax entry, zero '${VAR:?...}' guards anywhere in the file, POSTGRES_USER -> bahia_news, POSTGRES_PASSWORD -> empty string, DATABASE_URL -> 'postgresql://bahia_news:@postgres:5432/bahia_news' (plaintext, no sslmode), absence of networks/expose/profiles/cap_drop/cap_add/read_only/tmpfs/mem_limit/user/sysctls/security_opt keys, and absence of any 'db seed' string in raw or rendered text; the promoted agent output observed-compose-render-j.json is the sandbox-captured render record, and the repo ships a single compose file with no .env* fixture, so the empty variable set is the correct default-render condition.

### Owner-observed deployment check

Owner-observed checks (never a live network probe), composed from the blockers above: (1) on the deploy host observe the effective port bind with docker inspect --format '{{json .NetworkSettings.Ports}}' on container bahia-news-db and ss -ltnp 'sport = :5432', then read host firewall/security-group rules for 5432 - if the concrete deployment binds 5432 to 127.0.0.1 or a private management network, exposure is already remediated and the candidate reduces to hardening; (2) read router/NAT port-forwarding, firewall, and cloud security-group configuration to learn which lower-trust segments can reach the host's 5432; (3) run test -n '${POSTGRES_PASSWORD}' on the deploy host and assess the sourced value's entropy (an empty value aborts the postgres image init, observable in the container's startup logs - image-internal behavior cited as not-source), never exfiltrating the secret. These observations settle listen/bind state, reachability, and credential potency - the three decisive facts no repo or sandbox artifact can produce.
---

## docker-compose.yml:39-40.npx-boot-registry-handoff

**Title.** Boot-time `npx prisma@5.14.0 db push` replaces the lockfile-integrity-verified prisma CLI with version-tag-only registry resolution, executed at every container boot under the app container's full secret environment

### Claimed root cause (source-anchored)

Split resolution root for the same dependency across lifecycle stages: Dockerfile:6 (`npm ci` against package-lock.json copy at :5) binds prisma@5.14.0 by sha512, while docker-compose.yml:39-40 boots `npx prisma@5.14.0 db push` with no lockfile/integrity/offline binding in a runtime image whose COPY list (:32-36) excludes the verified CLI, so every container boot re-opens an unsigned registry resolution slot inside the secret-bearing app container (restart: unless-stopped, :23).

### Trace

1. **entrypoint** `docker-compose.yml:40` — docker-compose.yml#entrypoint — app service boots `sh -c "npx prisma@5.14.0 db push && node server.js"` (folded scalar key at line 39) under restart: unless-stopped (line 23); compose entrypoint overrides Dockerfile ENTRYPOINT ["dumb-init","--"], so this sh -c chain is the sole boot process, repeating at every restart
2. **propagation** `docker-compose.yml:27` — docker-compose.yml#entrypoint — boot command inherits the app service environment (block at :26, keys :27-35): DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, CLOUDINARY_API_KEY/SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NEWSAPI_KEY
3. **propagation** `Dockerfile:6` — Dockerfile#multi-stage build — deps stage is the only integrity-verified install: COPY package.json package-lock.json (:5) then `RUN npm ci --no-audit --no-fund`, which resolves node_modules/prisma@5.14.0 from the lockfile sha512 (package-lock.json:7566) — this verification never travels to boot
4. **propagation** `Dockerfile:36` — Dockerfile#multi-stage build — runner stage's explicit COPY list (:32-36 = public, .next/standalone, .next/static, prisma/, node_modules/.prisma) ships only .prisma engines plus source dirs; no node_modules/prisma, no node_modules/.bin — the verified CLI installed at :6 is never copied; whether the standalone bundle copied at :33 happens to trace a CLI binary is build-output, not source-visible (next.config.js:26 output:'standalone' conditional on DOCKER_BUILD=true set at Dockerfile:15 builder stage; no outputFileTracingIncludes)
5. **propagation** `docker-compose.yml:40` — docker-compose.yml#entrypoint — the `npx prisma@5.14.0` spec carries no lockfile reference, no integrity hash, no --prefer-offline/--offline; compose defines no npm_config_/NPM_CONFIG_* key (npmKnobsInCompose=[]), Dockerfile has no npm config step, and a repo walk finds no .npmrc — so the version tag is resolved at boot from the ambient npm configuration of node:20-alpine (npmKnobsInCompose=[], noNpmrcFiles=[], Dockerfile npmConfigCmds=[]) observed via agents/verifier-k/artifacts/observed-verifierk-sweep.json
6. **sink** `docker-compose.yml:40` — docker-compose.yml#entrypoint — registry-resolved prisma CLI executes `db push` as arbitrary-imported node code under the secret-bearing app environment, with DATABASE_URL pointing at the stack's postgres service; && chains node server.js behind it

### Verified evidence

- `docker-compose.yml:40` — entrypoint exact text `sh -c "npx prisma@5.14.0 db push && node server.js"` (folded scalar at :39) — version-tag-only, no lockfile/integrity/local-bin binding
- `docker-compose.yml:23` — restart: unless-stopped for the app service — the npx shell chain re-executes at every boot/restart, each time re-entering resolution
- `docker-compose.yml:27` — secret-bearing environment keys :27-35 (DATABASE_URL, NEXTAUTH_SECRET, CLOUDINARY_API_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD, NEWSAPI_KEY, plus NEXTAUTH_URL/CLOUDINARY_API_KEY/NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
- `Dockerfile:6` — `RUN npm ci --no-audit --no-fund` after COPY package.json package-lock.json (:5) — the only sha512-verified install; --no-audit also suppresses advisory reporting at the install point
- `package-lock.json:7566` — node_modules/prisma@5.14.0 integrity sha512-gCNZco7y… (entry key at :7563, hasInstallScript, bin build/index.js) — consumed only by npm ci; the boot npx never consults this file (corrected: hunter cited :6653, which is the next@14.2.3 deprecation entry area)
- `Dockerfile:36` — runner COPY list :32-36 ships node_modules/.prisma only; no COPY of node_modules/prisma or node_modules/.bin (copiesPrismaCliDir=false in verifier-k sweep) — verified CLI left behind in deps/builder stages
- `next.config.js:26` — output:'standalone' when DOCKER_BUILD=true (set in builder at Dockerfile:15); no outputFileTracingIncludes/Excludes/Root — so standalone-bundle CLI presence in the runtime image is a build-trace outcome, not repo-determined
- `Dockerfile:1` — FROM node:20-alpine on :1/:8/:21 with no @sha256 digest on any FROM — the npm/npx implementation performing boot resolution is itself mutable and unbound
- `agents/verifier-k/artifacts/observed-verifierk-sweep.json:1` — verifier-k bounded-sandbox static sweep (parent recipe, unshare+bwrap+prlimit, exit 0): compose entrypoint/env/restart text, no npm knobs in compose, no copy of CLI into runner, all 3 FROM lines digest-free, lockfile 658/658 resolved+integrity all registry.npmjs.org, prisma@5.14.0 sha512 at :7563/7566, client at :1354/1357, npmrcFiles=[], knobMatches=[], npmConfigCmds=[], enginesField absent, overrides absent; note field records that the recipe's --ro-bind / leaves no writable target scratch (scratchWriteStatus blocked:EROFS), so the artifact is a char-exact transcription of the sandboxed process stdout
- `agents/hunter-f/artifacts/observed-t13-lockfile-handoff.json:1` — linked hunter-f promoted artifact, independently re-checked line-by-line against source this run: 658/658 resolved to registry.npmjs.org with zero missing integrity, lockfileVersion 3, prisma/client sha512 prefixes, compose npmConfigEnvPresent=[] and offlineKnobs false, enginesField absent, baseImageTags no digest — conclusions confirmed; only its 'entrypointRaw:">"' field mislabels the folded scalar, corrected here to the exact :39-40 text

### Exact blocker(s)

1. Final-image prisma CLI presence (build-output, not source-visible without the prohibited docker build): whether .next/standalone's traced node_modules actually includes node_modules/.bin/prisma or node_modules/prisma so `npx prisma@5.14.0` binds locally before any network action. Owner check (filesystem inspection only, no network): after `docker compose build`, run in the app image filesystem `ls node_modules/.bin 2>/dev/null | grep -x prisma || echo no-local-prisma-bin; ls node_modules/prisma/package.json 2>/dev/null || echo no-local-prisma-pkg`.
2. Boot-time ambient npm configuration and npx completability (image/runtime fact): which registry host and offline/strict settings node:20-alpine's npm applies when the local lookup misses, and whether the container user holds a writable HOME for the npx/_npx fetch cache — the Dockerfile's adduser (:28-29) creates the home at build time, and repo source contains no control forcing a hard, closed boot failure, so if the cache write succeeds the fetch EXECUTES and the registry-trust line applies, whereas a failed cache write would instead crash the boot chain every restart (different, availability-only story). Owner check in the built app image, configuration readout only, no registry contact: `npm config get registry; npm config get offline; npm config get cache; test -w "$(npm config get cache)" && echo cache-writable || echo cache-blocked`.
3. Registry-side content for the exact version tag `prisma@5.14.0` at boot time: whether the manifest/dist-integrity served through the deployment's actual registry path (provider defaults, mirrors, TLS intermediaries) can differ from the lockfile-recorded sha512 (package-lock.json:7566) — repository-side terminology is confirmed, registry-side republish/mirror policy is not observable from this sandbox. Owner check: compare the manifest integrity served through their production/mirrored registry path for prisma-5.14.0 against the lockfile sha512 in their own environment with their registry provider's published policy at hand.
4. Time-of-boot egress network actor: whether any resolver/proxy/default-route position between the container and its egress could present a different origin for that single boot resolution (infra routing fact — owner-verified; nothing was contacted during this validation: sandbox network namespace is loopback-only).

### Bounded local resolution step

Completed within this validation round (no further local step needed unless the owner wants a fresh sandbox pass): parse package-lock.json sweep + static re-render of Dockerfile COPY inventory, compose entrypoint/env keys, next.config output mode, and repo-wide absence of .npmrc/npm-config/offline knobs — agents/verifier-k/artifacts/observed-verifierk-sweep.json, produced under the exact parent recipe (env -i PATH-only, unshare -U -r -n loopback-only, bwrap --ro-bind / /, prlimit --as=4294967296 --nproc=128 --fsize=67108864, node --max-old-space-size=512, exit 0) with the linked hunter-f artifact agents/hunter-f/artifacts/observed-t13-lockfile-handoff.json re-verified line-by-line. Executing npm/npx for the target is prohibited by the sandbox rules (never run npm install/ci/npx, no cached-tarball extraction), so the local-miss→registry-fetch→execute branch cannot be reproduced locally — that branch is exactly blockers 1-2 (image-content and config/cache completability), which an owner resolves by pure filesystem/config inspection without network.

### Owner-observed deployment check

Owner-observed, non-destructive checks on the built app image (no live registry probing, no deployed-endpoint contact): (1) blocker 1 — inside the image list node_modules/.bin/prisma and node_modules/prisma/package.json in /app; (2) blocker 2 — `npm config get registry / offline / cache` and cache-location writability test as the container user; (3) blocker 3 — in their own environment, compare the manifest/integrity their reachable registry path serves for prisma-5.14.0 to the lockfile sha512 at package-lock.json:7566, with their provider's republish/mirror policy in hand; (4) blocker 4 — confirm no egress re-origination (resolver/proxy) covers the boot resolution slot; (5) post-remediation re-verification: confirm the runtime image contains a lockfile-bound prisma CLI invoked by the entrypoint, and that a boot run performs no registry fetch.
---

## lib/auth.ts:104-109.findunique-before-bcrypt-timing-asymmetry

**Title.** Failed-login latency distinguishes registered from unregistered emails (no uniformity control)

### Claimed root cause (source-anchored)

the credentials failure path orders its cheapest operation (row-presence/hash-set/active check, lib/auth.ts:104) ahead of its slowest (bcrypt.compare, lib/auth.ts:109) and performs no dummy-hash, delayed-return, or any shared crypto work on the unknown-account branch; the two branches return the identical null, so the response equality enforced at this source level holds only in status/body, not in computation cost

### Trace

1. **entrypoint** `app/api/auth/[...nextauth]/route.ts:4` — app/api/auth/[...nextauth]/route.ts#NextAuth endpoints — POST /api/auth/[...nextauth] catch-all handler built from authOptions and exported as GET/POST (route line 6); middleware.ts:50 matcher covers only /admin/:path* and /api/admin/:path*, so this entry is reachable pre-auth
2. **propagation** `lib/auth.ts:78` — lib/auth.ts#authorize credentials — authorize(credentials) begins; per-IP rate limit (checkRateLimit, 10 req/min window, lib/rate-limit.ts:3-4) applies identically to both email classes before any observable work
3. **propagation** `lib/auth.ts:87` — lib/auth.ts#authorize credentials — loginSchema.safeParse(credentials) validates email/password; zod lowercases/trims the email (lib/validations.ts:8), so the oracle keys on the normalized address
4. **propagation** `lib/auth.ts:95` — lib/auth.ts#authorize credentials — isLockedOut(email) per-email in-memory lockout check (lib/auth.ts:9-10,24-32): on repeat failures against the same address it returns null before reaching the branch, so a timing probe must not contaminate itself with lockout state
5. **propagation** `lib/auth.ts:100` — lib/auth.ts#authorize credentials — prisma.user.findUnique({ where: { email } }) executes the membership lookup before any slow work (lib/auth.ts:100-102)
6. **propagation** `lib/auth.ts:104` — lib/auth.ts#authorize credentials — rows failing !user || !user.passwordHash || !user.isActive return null immediately with zero crypto work (lib/auth.ts:104-107); no dummy hash, delay, or shared compare exists in source — bcrypt.compare at :109 is the only crypto site
7. **sink** `lib/auth.ts:109` — lib/auth.ts#authorize credentials — bcrypt.compare (cost-12 hash from prisma/seed.ts:15) executes only on the existence branch while both branches return null — the 401 body stays identical and the observable consequence is the latency-only distinction of the failed-login path

### Verified evidence

- `lib/auth.ts:104` — branch splits cheapest path (row presence / passwordHash set / isActive) exclusively on membership state: early exit returns null with zero cryptographic work; repo-wide grep confirms no dummy-hash, delay, or equalization layer anywhere (single bcrypt.compare site at lib/auth.ts:109)
- `lib/auth.ts:109` — bcrypt.compare runs only for rows with a set hash; seeded rows carry cost 12 (prisma/seed.ts:15 bcrypt.hash(adminPassword,12)) and the pure-JS bcryptjs ^2.4.3 implementation (package.json:39) makes this leg quantitatively slow
- `middleware.ts:50` — matcher ["/admin/:path*","/api/admin/:path*"] does not intercept /api/auth — the credentials callback timing surface is reachable without any session

### Exact blocker(s)

1. local: no node_modules in the audited tree and npm install is prohibited, so bcryptjs 2.4.3 cannot be imported and its real cost-12 compare duration cannot be measured in-sandbox; the sandbox fixture reproduces branch order and work counts (0 vs 1 crypto invocations per run across unknown/null-hash/inactive/registered shapes) with a SHA-256 stand-in whose magnitudes are demo-only (agents/verifier-e/artifacts/observed-branch-divergence.json)
2. local: next/next-auth/@prisma/client cannot be imported wholesale either, so the end-to-end wrapped latency of authorize through the NextAuth route (CredentialsSignin → 401) is not measurable outside a real server
3. deployment: whether a stable per-email latency gap survives at the deployment — network jitter vs differential size under the 10 req/min/IP limiter (lib/rate-limit.ts:3-4), per-instance in-memory state making limiter/lockout maps non-deterministic across replicas (lib/rate-limit.ts:1, lib/auth.ts:12), and any edge/CDN/proxy response-time masking — is an owner-observed fact

### Bounded local resolution step

structural (executed in-sandbox; artifact agents/verifier-e/artifacts/observed-branch-divergence.json): verbatim extraction of lib/auth.ts:78-127 into a pure .mjs harness run under the approved recipe (env -i PATH=/usr/bin:/bin HOME=<scratch> timeout 120 unshare -U -r -n bwrap --ro-bind / / --dev-bind /dev /dev prlimit --as=4294967296 --nproc=128 --fsize=67108864 -- node --max-old-space-size=512; scratch-only rw bind for artifact writes, no external network), 30 runs per branch shape (unknown email, null passwordHash, isActive=false, registered cost-12-row-with-wrong-password) recording crypto-call counts: early-exit shapes show 0 compare invocations, the registered shape shows 1, every run returns null — demonstrating the asymmetric work while the observable output stays uniform; SHA-256 stand-in medians (0.004 ms early-exit vs 2.066 ms compare leg) and the equalized demo (adding stand-in work before the early return collapses the gap to ~3x) establish the intended equalization point but never the claimed real cost-12 differential; the residual magnitude question is blocked exactly by the absent node_modules (bcryptjs/next unimportable)

### Owner-observed deployment check

owner-observed staging, non-destructive: pace ≤10 req/min from one real IP (lib/rate-limit.ts:3-4); send ≥20 failed POST /api/auth/callback/credentials for ≥20 distinct registered staging accounts freshly seeded with cost-12 hashes — one attempt each, deliberately avoiding the 5-attempt per-email lock (lib/auth.ts:9-10,37-39), never touching real staff/admin accounts or locking them; interleave ≥20 failed attempts for shuffled, never-registered in-format email addresses; compare p50/p95 of full-response latency of the identical 401 CredentialsSignin bodies; repeat after applying an equalization build (bcrypt.compare(password, FIXED_DUMMY_COST12_HASH) executed before lib/auth.ts:104-107's null return) to confirm the gap collapses; spread samples across instances/time to expose per-instance in-memory state effects, and inspect any edge/CDN/proxy in front of the deployment for response-time masking
---

## lib/auth.ts:130-145.jwt-claims-never-revalidated

**Title.** JWT id/role claims frozen at sign-in: user deactivation or role downgrade does not propagate until the 3600 s token expires (no revocation or re-derivation path)

### Claimed root cause (source-anchored)

JWT strategy with credential-derived claims and no revocation list, denylist, or heartbeat re-derivation from the user row: within maxAge the signed token is the sole authority for id/role; after the single authorize() call (lib/auth.ts:100-126) no source path reads isActive or role from the DB (prisma is used only in authorize at lib/auth.ts:100 and by the adapter attach at lib/auth.ts:49), the Prisma Session model is unused under the jwt strategy, and the requireAuth claim gate (lib/auth-helpers.ts:12-36) is unwired with zero call sites.

### Trace

1. **entrypoint** `app/api/auth/[...nextauth]/route.ts:4` — app/api/auth/[...nextauth]/route.ts#NextAuth endpoints — sign-in POST /api/auth/callback/credentials handled by NextAuth(authOptions) (route.ts:4, verified)
2. **propagation** `lib/auth.ts:120` — lib/auth.ts#authorize credentials — authorize returns {id, email, name, image, role} from the single DB read (lib/auth.ts:100-126, verified)
3. **propagation** `lib/auth.ts:131` — lib/auth.ts#jwt and session callbacks — jwt callback stamps token.id/role only when the user object is present — the sign-in event (lib/auth.ts:131-137, verified; replay shows a later callback call with user undefined carries the claims unchanged)
4. **propagation** `lib/auth.ts:50` — lib/auth.ts#session and jwt configuration — stateless signed cookie: session strategy jwt (line 51), session maxAge 60*60 (line 52), jwt maxAge 60*60 (line 55) — the claim-staleness window is that hour (lib/auth.ts:50-56, verified)
5. **propagation** `middleware.ts:42` — middleware.ts#authorized callback — request-side consumer wired today: !!token presence only (middleware.ts:36-44; verifier-g owns the middleware verdict — cited as a condition, not scored here)
6. **propagation** `lib/auth.ts:138` — lib/auth.ts#jwt and session callbacks — session callback re-projects token onto session.user with no DB read anywhere after issuance (verified: prisma referenced only in the lib/auth.ts authorize path; replay shows the row {isActive:false, role:EDITOR} cannot influence the projection)
7. **sink** `lib/auth.ts:138` — lib/auth.ts#jwt and session callbacks — boundary effect: the issued cookie keeps binding its id/role claims until natural expiry (3600 s) or NEXTAUTH_SECRET rotation; every in-repo consumer today (middleware !!token, unwired requireAuth ADMIN gate) accepts the stale claim — demonstrated by structural replay pending runtime acceptance by next-auth

### Verified evidence

- `lib/auth.ts:132` — claims (id+role) are stamped only when a fresh sign-in user object exists (verified verbatim; replay: later calls with user undefined carry claims unchanged)
- `lib/auth.ts:138` — session callback maps token to session with no DB validation or re-derivation (verified verbatim, no prisma reference in the slice)
- `lib/auth.ts:52` — session maxAge=3600 (line 52) and jwt maxAge=3600 (line 55) — the whole staleness window is that hour
- `lib/auth-helpers.ts:12` — requireAuth (the only DB-independent role gate helper) has zero call sites repo-wide (grep) and compares only the token-derived role claim, never consulting the row; getSessionUser (lib/auth-helpers.ts:7-10) is likewise unwired
- `prisma/schema.prisma:20` — isActive is the declared lifecycle truth (default true); the only runtime read is the sign-in check (lib/auth.ts:104) — no path re-derives it post-issuance
- `package.json:47` — anchors the library blocker: "next-auth": "^4.24.7" — request-time library internals are outside this checkout
- `app/(admin)/admin/page.tsx:10` — admin dashboard is a heading-only static stub (no fetch/axios/swr/session consumption anywhere in the (admin) tree — grep; no /api/admin routes exist in the app tree; app/api/news/route.ts consumes no session) — today's impact cannot exceed the stub pages

### Exact blocker(s)

1. local-sandbox: the full signed-JWT cookie lifecycle (HMAC sign/verify, cookie issuance, getServerSession decode path) cannot run locally — the checkout ships no node_modules and the approved sandbox prohibits npm install and all networking; additionally the whole tree is bind-mounted read-only (bwrap --ro-bind / /), so in-sandbox scratch persistence failed with EROFS and the replay result was persisted from observed stdout. The structural replay of the verbatim callback/requireAuth slices is the bounded local maximum, recorded in agents/verifier-f/artifacts/observed-claims-replay.json (driver agents/verifier-f/artifacts/observed-claims-replay.mjs, provenance agents/verifier-f/artifacts/observed-provenance.txt).
2. library/deployment-external: whether next-auth@4.24.7 (package.json:47) only signature- and expiry-checks the JWT at request time and re-invokes the in-repo jwt callback with user undefined — i.e., performs no server-side revocation check and no re-derivation of id/role/isActive from the user row, accepting the stale cookie until natural expiry or NEXTAUTH_SECRET rotation (compose-supplied) — is library-internal and outside this checkout; it must be observed on a runnable instance.

### Bounded local resolution step

completed: agents/verifier-f/artifacts/observed-claims-replay.mjs ran under the approved sandbox recipe (env -i, unshare -U -r -n, bwrap --ro-bind / /, prlimit as=4 GiB/nproc=128/fsize=64 MiB, node --max-old-space-size=512, timeout 120) and verified the five assertions in agents/verifier-f/artifacts/observed-claims-replay.json: (a) sign-in jwt callback stamps id/role only when the user object is present; (b) a later call with user undefined carries the claims unchanged; (c) the session callback projects role ADMIN/id from the token alone; (d) the verbatim requireAuth ADMIN gate passes on the stale claim while the dummy row is isActive:false/role:EDITOR (no prisma reference in any executed slice — sha256 of the exact source slices recorded in the artifact); (e) session and jwt maxAge are both 60*60 s (lib/auth.ts:52,55). Re-run the promoted driver byte-for-byte under the same recipe to re-derive the artifact; do not attempt npm install/npx — next-auth runtime internals are not locally reachable and no further local step can resolve them.

### Owner-observed deployment check

owner-observed staging, non-destructive: on an instance pinned to the repo's next-auth ^4.24.7, create a disposable test principal (role ADMIN, isActive true, dummy email) via prisma.user.create — never a real admin row; sign in through /api/auth/callback/credentials with its credentials and capture the issued cookie; then owner executes prisma.user.update on the disposable id setting isActive:false and continue read-only GETs to /admin until natural expiry, recording which requests still pass the middleware/pages gate within the 3600 s window (lib/auth.ts:52,55) and the exact expiry; repeat with a second disposable principal downgraded ADMIN to EDITOR while staying active to separate role-claim staleness; record the next-auth version, whether any server-side revocation/invalidation occurs, and whether ops rotates NEXTAUTH_SECRET; all requests read-only, no production data touched.
---

## middleware.ts:18.callbackUrl-echo-unvalidated

**Title.** Attacker-influenced callbackUrl echoed unvalidated into the /admin login redirect (middleware.ts:18); at this commit it dead-ends in a static login stub in-repo, and its only conceivable consumption is next-auth@4.24.14-internal on the mounted REST surface — unobservable from this repository

### Claimed root cause (source-anchored)

The /admin anonymous gate writes the attacker-influenced pathname into callbackUrl (middleware.ts:18) with no in-repo allowlist or binding check, and this commit ships no app-side consumer that would bind or discard the value (the login page is a static stub) — the entire consumption semantics are delegated to next-auth@4.24.14 internals that are not source-visible here (no node_modules); moreover the emitting redirect itself may come from withAuth's internal pages.signIn handling rather than the traced custom body, because the in-repo authorized callback returns false for token-less /admin non-login requests (middleware.ts:42), making the branch selection library-internal.

### Trace

1. **entrypoint** `middleware.ts:16` — attacker-crafted anonymous request to any /admin* pathname except exactly /admin/login (e.g. bait link) — gate branch if (isAdminRoute && !isLoginPage && !token) enters the redirect construction (lines 16-20); sandbox-verified side fact: the in-repo authorized callback (middleware.ts:42) simultaneously returns false for this shape, so under withAuth semantics the custom body may never run and withAuth's internal pages.signIn redirect (same pathname value source) takes over — which branch emits the callbackUrl-bearing URL is unobservable in-repo
2. **propagation** `middleware.ts:18` — redirect parameter write (the only callbackUrl writer in the repo — grep across all .ts*: one occurrence) — loginUrl.searchParams.set("callbackUrl", pathname) copies req.nextUrl.pathname unvalidated — the attacker fully selects the pathname subject to the /admin prefix and the != /admin/login exclusion; the write-to-return stanza carries no scheme/origin/host/allowlist clause (sandbox verbatim-extraction check); the echoed value is a percent-encoded same-site relative path — benign-until-consumed
3. **propagation** `app/(admin)/admin/login/page.tsx:7` — app-side sink = none at this commit (dead end) — static server component (lines 7-17): no form, no signIn call anywhere in the repo (grep: single match at lib/auth.ts:69, a config value), no useSearchParams/searchParams consumption, no client fetch — the parameter is ignored and the value dead-ends at the app layer today
4. **sink** `app/api/auth/[...nextauth]/route.ts:4` — post-login navigation boundary: NextAuth REST surface — const handler = NextAuth(authOptions) exported as GET and POST (lines 1-7) mounts the full /api/auth/* handler — the only conceivable interpreter of callbackUrl (pages.signIn="/admin/login", lib/auth.ts:69); its redirect-callback/callback-endpoint acceptance rules are next-auth@4.24.14 internals (package-lock.json:6701) not present in this repository (no node_modules)

### Verified evidence

- `middleware.ts:18` — the only callbackUrl writer in the app: req.nextUrl.pathname copied unvalidated; verbatim-extraction harness confirms no validation clause in the write stanza (agents/verifier-h/artifacts/observed-callbackurl-echo-check.mjs)
- `middleware.ts:42` — in-repo authorized callback returns false for token-less /admin non-login requests (sandbox-verified), so the custom body's line-18 branch is conditional on unobservable withAuth gating semantics and withAuth's internal signIn redirect may be the actual echo emitter
- `app/(admin)/admin/login/page.tsx:7` — static login stub with no form, no signIn call (grep across repo: one match, lib/auth.ts:69), and no searchParams consumption — the echo dead-ends at the app layer at this commit
- `app/api/auth/[...nextauth]/route.ts:4` — full NextAuth REST surface mounted (export { handler as GET, handler as POST }); the only site that can interpret callbackUrl, and its behavior is library-internal, absent from the audited tree
- `package-lock.json:6701` — next-auth@4.24.14 pinned; node_modules absent from the audited tree so module internals are not source-visible; NEXTAUTH_URL is referenced nowhere in the app and is supplied only as docker-compose.yml:28 passthrough (instance configuration)

### Exact blocker(s)

1. Emitter branch unobservable: for token-less /admin* non-login requests the in-repo authorized callback (middleware.ts:42) returns false (sandbox verbatim-extraction, agents/verifier-h/artifacts/observed-callbackurl-echo-check.txt), so under withAuth semantics the custom body (middleware.ts:16-20) may never run and next-auth@4.24.14's internal pages.signIn redirect takes over — whose URL construction and possible callbackUrl echoing are library-internal (package-lock.json:6701; module imports 'next'/'next-auth' cannot be imported wholesale under the sandbox recipe), so the exact emitter of the callbackUrl-bearing URL cannot be observed from this repository
2. NextAuth callbackUrl acceptance policy unknown: whether the response.redirect callback (or the credentials callback endpoint) requires callbackUrl to be same-origin under NEXTAUTH_URL/trusted hosts or accepts absolute cross-origin or non-http-scheme values — library-internal behavior, not source-visible in-repo (network documentation fetch excluded by contract); no validator exists in app code to prevent cross-origin consumption externally, and NEXTAUTH_URL is instance configuration supplied only via docker-compose.yml:28 passthrough
3. No runtime in the awarded sandbox can exercise the mounted handler: node_modules is absent, npm install/improvised tarball extraction is forbidden, and the Prisma adapter's Postgres is unavailable under the recipe, so any bounded request test against /api/auth/callback/credentials is out of reach locally

### Bounded local resolution step

A bounded verbatim-extraction harness already validated the in-repo half under the parent-approved sandbox (loopback-only netns, read-only root, scratch-only writes; agents/verifier-h/artifacts/observed-callbackurl-echo-check.mjs/.txt): authorized() returns false for token-less /admin non-login shapes, the echo construction is unvalidated in the write stanza, the /admin/login exclusion holds, and the echo value is always a percent-encoded same-site relative path (no scheme survives). To resolve the decisive half, provide the sandbox with node_modules mounted read-only (next-auth@4.24.14 + next) and a dummy-tenant Postgres, no external network: either vendor the library sources read-only to observe withAuth's middleware wrapper directly (which branch builds the signIn redirect and whether it appends callbackUrl, resolving blocker 1) or boot a minimal NextAuth app with the same authOptions shape (pages.signIn="/admin/login", JWT strategy), then POST /api/auth/callback/credentials with valid test credentials and callbackUrl=https%3A%2F%2Fattacker.example — assert the returned Location header origin; repeat with an absolute URL on a different origin, a host-mismatched relative path, and a javascript: scheme variant; per-case acceptance/rejection resolves blocker 2. Treat all harness output as target-controlled; record non-destructively.

### Owner-observed deployment check

Owner-observed check on a staging deployment once a login form is wired (or via direct REST): read the deployed NEXTAUTH_URL/trustHost configuration (docker-compose.yml:28 only passes it through, so the value is owner-owned), start a session from https://staging.example/admin/configuracoes, complete a real login, and record the post-login Location header; assert same-origin binding, then repeat with an attacker-set absolute callbackUrl to distinguish library-internal rejection from acceptance. Additionally confirm the X-Frame-Options/Referrer-Policy headers actually sent on /admin/login responses — those headers are set only on the middleware's NextResponse.next() fall-through branch (middleware.ts:26-32), not on the early-return redirect branches (middleware.ts:13,19,23), which distinguishes the residual framing/leak exposure if callbackUrl is accepted cross-origin.
---

## newsapi-articles-url-unvalidated-scheme-href-sink

**Title.** Third-party feed article.url reaches raw anchor href sink with no scheme validation; CSP script-src 'unsafe-inline' removes the executable-URI backstop

### Claimed root cause (source-anchored)

Absence of destination/scheme validation for the third-party-controlled article.url between the single unvalidated upstream pass-through in app/api/news/route.ts (res.json() at :65, only title filter + slice(0,12) at :67-73, served at :75-82) and the raw href sinks binding article.url across public pages (app/(public)/artigo/[slug]/page.tsx:104; same-root-cause sibling anchors at app/(public)/page.tsx:169/202/246/285 and app/(public)/categoria/[slug]/page.tsx:59); compounded by next.config.js:3 emitting site-wide script-src 'self' 'unsafe-eval' 'unsafe-inline' (headers() source "/(.*)" at next.config.js:44-53) so no nonce/hash script-src backstop structurally blocks javascript: navigation.

### Trace

1. **entrypoint** `app/api/news/route.ts:49` — app/api/news/route.ts#upstream fetch to newsapi.org — GET handler fetches https://newsapi.org/v2/everything with NEWSAPI_KEY and {next:{revalidate:300}} (route.ts:49-54) — the lower-trust entrypoint where publisher-influenced article.url/urlToImage values enter the application
2. **propagation** `app/api/news/route.ts:65` — app/api/news/route.ts#GET /api/news — const data = await res.json() with no response schema validation of url/urlToImage
3. **propagation** `app/api/news/route.ts:67` — app/api/news/route.ts#GET /api/news — only served-payload mutation: filter(title && !title.includes('[Removed]')) + slice(0,12) at :67-73; verbatim sandbox replica shows a fixture article with url:'javascript:alert(document.domain)' passes through unmutated with reference identity retained
4. **propagation** `app/api/news/route.ts:75` — app/api/news/route.ts#GET /api/news — NextResponse.json({articles}) at :75-82 serves the value to every browser client; middleware.ts matcher (:49-51) covers only /admin and /api/admin, so this endpoint and the public pages are unauthenticated
5. **propagation** `next.config.js:3` — next.config.js#Content-Security-Policy — site-wide CSP (headers() source "/(.*)" at :44-53) carries script-src 'self' 'unsafe-eval' 'unsafe-inline' with no nonce/hash token; sandbox replica of :1-22 cspString reproduces the exact rendered header byte-identically (agents/hunter-b/artifacts/observed-csp-header.txt); per CSP3/HTML the inline-script check passes, so javascript: anchor navigation is not structurally blocked (spec-derived, not browser-observed)
6. **propagation** `app/(public)/artigo/[slug]/page.tsx:26` — app/(public)/artigo/[slug]/page.tsx#third-party article rendering — client component fetches /api/news (:26), matches params.slug against title-derived slugs (:36-39), and setArticle(found) selects the served article
7. **sink** `app/(public)/artigo/[slug]/page.tsx:104` — app/(public)/artigo/[slug]/page.tsx#third-party article rendering — SINK: href={article.url} inside <a target="_blank" rel="noopener noreferrer" ...>Ler original</a> (page.tsx:103-110); a click navigates the top browsing context to article.url with no scheme or destination policy

### Verified evidence

- `app/api/news/route.ts:67` — exact source fragment at :67-73 is `const articles = data.articles .filter((article: { title?: string }) => article.title && !article.title.includes("[Removed]")) .slice(0, 12)` — contains no URL/scheme handling; upstream JSON is taken at :65 with no zod/schema check and served verbatim at :75-82. Replica under the approved recipe (env -i, loopback-only netns, ro-binds, prlimits) returned 29 PASS / 0 FAIL, including the attacker-shaped fixture served verbatim (results in agents/verifier-c/artifacts/observed-verifier-c-passthrough.txt, node output captured host-side into scratch since the approved bind set makes scratch EROFS in-sandbox)
- `app/(public)/artigo/[slug]/page.tsx:104` — href={article.url} inside the target=_blank anchor with rel="noopener noreferrer" (:103-110); no scheme/destination validation anywhere between fetch (:26) and binding; Article interface (:6-15) is type-only, no runtime check
- `next.config.js:3` — script-src 'self' 'unsafe-eval' 'unsafe-inline' — no nonce/hash token; applied site-wide via :44-53 so no CSP backstop exists for the href sink; replica cspString is byte-identical to the exact rendered header recorded in agents/hunter-b/artifacts/observed-csp-header.txt
- `lib/validations.ts:57` — the only validation on this path (newsQuerySchema :57-62) checks the inbound q param, not the response; lib/sanitize.ts DOMPurify (:15-22) exists but is imported by none of the feed/public files, and middleware matcher (middleware.ts:49-51) leaves /api/news unauthenticated — corroborated by the file sweep in agents/verifier-c/artifacts/observed-verifier-c-passthrough.txt
- `app/(public)/page.tsx:169` — sibling same-root-cause raw anchors binding feed .url into href with no scheme policy: :169 hero.url, :202 item.url, :246 card.url, :285 opinion.url (page's own /api/news fetch at :72), and app/(public)/categoria/[slug]/page.tsx:59 (fetch at :25) — each target="_blank" rel="noopener noreferrer"; consolidated under the single pass-through root cause (Image unoptimized urlToImage facts are peer unit T14 context)

### Exact blocker(s)

1. third_party_dependency: Reachability prerequisite unestablished: whether the upstream NewsAPI.org /v2/everything response can ever supply a non-http(s) article.url for a listable item is a provider-server contract not visible in source and provider contact is prohibited; if NewsAPI structurally restricts url to http(s), the executable-scheme chain is unreachable from this feed and the issue downgrades to hardening. Owner observation of the deployment's existing proxied responses or the provider contract can resolve this.
2. environmental_dependency: Client-path execution unobservable locally: react/react-dom and next are absent (no node_modules; installs prohibited) and no browser exists in the approved sandbox, so the React href attribute binding and an actual click on the javascript: anchor under the exactly replicated CSP header were not executed; the CSP javascript: gate is CSP3/HTML spec-derived, not browser-observed on current Chrome/Firefox. rel="noopener noreferrer" already blocks opener reuse but is not a scheme policy, so it does not close the gap.

### Bounded local resolution step

Parent-provisioned target node_modules inside the approved sandbox (installs are prohibited for the verifier), then bounded non-destructive runs: (1) build a fixture /api/news response from the verbatim route.ts:67-73 chain carrying one article with url:'javascript:alert(document.domain)' and boot `next dev` under the loopback-only netns recipe; fetch /api/news over loopback and assert the served JSON contains the executable-scheme url unmutated; (2) request /artigo/<title-derived-slug> over loopback and assert the rendered anchor emits href="javascript:alert(document.domain)" with target="_blank" rel="noopener noreferrer" preserved, under the exact CSP header captured in agents/hunter-b/artifacts/observed-csp-header.txt. No external network contact, scratch-only writes; the preconditions (pass-through and header value) are already established without any server dependency by agents/verifier-c/artifacts/observed-verifier-c-passthrough.txt.

### Owner-observed deployment check

Owner-observed, never live-probed: (1) confirm from the NewsAPI.org contract or the deployment's already-proxied /api/news responses whether a non-http(s) article.url can ever appear — this resolves the reachability blocker; (2) have the owner click the fixture anchor in a current Chrome/Firefox build against the deployed header to observe the renderer behavior for javelse scripts — i.e. whether a javascript: href with target=_blank executes script in the top context under script-src 'unsafe-inline', resolving the browser blocker; (3) regardless of (1), enforce an http/https-only destination allowlist on article.url (and urlToImage) in app/api/news/route.ts before NextResponse.json and, defense-in-depth, a scheme check before each href binding in the three public pages; optionally replace 'unsafe-inline' with a nonce-based script-src to restore the executable-URI backstop.
---

## prisma/seed.ts:7-27.admin-credential-fallback

**Title.** Seed installs hardcoded default admin credentials (admin@bahianews.com.br / admin123) when ADMIN_EMAIL/ADMIN_PASSWORD are unset or blank

### Claimed root cause (source-anchored)

Seed bootstrap falls open to hardcoded default credentials on unset/empty ADMIN_EMAIL/ADMIN_PASSWORD instead of refusing to run (no required-configuration guard, no generated secret, and no length/format validation), prisma/seed.ts:7-8 reaching the bcrypt.hash + user.create at prisma/seed.ts:15-24 past the existence guard at prisma/seed.ts:14

### Trace

1. **entrypoint** `package.json:14` — package.json#db-commands — entrypoint: 'db:seed' -> 'prisma db seed', which executes prisma.seed='tsx prisma/seed.ts' (package.json:18-20); manual invocation only, targeting whatever DATABASE_URL/DIRECT_URL the invoking process carries
2. **propagation** `prisma/seed.ts:7` — prisma/seed.ts#env fallback — propagation: adminEmail = process.env.ADMIN_EMAIL || "admin@bahianews.com.br" — unset AND empty-string values both select the hardcoded fallback
3. **propagation** `prisma/seed.ts:8` — prisma/seed.ts#env fallback — propagation: adminPassword = process.env.ADMIN_PASSWORD || "admin123" — same fail-open fallback; no length/format validation before hashing
4. **propagation** `prisma/seed.ts:10` — prisma/seed.ts#admin bootstrap — control (partial): findUnique by email then create-if-missing — prevents password reset on re-run but does not gate absent configuration; source-verified and reproduced in replay scenario D
5. **propagation** `prisma/seed.ts:15` — prisma/seed.ts#admin bootstrap — propagation: bcrypt.hash(adminPassword, 12) — when config is absent, the hashed material is the known constant, so bcrypt cost does not protect login from a known-plaintext dictionary value
6. **sink** `prisma/seed.ts:22` — prisma/seed.ts#admin bootstrap — sink: prisma.user.create(... role: Role.ADMIN) — Users row with known-credential ADMIN login, whose privilege is enforced by peer surfaces login (peer-owned surfaces not evaluated)

### Verified evidence

- `prisma/seed.ts:7` — hardcoded fallback email admin@bahianews.com.br
- `prisma/seed.ts:8` — hardcoded fallback password admin123; the only hardcoded credential literal in the codebase
- `prisma/seed.ts:15` — bcrypt.hash(adminPassword, 12) — hash succeeds against the fallback plaintext, so the create path executes with the weak password when config is missing
- `prisma/seed.ts:22` — role: Role.ADMIN on the created user (privileged enum, prisma/schema.prisma:138-141)
- `docker-compose.yml:40` — mitigating source fact: deployed entrypoint contains no seed invocation; no docker-compose/Dockerfile path calls db:seed
- `package.json:14` — seed surfaced as runnable developer command db:seed; production executions only possible by operator/CI outside the repo
- `package.json:16` — postinstall lifecycle runs only 'prisma generate'; with no prisma.yml, no .github/CI files, and a repo-wide search finding zero further 'seed' references, no repository-visible auto-seed hook exists

### Exact blocker(s)

1. Deployment fact: confirm whether any operator, runbook, or CI process ever runs 'npm run db:seed' (or 'prisma db seed') with DATABASE_URL/DIRECT_URL pointing at the production database — repo shows no deployed automatic path (docker-compose.yml:39-40 entrypoint; Dockerfile has no seed step; package.json:16 postinstall only generates; no CI files in repo) — owner check: search deploy logs/CI workflow definitions/runbooks/audit history for db:seed invocations
2. Deployment fact: on the host/process that executes the seed, confirm ADMIN_EMAIL and ADMIN_PASSWORD are non-empty at that moment — empty-string values also select the fallback (JS || falsy semantics), matching the compose interpolation where unset vars render as empty strings (docker-compose.yml:33-34) — owner check: on the seed-executing host, run test -n "${ADMIN_EMAIL}" && test -n "${ADMIN_PASSWORD}"
3. Repo visibility fact: confirm external readability of origin https://github.com/Kaua033/bahia-news.git (public/private) — determines whether the fallback password is attacker-known in addition to being source-visible to committers (settling this requires contacting an external service, which is prohibited for this validation)

### Bounded local resolution step

Completed by verifier-i: independent verbatim-extraction replay of prisma/seed.ts:7-27 (fallback derivation + create-if-missing flow) under the parent-approved sandbox, outcome recorded in agents/verifier-i/artifacts/observed-replay-verifier-i.txt (harness agents/verifier-i/artifacts/observed-replay-verifier-i.mjs, mirroring the hunter's agents/hunter-e/artifacts/observed-seed-fallback.mjs): unset env and blank-string env (compose ${VAR} render of unset keys) both select admin@bahianews.com.br/admin123 and take the create branch; provided config bypasses the fallback; re-run against an existing admin takes the skip branch and never resets its password; exactly one ADMIN account per run ('Administrador'); bcrypt.hash invoked with cost 12 on the fallback plaintext (bcryptjs stubbed as a recording double — dependency not importable here). All locally-decidable semantics of the trace are settled; the remaining facts (seed execution history, environment at execution time, origin visibility) cannot be settled locally.

### Owner-observed deployment check

Owner-observed (read-only, never a live exploit/probe): (1) search CI/deploy runbooks and maintainer machine history for executions of 'npm run db:seed' / 'prisma db seed' against the prod DATABASE_URL/DIRECT_URL; (2) as DBA (not via the app) run SELECT email, role, created_at FROM users WHERE email='admin@bahianews.com.br'; — if present with role ADMIN, treat the credential as compromised (plaintext source-visible): rotate immediately and re-audit Sessions/Accounts for its use; (3) verify any deploy env where the seed may run defines non-empty ADMIN_EMAIL/ADMIN_PASSWORD at that execution; (4) confirm the origin repository's public/private visibility.
