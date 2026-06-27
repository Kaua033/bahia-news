type SecurityEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_LOCKOUT"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED_ACCESS"
  | "FORBIDDEN_ACCESS"
  | "CONTENT_CREATED"
  | "CONTENT_UPDATED"
  | "CONTENT_DELETED"
  | "PASSWORD_CHANGED"

export function logSecurityEvent(
  event: SecurityEvent,
  details: Record<string, unknown> = {}
) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  }

  switch (event) {
    case "LOGIN_FAILURE":
    case "LOGIN_LOCKOUT":
    case "RATE_LIMIT_EXCEEDED":
    case "UNAUTHORIZED_ACCESS":
    case "FORBIDDEN_ACCESS":
      console.warn("[SECURITY]", JSON.stringify(entry))
      break
    default:
      console.info("[SECURITY]", JSON.stringify(entry))
  }
}
