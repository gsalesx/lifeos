import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import { award, db, loadState, starterBuildings, uid } from './db.js'
import { seedDemoUser } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3030)
const SESSION_DAYS = Number(process.env.SESSION_TTL_DAYS || 30)
const isProd = process.env.NODE_ENV === 'production'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser(process.env.SESSION_SECRET || 'lifeos-dev-secret-change-me'))

function setSession(res, sessionId) {
  res.cookie('lifeos_sid', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    signed: true,
    maxAge: SESSION_DAYS * 86400000,
    path: '/',
  })
}

function auth(req, res, next) {
  const sid = req.signedCookies.lifeos_sid
  if (!sid) return res.status(401).json({ error: 'Não autenticado' })
  const row = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').get(sid, Date.now())
  if (!row) return res.status(401).json({ error: 'Sessão expirada' })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' })
  req.user = user
  next()
}

function ok(res, userId) {
  res.json({ state: loadState(userId) })
}

app.post('/api/auth/register', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const name = String(req.body.name || '').trim()
  const demo = !!req.body.demo
  if (!email || !password || password.length < 8 || !name) {
    return res.status(400).json({ error: 'Nome, e-mail e senha (mín. 8) são obrigatórios' })
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'Este e-mail já tem conta' })
  const id = uid('u')
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, bcrypt.hashSync(password, 10), name, new Date().toISOString())
  if (demo) seedDemoUser(id)
  else starterBuildings(id)
  const sid = uid('s')
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sid, id, Date.now() + SESSION_DAYS * 86400000)
  setSession(res, sid)
  ok(res, id)
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }
  const sid = uid('s')
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sid, user.id, Date.now() + SESSION_DAYS * 86400000)
  setSession(res, sid)
  ok(res, user.id)
})

app.post('/api/auth/logout', (req, res) => {
  const sid = req.signedCookies.lifeos_sid
  if (sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(sid)
  res.clearCookie('lifeos_sid', { path: '/' })
  res.json({ ok: true })
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/auth/me', auth, (req, res) => ok(res, req.user.id))

app.get('/api/state', auth, (req, res) => ok(res, req.user.id))

app.patch('/api/profile', auth, (req, res) => {
  if (req.body.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(req.body.name).trim(), req.user.id)
  ok(res, req.user.id)
})

app.post('/api/tasks', auth, (req, res) => {
  const { title, date, time, projectId, priority, area } = req.body
  if (!title) return res.status(400).json({ error: 'Título obrigatório' })
  db.prepare(`INSERT INTO tasks (id, user_id, title, project_id, area, date, time, priority, done, archived, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`)
    .run(uid('t'), req.user.id, title, projectId || null, area || null, date || null, time || null, priority || 'media', new Date().toISOString().slice(0, 10))
  ok(res, req.user.id)
})

app.patch('/api/tasks/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!t) return res.status(404).json({ error: 'Tarefa não encontrada' })
  const next = {
    done: req.body.done === undefined ? t.done : req.body.done ? 1 : 0,
    archived: req.body.archived === undefined ? t.archived : req.body.archived ? 1 : 0,
    date: req.body.date === undefined ? t.date : req.body.date,
    title: req.body.title === undefined ? t.title : req.body.title,
  }
  if (!t.done && next.done) {
    const gain = t.priority === 'alta' ? 25 : t.priority === 'media' ? 15 : 10
    award(req.user, gain)
  }
  db.prepare('UPDATE tasks SET done = ?, archived = ?, date = ?, title = ? WHERE id = ?').run(next.done, next.archived, next.date, next.title, t.id)
  ok(res, req.user.id)
})

app.post('/api/habits', auth, (req, res) => {
  const { name, category, xp, color, iconBg } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
  db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('h'), req.user.id, name, category || 'saude', JSON.stringify('daily'), xp || 15, color || '#4f46e5', iconBg || '#f4f4f5')
  ok(res, req.user.id)
})

app.post('/api/habits/:id/toggle', auth, (req, res) => {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!h) return res.status(404).json({ error: 'Hábito não encontrado' })
  const date = String(req.body.date || new Date().toISOString().slice(0, 10))
  const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(h.id, date)
  const goal = h.quant_goal
  const current = log ? (goal ? Number(log.value) : log.value === 'true') : 0
  const wasDone = goal ? Number(current || 0) >= goal : Boolean(current)
  if (wasDone) {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?').run(h.id, date)
  } else {
    db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)').run(h.id, date, goal ? String(goal) : 'true')
    award(req.user, h.xp)
  }
  ok(res, req.user.id)
})

app.post('/api/habits/:id/value', auth, (req, res) => {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!h) return res.status(404).json({ error: 'Hábito não encontrado' })
  const date = String(req.body.date || new Date().toISOString().slice(0, 10))
  db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)').run(h.id, date, String(req.body.value ?? 0))
  ok(res, req.user.id)
})

app.post('/api/events', auth, (req, res) => {
  const { title, date, time, location } = req.body
  if (!title || !date) return res.status(400).json({ error: 'Título e data obrigatórios' })
  db.prepare('INSERT INTO events (id, user_id, title, date, time, location, done) VALUES (?, ?, ?, ?, ?, ?, 0)')
    .run(uid('e'), req.user.id, title, date, time || '09:00', location || null)
  ok(res, req.user.id)
})

app.post('/api/projects', auth, (req, res) => {
  const { name, color } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
  db.prepare('INSERT INTO projects (id, user_id, name, status, color, icon) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid('p'), req.user.id, name, 'planejamento', color || '#4f46e5', 'folder')
  ok(res, req.user.id)
})

app.put('/api/tracking', auth, (req, res) => {
  const t = req.body
  if (!t.date) return res.status(400).json({ error: 'Data obrigatória' })
  db.prepare(`INSERT INTO tracking (user_id, date, bed_time, wake_time, mood, stress, energy, water, meal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      bed_time = excluded.bed_time, wake_time = excluded.wake_time, mood = excluded.mood,
      stress = excluded.stress, energy = excluded.energy, water = excluded.water,
      meal = excluded.meal, notes = excluded.notes`)
    .run(req.user.id, t.date, t.bedTime || '23:00', t.wakeTime || '07:00', t.mood ?? 3, t.stress ?? 3, t.energy ?? 3, t.water ?? 0, t.meal || null, t.notes || '')
  ok(res, req.user.id)
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

const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

ensureDemo()
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LifeOS listening on ${PORT}`)
})

function ensureDemo() {
  const email = (process.env.DEMO_EMAIL || 'demo@lifeos.app').toLowerCase()
  const password = process.env.DEMO_PASSWORD || 'LifeOS-Demo-2026!'
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return
  const id = uid('u')
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, bcrypt.hashSync(password, 10), 'Lucas', new Date().toISOString())
  seedDemoUser(id)
  console.log(`Conta demo criada: ${email}`)
}
