const DEFAULT_TZ = 'America/Sao_Paulo'

export function env(name, fallback = '') {
  const v = process.env[name]
  return v == null || v === '' ? fallback : v
}

export const config = {
  port: Number(env('PORT', '3030')),
  isProd: env('NODE_ENV') === 'production',
  sessionSecret: env('SESSION_SECRET', 'lifeos-dev-secret-change-me'),
  sessionDays: Number(env('SESSION_TTL_DAYS', '30')),
  dataDir: env('DATA_DIR', ''),
  publicBaseUrl: env('PUBLIC_BASE_URL', '').replace(/\/$/, ''),
  googleClientId: env('GOOGLE_CLIENT_ID'),
  googleClientSecret: env('GOOGLE_CLIENT_SECRET'),
  allowedEmails: env('ALLOWED_EMAILS', ''),
  tokenEncryptionKey: env('TOKEN_ENCRYPTION_KEY', ''),
  mcpBootstrapToken: env('MCP_BOOTSTRAP_TOKEN', ''),
  mcpBootstrapEmail: env('MCP_BOOTSTRAP_USER_EMAIL', ''),
  demoEmail: env('DEMO_EMAIL', 'demo@lifeos.app').toLowerCase(),
  demoPassword: env('DEMO_PASSWORD', 'LifeOS-Demo-2026!'),
  timeZone: env('TZ_NAME', DEFAULT_TZ),
  calendarSyncMs: Number(env('CALENDAR_SYNC_INTERVAL_MS', String(15 * 60 * 1000))),
}

export function googleConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret)
}

export function parseEmailList(raw = config.allowedEmails) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function emailAllowed(email, rawList = config.allowedEmails) {
  const list = parseEmailList(rawList)
  if (!list.length) return true
  return list.includes(String(email || '').trim().toLowerCase())
}

export function publicBase(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()
  const host = (req.get('x-forwarded-host') || req.get('host') || 'localhost:3030').split(',')[0].trim()
  return `${proto}://${host}`
}

export function googleRedirectUri(req) {
  return `${publicBase(req)}/api/auth/google/callback`
}
