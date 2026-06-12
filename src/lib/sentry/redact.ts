import type { ErrorEvent, EventHint } from '@sentry/nextjs'

/**
 * Redacta PII de eventos Sentry antes de enviar. Usamos `sendDefaultPii: true`
 * para capturar IPs y breadcrumbs útiles, pero estrimamos campos sensibles
 * (emails, tokens, nombres) para cumplir privacidad.
 */

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'apikey',
  'token',
  'access_token',
  'refresh_token',
  'password',
  'email',
  'user_email',
  'phone',
  'license_number',
  'confirmation_code',
])

const REDACTED = '[redacted]'

function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj == null) return obj
  if (Array.isArray(obj)) return obj.map((v) => redactObject(v, depth + 1))
  if (typeof obj !== 'object') return obj

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED
    } else {
      out[key] = redactObject(val, depth + 1)
    }
  }
  return out
}

export function sentryBeforeSend(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  if (event.user) {
    const { id, ...rest } = event.user
    event.user = { id, ...(redactObject(rest) as typeof rest) }
  }

  if (event.request) {
    if (event.request.headers) {
      event.request.headers = redactObject(event.request.headers) as typeof event.request.headers
    }
    if (event.request.cookies) {
      event.request.cookies = REDACTED as unknown as typeof event.request.cookies
    }
    if (event.request.data) {
      event.request.data = redactObject(event.request.data)
    }
    if (event.request.query_string && typeof event.request.query_string === 'string') {
      event.request.query_string = event.request.query_string.replace(
        /(token|access_token|refresh_token|api[_-]?key|password)=[^&]*/gi,
        '$1=' + REDACTED,
      )
    }
  }

  if (event.extra) {
    event.extra = redactObject(event.extra) as typeof event.extra
  }
  if (event.contexts) {
    event.contexts = redactObject(event.contexts) as typeof event.contexts
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? (redactObject(crumb.data) as typeof crumb.data) : crumb.data,
    }))
  }

  return event
}
