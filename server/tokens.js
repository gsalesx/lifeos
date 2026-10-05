import { config } from './config.js'
import { db, uid } from './db.js'
import { randomToken, sha256 } from './crypto.js'

export function createApiToken(userId, name = 'MCP') {
  const secret = randomToken(24)
  const id = uid('tok')
  const raw = `lifeos_${id}_${secret}`
  const prefix = raw.slice(0, 16)
  db.prepare(`INSERT INTO api_tokens (id, user_id, name, token_hash, prefix, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, userId, String(name).slice(0, 80) || 'MCP', sha256(raw), prefix, new Date().toISOString())
  return { id, token: raw, prefix, name: String(name).slice(0, 80) || 'MCP' }
}

export function listApiTokens(userId) {
  return db.prepare(`SELECT id, name, prefix, created_at, last_used_at, revoked_at
    FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC`).all(userId)
}

export function revokeApiToken(userId, tokenId) {
  const row = db.prepare('SELECT * FROM api_tokens WHERE id = ? AND user_id = ?').get(tokenId, userId)
  if (!row) return false
  db.prepare('UPDATE api_tokens SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), tokenId)
  return true
}

export function userFromBearer(header) {
  const raw = String(header || '').replace(/^Bearer\s+/i, '').trim()
  if (!raw) return null
  if (config.mcpBootstrapToken && raw === config.mcpBootstrapToken) {
    return bootstrapUser()
  }
  const hash = sha256(raw)
  const row = db.prepare('SELECT * FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL').get(hash)
  if (!row) return null
  db.prepare('UPDATE api_tokens SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id)
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
}

export function bootstrapUser() {
  if (config.mcpBootstrapEmail) {
    const byEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(config.mcpBootstrapEmail.toLowerCase())
    if (byEmail) return byEmail
  }
  const allowed = String(config.allowedEmails || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (allowed.length) {
    const row = db.prepare(`SELECT * FROM users WHERE email IN (${allowed.map(() => '?').join(',')}) ORDER BY created_at`).get(...allowed)
    if (row) return row
  }
  return db.prepare('SELECT * FROM users ORDER BY created_at LIMIT 1').get()
}
