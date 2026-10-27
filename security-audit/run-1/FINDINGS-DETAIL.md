# FINDINGS-DETAIL — bahia-news run-1 (standard, sandboxed source-and-local-only)

Source ref: 4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d (clean). Complete root-cause detail
for each confirmed \`medium/high/critical\` record, copied verbatim from the final
records in findings.json (Phase-5 verified). Low-severity confirmed records
(middleware.ts:36-44.token-presence-only-gate, lib/auth.ts:12-45.login-attempts-ledger-unbounded-cardinality)
are summarized in REPORT.md only.

---

## lib/auth.ts:24-39.lockout-sentinel-counter-collision

**Title.** 5-failure login lockout cannot engage against sequential wrong-password attempts: isLockedOut deletes the {count, lockedUntil:0} sentinel written by every sub-threshold failure

**Severity.** likelihood medium — exploitation requires sustained sequential wrong-password attempts by an unauthenticated client against a known/guessed registered email (seed provides a default admin); every guess is slowed by bcrypt cost 12 and, when the edge normalizes XFF, by the 10/min per-key budget (keying question owned by the sibling rate-limit fingerprint)
**Impact:** medium — the declared brute-force control contributes nothing on the serial shape an attacker would naturally use: continued credential guessing can end in guessing the password of the single-tenant admin/editor account, yielding full content and admin control; no direct identity/state/disclosure effect follows from the invariant itself
**Overall severity:** medium (never above impact).
**Confidence:** high — the lock functions were copied verbatim from lib/auth.ts:9-45 and lib/rate-limit.ts:1-23 into a locally executed fixture with only zod/prisma/bcrypt replaced by fixed booleans at the same await points; the observed serial sequence (count pinned at 1, threshold branch 0 executions, no 'locked' result) matches the branch-by-branch derivation, and the burst-overlap counterpoint and 15-minute expiry behavior were also observed; no deployed endpoint or external service was contacted

### Root cause

destructive interaction of two in-file constants/functions: the initializing sentinel {count:0, lockedUntil:0} in recordFailedAttempt (lib/auth.ts:35) versus isLockedOut's expiry predicate Date.now() > entry.lockedUntil (lib/auth.ts:27-29), under which lockedUntil=0 is always 'expired' and the background is the authorize() driver: the isLockedOut gate (:95) precedes every record path, and the awaited prisma findUnique (:100-102) and bcrypt.compare (:109) suspend between gate and record, so strictly sequential authorize() executions delete the retained {count:1, lockedUntil:0} sentinel on each next touch (the sync accessor methods themselves cannot interleave mid-function on Node's single-threaded event loop; only cross-request overlap at those await points escapes the deletion). The smallest effective fix in source is to make only real posted locks time-bound — e.g., treat lockedUntil>0 as the sole expiry predicate — so the count survives across authorize() calls and the threshold at lib/auth.ts:37 executes.

### Intended behavior (invariant that fails)

five consecutive failed passwords on one email must set entry.lockedUntil at lib/auth.ts:38 to now+15min and force the next authorize() for that email to return null at lib/auth.ts:95-98 before touching prisma or bcrypt; once the lock expires the counter restarts; on success the account's entry is cleared (lib/auth.ts:117).

### Ordered repository-relative trace

1. **entrypoint** `app/api/auth/[...nextauth]/route.ts:4` — app/api/auth/[...nextauth]/route.ts#NextAuth endpoints — POST /api/auth/callback/credentials handled by NextAuth(authOptions) exported as POST (app/api/auth/[...nextauth]/route.ts:4-6)
2. **propagation** `lib/auth.ts:78` — lib/auth.ts#authorize credentials — authorize() credentials provider (lib/auth.ts:78)
3. **propagation** `lib/auth.ts:81` — lib/rate-limit.ts#checkRateLimit — checkRateLimit(ip) with ip from the first X-Forwarded-For segment (lib/auth.ts:16-22, call :81 -> lib/rate-limit.ts:6-23); residual brake, keying owned by verifier-a's fingerprint
4. **propagation** `lib/auth.ts:87` — lib/auth.ts#authorize credentials — loginSchema.safeParse (lib/auth.ts:87; email normalized lowercase/trim, valid wrong-password payloads pass)
5. **propagation** `lib/auth.ts:95` — lib/auth.ts#isLockedOut — isLockedOut(email) (lib/auth.ts:95) reads the retained entry {count:1, lockedUntil:0} from the previous attempt: lines 27-29 delete it and return false
6. **propagation** `lib/auth.ts:100` — lib/auth.ts#authorize credentials — await prisma.user.findUnique (lib/auth.ts:100-102) — the await point between gate and record where concurrent authorize executions can interleave
7. **propagation** `lib/auth.ts:109` — lib/auth.ts#authorize credentials — await bcrypt.compare mismatch (lib/auth.ts:109)
8. **propagation** `lib/auth.ts:112` — lib/auth.ts#recordFailedAttempt — recordFailedAttempt (lib/auth.ts:112) rewrites only {count:1, lockedUntil:0} because the gate deleted the previous entry
9. **propagation** `lib/auth.ts:37` — lib/auth.ts#recordFailedAttempt — threshold branch (lib/auth.ts:37-39) never executes across strictly sequential authorize() calls; it executes only when >=5 authorize executions overlap between the :95 gate and the record continuation (observed in the fixture's burst phase)
10. **sink** `lib/auth.ts:27` — lib/auth.ts#isLockedOut — sink: for sequential wrong-password attempts no lock state ever accumulates — the declared lockout does not bound paced guessing, which proceeds subject only to the XFF-keyed 10/min per-IP limiter and bcrypt cost

### Evidence (verified paths)

- `lib/auth.ts:35` — fresh failures are stored as { count: 0, lockedUntil: 0 } — lockedUntil=0 denotes 'no lock but countable', and 0 is not distinguishable from an expired lock by the predicate at :27
- `lib/auth.ts:27` — isLockedOut's expiry predicate Date.now() > entry.lockedUntil is TRUE for lockedUntil=0, deleting the retained counter at line 28 on the next read
- `lib/auth.ts:37` — threshold set on entry.count >= MAX_LOGIN_ATTEMPTS (5) that the :27-29 deletion prevents from being reached across sequential authorize() calls
- `lib/auth.ts:95` — isLockedOut is the only gate on the credentials flow that both reads and deletes the entry before the record paths (:105, :112), with the awaited findUnique (:100-102) and bcrypt (:109) suspending between
- `lib/auth.ts:96` — the 'Account locked due to many attempts' gate is unreachable across sequential attempts — in the verifier's fixture a 'locked' result occurred only after genuinely posted lock state from >=5 overlapping executions, never from serial flow
- `lib/auth.ts:18` — the limiter's key is the first X-Forwarded-For segment (fallback 'unknown'), a caller-influenced string; residual-brake scope only, owned by the rate-limit fingerprint

### Attacker principal, dummy input, and bounded reproduction

unauthenticated outside client who knows or suspects a registered staff email (seed default admin) sends wrong-password credentials POSTs strictly one at a time, consuming each response before the next submission: the source-declared 5-failure/15-minute lock never engages on this shape, and every attempt runs the full pipeline (rate-limit -> schema -> gate -> prisma -> bcrypt) so success candidates compare normally; the only source-visible bounds are the 10/min per-IP limiter on the first XFF segment and per-attempt bcrypt latency; note honestly that a burst of >=5 near-simultaneous submissions does engage the lock — the control fails exactly the paced guessing it exists to stop
1. POST /api/auth/callback/credentials, Content-Type application/x-www-form-urlencoded, body csrfToken=<from GET /api/auth/csrf> plus its cookie, credentialsEmail=admin@bahianews.com.br, credentialsPassword=wrong-<n>, sent strictly sequentially (await each response), >=6 times within a minute
2. sanity: source declares MAX_LOGIN_ATTEMPTS == 5 with 15-minute LOCKOUT_DURATION_MS; observed across the serial loop: no response is cut at the 'Account locked' gate (lib/auth.ts:95-98) even after the 5th and subsequent failures, and the in-process counter restarts at count=1 each time

**Instructions (exact, bounded).** GET /api/auth/csrf to harvest the csrfToken and its cookie required by the built-in next-auth REST flow,submit the wrong-password POST serially (concurrency=1, each response awaited) and observe pipelined behavior identical on every attempt with no lockout after the 5th failure; the verifier's state-machine fixture records the resulting in-file ledger bytes-identical to source: {count:1, lockedUntil:0} after every sequential authorize() execution


### Observed local result and the invariant it proves

independent sandbox replication (observed-lockout-state-machine.mjs, run log observed-lockout-state-machine-run.txt, promoted to agents/verifier-d/artifacts/): functions copied verbatim from lib/auth.ts:9-45 and lib/rate-limit.ts:1-23 with zod/prisma/bcrypt replaced by fixed booleans at the same await points, under the approved control recipe (empty env, user+net namespace, read-only root bind, prlimit caps): six strictly sequential wrong-password authorize() executions on admin@bahianews.com.br all returned 'wrong-password', the ledger after every call was exactly {count:1, lockedUntil:0}, the threshold branch (lib/auth.ts:37-39) executed 0 times, and 'locked' was never returned; a hand-placed {count:4, lockedUntil:0} was deleted by the next isLockedOut read (Map emptied); recordFailedAttempt x5 with no intervening gate posted lockedUntil, returned true, and expired+deleted after the simulated 15-min window; counterpoint recorded: five overlapping authorize submissions reached count=5 with 1 threshold execution and the next strictly serial attempt returned 'locked' (count stayed 5 until expiry, restarting at 1 after expiry), while four-overlap-plus-serial never engaged (final {count:1, lockedUntil:0}); one un-rotated XFF stand-in key admitted exactly 10 attempts per 60s window and rate-blocked the 11th

### Conditions and containment

- **data_state** — a registered user with non-empty passwordHash and isActive=true must be reachable by email; prisma/seed.ts:7 defaults the admin to admin@bahianews.com.br (overridable via ADMIN_EMAIL); wrong-password POSTs against that email from an unauthenticated client are the observed vector
- **timing_dependency** — loginAttempts is a single-process module Map; isLockedOut/recordFailedAttempt/clearAttempts are synchronous and atomic (Node's single-threaded event loop cannot interleave them mid-function — stated honestly); interleaving occurs only at authorize()'s awaits (lib/auth.ts:100-102, :109), so strictly serial requests (each response consumed before the next submission) never accumulate the counter, while >=5 overlapping submissions whose gates run before the first record continuation post a real lock (deterministic in the fixture); loginAttempts has no sweeper/timer (grep of lib/ found none)
- **system_configuration** — the residual brakes are the 10/min per-IP limiter keyed on the caller-suppliable first XFF segment (whether an edge normalizes XFF in the docker-compose direct-publish deployment is repo-invisible — owned by the rate-limit fingerprint, cited not re-litigated) and the bcrypt cost-12 compare latency
- **third_party_dependency** — authorize() is invoked per credentials attempt by next-auth@4.24.7 (pinned in package.json; node_modules absent from the checkout); the sequential/burst behavior derives from authorize()'s own awaits and the module-internal Map, not from next-auth internals

### Source-level remediation and regression case

**Strategy.** in lib/auth.ts, tighten only the lock-state predicate so sub-threshold counters survive sequential authorize() calls while real posted locks keep their 15-minute expiry: gate the delete in isLockedOut on lockedUntil > 0 (or store a countable entry without a falsy lockedUntil sentinel), keep the MAX_LOGIN_ATTEMPTS threshold at :37-39; add regression tests: four serial wrong-password authorize() calls leave isLockedOut(email) === false with loginAttempts retaining count=4, the fifth posts lockedUntil and the next call returns null at :95-98 before prisma/bcrypt, a >=5-overlap burst still locks, and an expired lock expires and resets the counter (fixture P3/P4 cover these verbatim); note that never-expiring {count:N, lockedUntil:0} entries raise retention — cardinality of the same Map is fingerprint-owned (verifier-l), so pair the fix with a sub-threshold age-out (e.g., lastAttemptAt distinct from lockedUntil) rather than deleting entries in the gate; the :96 warn path remains reachable for genuinely posted locks

**lib/auth.ts:**

````
function isLockedOut(identifier: string): boolean {
  const entry = loginAttempts.get(identifier)
  if (!entry) return false
  // Only entries where a real lock was posted (lockedUntil > 0) are time-bound;
  // the countable sentinel { count >= 1, lockedUntil: 0 } must survive
  // sequential reads until MAX_LOGIN_ATTEMPTS is reached.
  if (entry.lockedUntil > 0 && Date.now() > entry.lockedUntil) {
    loginAttempts.delete(identifier)
    return false
  }
  return entry.lockedUntil > 0
}
````

**Regression case.** Re-apply the record's local fixture after the change: the invariant asserted in `intended_behavior` must now hold (spoofed keys collapse into one budget with bounded cardinality for the rate-limit map; the 5-failure lock engages for sequential failures after the sentinel fix), while previously-correct behavior (legit single-source pacing, posted locks expiring after 15 min) is preserved.
---

## lib/rate-limit.ts.checkRateLimit.attacker-keyed-unbounded-map

**Title.** API rate limit is keyed on client-controlled X-Forwarded-For/x-real-ip into a process-lifetime unbounded Map: per-request key spoofing escapes the entire budget and grows server heap permanently

**Severity.** likelihood high — Single-header request variation with zero tooling bar, fully unauthenticated, and reproduced against the importable target module in the approved sandbox.
**Impact:** medium — Escapes the only repo-visible bound on anonymous consumption of the operator-metered NEWSAPI upstream, retains linearly-growing attacker-directed heap state for process lifetime (measured: ~124 bytes/retained key heap, ~23.7 MB per 200k keys persisting after expiry plus forced GC; ~49 MB rss retained), and can lock headerless principals out of /api/auth checks and /api/news windows via the shared 'unknown' bucket; no code execution or persistence beyond the worker's lifetime; recovery bounded by process restart/eviction.
**Overall severity:** medium (never above impact).
**Confidence:** high — Complete repo trace with every cited line verified at commit 4337dfb457e4ceb2eba9b3abf17a695b5ac67c4d; every invariant step independently reproduced by direct import of the actual target module (sha256 6b7a09e5ce052bc4bfd8be19757ffbf819a44931b8c82c82229a2fc6b7fb2235) under the approved sandbox with no external network; the only external contingents (ingress normalization, plan size) are named as conditions and do not affect the demonstrated facets.

### Root cause

lib/rate-limit.ts#checkRateLimit tunes per-key state on an attacker-controlled arbitrary-length string, with no key normalization/cap, no Map size bound, no expiration sweep, and no aggregate (global) dimension; callers feed it raw request headers (app/api/news/route.ts:11; lib/auth.ts:18).

### Intended behavior (invariant that fails)

The limiter should key on an identity a client cannot freely nonce (a trusted-ingress-derived value), enforce one canonical parse across all consumers, bound the number and size of retained keys with eviction of expired entries, and keep a shared 'unknown'/'fallback' key from being a standing DoS handle on any surface.

### Ordered repository-relative trace

1. **entrypoint** `app/api/news/route.ts:9` — app/api/news/route.ts#GET /api/news — unauthenticated GET /api/news (middleware.ts:49-51 matcher excludes it) reads the limiter identity verbatim from client-controlled headers x-forwarded-for ?? x-real-ip ?? 'unknown' at route.ts:11
2. **propagation** `app/api/news/route.ts:13` — app/api/news/route.ts#GET /api/news — passes the attacker-supplied string unchanged as the Map key into lib/rate-limit.ts#checkRateLimit
3. **propagation** `lib/rate-limit.ts:12` — lib/rate-limit.ts#checkRateLimit — any novel key string is granted its own full 10/60s budget (Map.set with count=1); no size cap, no global counter; rejection branch (route.ts:14-26) returns 429 only for that one self-chosen key
4. **propagation** `lib/rate-limit.ts:10` — lib/rate-limit.ts#checkRateLimit — miss/expired branch returns allowed=true for every distinct attacker key (11th call under one key observed allowed=false, remaining=0 at :18-19); request volume and aggregate spend bound only by per-key windows; cross-surface via lib/auth.ts:18+81 which parses the same header to a different still-attacker-chosen key in the same Map
5. **propagation** `app/api/news/route.ts:49` — app/api/news/route.ts#upstream fetch to newsapi.org — every allowed request issues an unauthenticated outbound fetch to newsapi.org with the operator NEWSAPI_KEY in the URL (operator-metered spend; {next:{revalidate:300}} cache keyed by the full URL incl. q)
6. **sink** `lib/rate-limit.ts:1` — lib/rate-limit.ts#ipRequestCounts — module-global Map (entries written at :12): one entry per unique attacker value retained for process lifetime — no size cap, no expiry sweep, eviction only on same-key re-touch; resetRateLimit (:25) is dead code repo-wide

### Evidence (verified paths)

- `app/api/news/route.ts:11` — Limiter key read raw from client-controllable x-forwarded-for ?? x-real-ip ?? 'unknown'
- `lib/rate-limit.ts:12` — checkRateLimit treats any unseen key string as a new full budget (Map.set with count=1)
- `lib/rate-limit.ts:1` — Module-level Map with no size cap and no expiration sweep; resetRateLimit (line 25) is dead code repo-wide (definition-only, zero call sites)
- `lib/auth.ts:18` — Second consumer parses the same header differently (split(',')[0].trim()) into the same shared Map; call site at lib/auth.ts:81
- `app/api/news/route.ts:49` — Every allowed request is an unauthenticated outbound call carrying NEWSAPI_KEY to newsapi.org
- `app/api/news/route.ts:41` — NEWSAPI_KEY is a fail-closed precondition (500 before the fetch when absent) — the key-spoofing and heap-growth facets do not depend on it
- `docker-compose.yml:25` — App port published directly (APP_PORT:-3000:3000) with no proxy service in the stack: a shipped deployment mode where the server terminates client connections and the header reaches the app verbatim
- `middleware.ts:50` — Matcher covers only /admin/:path* and /api/admin/:path* — /api/news is anonymous and nothing in the repo (middleware, next.config.js headers, no custom server) normalizes or strips x-forwarded-for

### Attacker principal, dummy input, and bounded reproduction

Unauthenticated caller on the public /api/news (and /api/auth) surface; only request headers/query are weapons; no credential, no code execution.
1. cURL loop against GET /api/news with one fresh header value per request: X-Forwarded-For: s-<sequence> (increments per call) — N distinct values yield N*10 requests per 60s window instead of 10
2. Multi-hop spoof on a single request causing two-bucket consumption across surfaces: X-Forwarded-For: 1.2.3.4, <fresh-suffix> (route-style raw value vs auth-style first segment are different buckets in the same Map)
3. Budget lockout probe on headerless clients: 10 rapid requests with no forwarded headers (shared 'unknown' key) locks every headerless principal out of /api/news checks and login authorize() runs for the 60s window

**Instructions (exact, bounded).** Independent verifier reproduction (bounded local check; no live endpoint, loopback-only network namespace): env -i PATH=/usr/bin:/bin HOME=$S timeout 120 unshare -U -r -n bwrap --ro-bind / / --dev-bind /dev /dev --bind $S $S prlimit --as=4294967296 --nproc=128 --fsize=67108864 -- node --expose-gc --max-old-space-size=512 $S/observed-verifier-a-rate-limit.mjs (recipe as specified with two recorded additions: --bind $S $S enables the scratch-only write path for the evidence file, and --expose-gc enables forced-GC memory measurement; every parent-verified namespace, timeout, and prlimit bound is unchanged),Harness directly imports the actual repo module /home/kaua/bahia-news/lib/rate-limit.ts (sha256 6b7a09e5ce052bc4bfd8be19757ffbf819a44931b8c82c82229a2fc6b7fb2235; imports nothing external) via Node v26 type-stripping and patches Date.now with a fake clock; drives tests A: same-key 11-call window; B: 60 distinct attacker keys; C: route-style (raw) vs auth-style (first segment) parsing of '1.2.3.4, 9.9.9.9'; D: shared 'unknown' bucket; E: 200,000 distinct keys retained with magnitude measured pre/post forced GC after all windows expired; F: remaining floor within one window,Evidence file promoted from scratch: agents/verifier-a/artifacts/observed-verifier-a-rate-limit.json (harness retained as agents/verifier-a/artifacts/observed-verifier-a-rate-limit.mjs), per the predeclared promotion allowlist; no other repo or tool writes were performed


### Observed local result and the invariant it proves

agents/verifier-a/artifacts/observed-verifier-a-rate-limit.json — all six tests pass: A: same key calls 1-10 allowed (call 10 allowed=true, remaining=0) and call 11 allowed=false, remaining=0; B: 60 distinct attacker keys → 60/60 allowed in one window (N keys → N*10/window; 6x intended budget); C: one XFF value '1.2.3.4, 9.9.9.9' → route-style raw key blocks at its 11th call while the auth-style first-segment key in the same Map stays allowed (remaining=8), proving two independent attacker-chosen buckets; D: shared 'unknown' bucket — first 10 calls allowed, 11th blocked (remaining=0); E: 200,000 distinct attacker values inserted in 163 ms, heap growth +23.7 MB that persists intact after every 60s window is expired by the fake clock AND two forced GCs (∼124 bytes per retained key; rss +48.8→49.0 MB retained), 'att-100000' still membership-present and resets on touch after expiry (allowed=true, remaining=9), and a novel key still mints a fresh budget afterward (allowed=true, remaining=9) — cardinality is unbounded and nothing evicts; F: 25 calls in one window → 10 allowed, 15 blocked, remaining never goes negative (floor 0).

### Conditions and containment

- **network_routing** — The request must reach the Next server with a client-supplied X-Forwarded-For/x-real-ip passed through verbatim — true for the compose-published direct-port mode in the repo (docker-compose.yml:24-25) and any similar direct-exposure deployment; this is a source-visibility question about the trust INPUT (route.ts:11 accepts a client-composable header as identity). Behind a strictly normalizing ingress the per-key escape reverts to IP keying while the unbounded-map and shared-'unknown'-bucket facets persist regardless of topology.
- **system_configuration** — NEWSAPI_KEY is configured — otherwise route.ts:41-46 fails closed before the outbound fetch (the limiter-key spoofing and heap-growth facets still apply).
- **third_party_dependency** — newsapi.org plans are metered; each allowed request is a billable/quota-consuming call of the shared operator key, so the escaped budget converts into operator spend per plan terms.

### Source-level remediation and regression case

**Strategy.** Smallest effective fix is a shared key derivation + bounded map: (1) one normalizer used by both consumers that takes a single trusted-ingress header, takes the first segment, trims, length-caps, and restricts to IP-shaped values, mapping everything else to a single 'unknown' fallback; (2) cap the Map (e.g. 10k keys) and evict expired entries before insertion, with novel-key overflow beyond the cap sharing one coarse fallback bucket instead of minting state; (3) cap the per-entry counter. Combined with a separate global upstream-spend cap on /api/news, both bounded-spend and bounded-memory invariants hold. Regression case: two clients behind the same header set at ≤10 req/min each remain functional; one attacker cycling unique values cannot mint more than the fallback bucket; a 60s-window pressure cannot retain more than the cap worth of entries; restart-loss/roll behavior of the shared map is covered by existing 429 UX.

**lib/rate-limit.ts:**

````
const WINDOW_MS = 60_000
const MAX_REQUESTS = 10
const MAX_KEYS = 10_000
const MAX_KEY_LENGTH = 64
const OVERFLOW_KEY = "\u0000overflow"

const ipRequestCounts = new Map<string, { count: number; resetAt: number }>()

/** Single key derivation shared by EVERY consumer.*/
export function normalizeIpKey(raw: string | null | undefined): string {
  if (!raw) return "unknown"
  const first = raw.split(",")[0]!.trim().slice(0, MAX_KEY_LENGTH)
  return /^[0-9a-fA-F.:[\]]+$/.test(first) ? first : "unknown"
}

function evictExpired(now: number) {
  if (ipRequestCounts.size < MAX_KEYS) return
  for (const [key, entry] of ipRequestCounts) {
    if (now > entry.resetAt) ipRequestCounts.delete(key)
    if (ipRequestCounts.size < MAX_KEYS) return
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  evictExpired(now)
  if (ip !== OVERFLOW_KEY && !ipRequestCounts.has(ip) && ipRequestCounts.size >= MAX_KEYS) {
    // at capacity with a novel key: park caller into one coarse shared bucket
    return checkRateLimit(OVERFLOW_KEY)
  }
  const entry = ipRequestCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS
    ipRequestCounts.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt }
  }
  if (entry.count < Number.MAX_SAFE_INTEGER) entry.count++
  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt }
}
````


**app/api/news/route.ts:**

````
import { checkRateLimit, normalizeIpKey } from "@/lib/rate-limit"

// inside GET /api/news — replace route.ts:11
const ip = normalizeIpKey(
  headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip")
)
````


**lib/auth.ts:**

````
import { checkRateLimit, normalizeIpKey } from "./rate-limit"

// inside getClientIp — replace lib/auth.ts:18 (same parse as every other consumer)
return normalizeIpKey(headers().get("x-forwarded-for")) || "build"
````

**Regression case.** Re-apply the record's local fixture after the change: the invariant asserted in `intended_behavior` must now hold (spoofed keys collapse into one budget with bounded cardinality for the rate-limit map; the 5-failure lock engages for sequential failures after the sentinel fix), while previously-correct behavior (legit single-source pacing, posted locks expiring after 15 min) is preserved.
