import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import { config, emailAllowed, googleConfigured, googleRedirectUri, publicBase } from './config.js'
import { db, loadState, starterBuildings, uid } from './db.js'
import { todayISO } from './dates.js'
import { clearGoogleTokens, exchangeCode, fetchUserInfo, googleAuthUrl, saveGoogleTokens } from './google.js'
import { mountMcp } from './mcp.js'
import * as S from './services.js'
import { createApiToken, listApiTokens, revokeApiToken, userFromBearer } from './tokens.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function setSession(res, sessionId) {
  res.cookie('lifeos_sid', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    signed: true,
    maxAge: config.sessionDays * 86400000,
    path: '/',
  })
}

export function createSession(userId) {
  const sid = uid('s')
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sid, userId, Date.now() + config.sessionDays * 86400000)
  return sid
}

function userFromSession(req) {
  const sid = req.signedCookies?.lifeos_sid
  if (!sid) return null
  const row = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').get(sid, Date.now())
  if (!row) return null
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
}

export function auth(req, res, next) {
  const user = userFromSession(req) || userFromBearer(req.get('authorization'))
  if (!user) return res.status(401).json({ error: 'Não autenticado' })
  req.user = user
  next()
}

export function requireBearer(req, res, next) {
  const user = userFromBearer(req.get('authorization'))
  if (!user) return res.status(401).json({ error: 'Token MCP/API inválido ou ausente' })
  req.user = user
  next()
}

function ok(res, userId) {
  res.json({ state: loadState(userId) })
}

function fail(res, err) {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: err.message || 'Erro interno' })
}

function saveOAuthState(purpose, userId = null) {
  const id = uid('st')
  db.prepare('INSERT INTO oauth_states (id, purpose, user_id, created_at) VALUES (?, ?, ?, ?)')
    .run(id, purpose, userId, Date.now())
  db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(Date.now() - 15 * 60 * 1000)
  return id
}

async function upsertGoogleUser(profile, tokens) {
  const email = String(profile.email || '').trim().toLowerCase()
  if (!email) throw Object.assign(new Error('Conta Google sem e-mail'), { status: 400 })
  if (!emailAllowed(email)) {
    throw Object.assign(new Error('Este e-mail não está na lista de acesso'), { status: 403 })
  }
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    || (profile.sub ? db.prepare('SELECT * FROM users WHERE google_sub = ?').get(profile.sub) : null)
  if (!user) {
    const id = uid('u')
    db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, onboarding_done, google_sub) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .run(id, email, '', profile.name || email.split('@')[0], new Date().toISOString(), profile.sub || null)
    starterBuildings(id)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  } else if (profile.sub && !user.google_sub) {
    db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(profile.sub, user.id)
  }
  saveGoogleTokens(user.id, tokens)
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser(config.sessionSecret))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/auth/config', (req, res) => {
    res.json({
      googleEnabled: googleConfigured(),
      publicBaseUrl: publicBase(req),
      redirectUri: googleConfigured() ? googleRedirectUri(req) : null,
      timeZone: process.env.TZ_NAME || 'America/Sao_Paulo',
    })
  })

  app.post('/api/auth/register', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const name = String(req.body.name || '').trim()
    if (!email || !password || password.length < 8 || !name) {
      return res.status(400).json({ error: 'Nome, e-mail e senha (mín. 8) são obrigatórios' })
    }
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (exists) return res.status(409).json({ error: 'Este e-mail já tem conta' })
    const id = uid('u')
    db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, onboarding_done) VALUES (?, ?, ?, ?, ?, 0)')
      .run(id, email, bcrypt.hashSync(password, 10), name, new Date().toISOString())
    starterBuildings(id)
    setSession(res, createSession(id))
    ok(res, id)
  })

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' })
    }
    setSession(res, createSession(user.id))
    ok(res, user.id)
  })

  app.post('/api/auth/logout', (req, res) => {
    const sid = req.signedCookies.lifeos_sid
    if (sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(sid)
    res.clearCookie('lifeos_sid', { path: '/' })
    res.json({ ok: true })
  })

  app.get('/api/auth/google', (req, res) => {
    if (!googleConfigured()) return res.status(400).json({ error: 'Google OAuth não configurado' })
    const connect = String(req.query.connect || '') === '1'
    const sessionUser = userFromSession(req)
    if (connect && !sessionUser) return res.redirect('/?auth_error=' + encodeURIComponent('Entre antes de conectar o Google'))
    const state = saveOAuthState(connect ? 'connect' : 'login', connect ? sessionUser.id : null)
    res.redirect(googleAuthUrl(req, state))
  })

  app.get('/api/auth/google/callback', async (req, res) => {
    const base = publicBase(req)
    try {
      if (req.query.error) {
        return res.redirect(`${base}/?auth_error=${encodeURIComponent('Google recusou o acesso')}`)
      }
      const code = String(req.query.code || '')
      const state = String(req.query.state || '')
      const row = db.prepare('SELECT * FROM oauth_states WHERE id = ?').get(state)
      db.prepare('DELETE FROM oauth_states WHERE id = ?').run(state)
      if (!code || !row || Date.now() - row.created_at > 15 * 60 * 1000) {
        return res.redirect(`${base}/?auth_error=${encodeURIComponent('Estado OAuth inválido ou expirado')}`)
      }
      const tokens = await exchangeCode(req, code)
      const profile = await fetchUserInfo(tokens.access_token)
      if (row.purpose === 'connect' && row.user_id) {
        const email = String(profile.email || '').trim().toLowerCase()
        if (!emailAllowed(email)) {
          return res.redirect(`${base}/?auth_error=${encodeURIComponent('Este e-mail não está na lista de acesso')}`)
        }
        if (profile.sub) db.prepare('UPDATE users SET google_sub = COALESCE(google_sub, ?) WHERE id = ?').run(profile.sub, row.user_id)
        saveGoogleTokens(row.user_id, tokens)
        return res.redirect(`${base}/`)
      }
      const user = await upsertGoogleUser(profile, tokens)
      setSession(res, createSession(user.id))
      res.redirect(`${base}/`)
    } catch (err) {
      const msg = err.status === 403 ? err.message : (err.message || 'Falha no login Google')
      res.redirect(`${base}/?auth_error=${encodeURIComponent(msg)}`)
    }
  })

  app.post('/api/auth/google/disconnect', auth, (req, res) => {
    clearGoogleTokens(req.user.id)
    ok(res, req.user.id)
  })

  app.get('/api/auth/me', auth, (req, res) => ok(res, req.user.id))
  app.get('/api/state', auth, (req, res) => ok(res, req.user.id))

  app.patch('/api/profile', auth, (req, res) => {
    S.updateProfile(req.user, req.body)
    ok(res, req.user.id)
  })

  app.post('/api/tasks', auth, (req, res) => {
    try { S.createTask(req.user, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.patch('/api/tasks/:id', auth, (req, res) => {
    try { S.updateTask(req.user, req.params.id, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })

  app.post('/api/habits', auth, (req, res) => {
    try { S.createHabit(req.user, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.patch('/api/habits/:id', auth, (req, res) => {
    try { S.updateHabit(req.user, req.params.id, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.delete('/api/habits/:id', auth, (req, res) => {
    try { S.deleteHabit(req.user, req.params.id); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.post('/api/habits/:id/toggle', auth, (req, res) => {
    try { S.toggleHabit(req.user, req.params.id, String(req.body.date || todayISO())); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.post('/api/habits/:id/value', auth, (req, res) => {
    try { S.setHabitValue(req.user, req.params.id, req.body.value, String(req.body.date || todayISO())); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })

  app.post('/api/events', auth, async (req, res) => {
    try { await S.createEvent(req.user, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.patch('/api/events/:id', auth, async (req, res) => {
    try { await S.updateEvent(req.user, req.params.id, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.delete('/api/events/:id', auth, async (req, res) => {
    try { await S.deleteEvent(req.user, req.params.id); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })

  app.post('/api/projects', auth, (req, res) => {
    try { S.createProject(req.user, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })
  app.patch('/api/projects/:id', auth, (req, res) => {
    try { S.updateProject(req.user, req.params.id, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })

  app.put('/api/tracking', auth, (req, res) => {
    try { S.saveTracking(req.user, req.body); ok(res, req.user.id) } catch (err) { fail(res, err) }
  })

  app.post('/api/focus', auth, (req, res) => {
    const until = req.body.taskId ? Date.now() + 25 * 60 * 1000 : null
    db.prepare('UPDATE users SET focus_task_id = ?, focus_until = ? WHERE id = ?').run(req.body.taskId || null, until, req.user.id)
    ok(res, req.user.id)
  })
  app.post('/api/focus/stop', auth, (req, res) => {
    db.prepare('UPDATE users SET focus_until = NULL WHERE id = ?').run(req.user.id)
    ok(res, req.user.id)
  })

  app.post('/api/onboarding/apply', auth, (req, res) => {
    S.applyOnboarding(req.user, req.body)
    ok(res, req.user.id)
  })
  app.post('/api/onboarding/complete', auth, (req, res) => {
    db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(req.user.id)
    ok(res, req.user.id)
  })
  app.post('/api/onboarding/reset', auth, (req, res) => {
    db.prepare('UPDATE users SET onboarding_done = 0 WHERE id = ?').run(req.user.id)
    ok(res, req.user.id)
  })

  app.post('/api/calendar/sync', auth, async (req, res) => {
    try {
      const result = await S.triggerSync(req.user)
      res.json({ ...result, state: loadState(req.user.id) })
    } catch (err) { fail(res, err) }
  })
  app.get('/api/calendar/status', auth, (req, res) => {
    res.json(S.getSettings(req.user))
  })

  app.get('/api/tokens', auth, (req, res) => {
    res.json({ tokens: listApiTokens(req.user.id) })
  })
  app.post('/api/tokens', auth, (req, res) => {
    const created = createApiToken(req.user.id, req.body.name || 'MCP')
    res.status(201).json(created)
  })
  app.delete('/api/tokens/:id', auth, (req, res) => {
    if (!revokeApiToken(req.user.id, req.params.id)) return res.status(404).json({ error: 'Token não encontrado' })
    res.json({ ok: true })
  })

  app.post('/api/activity/log', auth, (req, res) => {
    try {
      const result = S.logActivity(req.user, { name: req.body.name, date: req.body.date || todayISO(), note: req.body.note })
      res.json({ ...result, state: loadState(req.user.id) })
    } catch (err) { fail(res, err) }
  })
  app.get('/api/agenda', auth, (req, res) => {
    res.json(S.getAgenda(req.user, String(req.query.date || todayISO())))
  })
  app.get('/api/week', auth, (req, res) => {
    res.json(S.getWeek(req.user, String(req.query.date || todayISO())))
  })
  app.get('/api/discipline', auth, (req, res) => {
    res.json(S.getDiscipline(req.user, String(req.query.date || todayISO())))
  })
  app.get('/api/insights', auth, (req, res) => {
    res.json({ tips: S.getInsights(req.user) })
  })
  app.get('/api/alerts', auth, (req, res) => {
    res.json(S.getAlerts(req.user))
  })
  app.get('/api/settings', auth, (req, res) => {
    res.json(S.getSettings(req.user))
  })
  app.patch('/api/settings', auth, (req, res) => {
    S.updateProfile(req.user, req.body)
    res.json(S.getSettings(req.user))
  })

  mountMcp(app, { requireBearer })

  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get(/^(?!\/(api|mcp)\b).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) res.status(404).json({ error: 'UI não compilada. Rode npm run build.' })
    })
  })

  return app
}
