const ipRequestCounts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = ipRequestCounts.get(ip)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS
    ipRequestCounts.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt }
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt }
}

export function resetRateLimit(ip: string) {
  ipRequestCounts.delete(ip)
}
