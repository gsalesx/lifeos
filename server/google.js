import { config, googleConfigured, googleRedirectUri } from './config.js'
import { decryptSecret, encryptSecret } from './ids.js'
import { db } from './db.js'

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo'
const CAL = 'https://www.googleapis.com/calendar/v3'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export function googleAuthUrl(req, state) {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH}?${params}`
}

export async function exchangeCode(req, code) {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: googleRedirectUri(req),
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || 'Falha ao trocar o código Google')
  return data
}

export async function fetchUserInfo(accessToken) {
  const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Falha ao ler o perfil Google')
  return data
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || 'Falha ao renovar o token Google')
  return data
}

export function saveGoogleTokens(userId, tokens, { keepRefresh = true } = {}) {
  const accessEnc = tokens.access_token ? encryptSecret(tokens.access_token) : null
  const expiry = tokens.expires_in ? Date.now() + Number(tokens.expires_in) * 1000 - 30_000 : null
  const refreshEnc = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null
  const user = db.prepare('SELECT google_refresh_enc FROM users WHERE id = ?').get(userId)
  const nextRefresh = refreshEnc || (keepRefresh ? user?.google_refresh_enc : null)
  db.prepare(`UPDATE users SET
    google_access_enc = COALESCE(?, google_access_enc),
    google_token_expiry = COALESCE(?, google_token_expiry),
    google_refresh_enc = COALESCE(?, google_refresh_enc),
    calendar_connected = CASE WHEN COALESCE(?, google_refresh_enc) IS NOT NULL THEN 1 ELSE calendar_connected END
    WHERE id = ?`).run(accessEnc, expiry, nextRefresh, nextRefresh, userId)
}

export function clearGoogleTokens(userId) {
  db.prepare(`UPDATE users SET
    google_access_enc = NULL,
    google_refresh_enc = NULL,
    google_token_expiry = NULL,
    calendar_connected = 0,
    calendar_sync_token = NULL
    WHERE id = ?`).run(userId)
}

export async function accessTokenFor(user) {
  if (!googleConfigured()) throw new Error('Google OAuth não configurado')
  const refresh = decryptSecret(user.google_refresh_enc)
  if (!refresh) throw new Error('Google Calendar não está conectado')
  if (user.google_access_enc && user.google_token_expiry && Date.now() < user.google_token_expiry) {
    return decryptSecret(user.google_access_enc)
  }
  const tokens = await refreshAccessToken(refresh)
  saveGoogleTokens(user.id, tokens)
  return tokens.access_token
}

export async function calendarRequest(user, path, { method = 'GET', query, body } = {}) {
  const token = await accessTokenFor(user)
  const url = new URL(`${CAL}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return { ok: true, status: 204 }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error?.message || `Google Calendar ${res.status}`)
    err.status = res.status
    err.details = data
    throw err
  }
  return data
}

export { googleConfigured }
