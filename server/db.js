import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'lifeos.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  next_level_xp INTEGER NOT NULL DEFAULT 500,
  level INTEGER NOT NULL DEFAULT 1,
  focus_task_id TEXT,
  focus_until INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  project_id TEXT,
  area TEXT,
  date TEXT,
  time TEXT,
  time_end TEXT,
  priority TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  xp INTEGER NOT NULL,
  color TEXT NOT NULL,
  icon_bg TEXT NOT NULL,
  quant_goal INTEGER,
  quant_unit TEXT
);
CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (habit_id, date)
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  done INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tracking (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  bed_time TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  mood INTEGER NOT NULL,
  stress INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  water INTEGER NOT NULL,
  meal TEXT,
  notes TEXT,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  level INTEGER NOT NULL,
  progress INTEGER NOT NULL,
  color TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function loadState(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return null
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ?').all(userId)
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId)
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId)
  const events = db.prepare('SELECT * FROM events WHERE user_id = ?').all(userId)
  const trackingRows = db.prepare('SELECT * FROM tracking WHERE user_id = ?').all(userId)
  const buildings = db.prepare('SELECT * FROM buildings WHERE user_id = ?').all(userId)

  const logsByHabit = {}
  if (habits.length) {
    const ids = habits.map((h) => h.id)
    const placeholders = ids.map(() => '?').join(',')
    const logs = db.prepare(`SELECT * FROM habit_logs WHERE habit_id IN (${placeholders})`).all(...ids)
    for (const log of logs) {
      logsByHabit[log.habit_id] ??= {}
      const n = Number(log.value)
      logsByHabit[log.habit_id][log.date] = Number.isFinite(n) && String(n) === log.value ? n : log.value === 'true'
    }
  }

  const tracking = {}
  for (const row of trackingRows) {
    tracking[row.date] = {
      date: row.date,
      bedTime: row.bed_time,
      wakeTime: row.wake_time,
      mood: row.mood,
      stress: row.stress,
      energy: row.energy,
      water: row.water,
      meal: row.meal || undefined,
      notes: row.notes || '',
    }
  }

  return {
    userName: user.name,
    email: user.email,
    xp: user.xp,
    nextLevelXp: user.next_level_xp,
    level: user.level,
    focusTaskId: user.focus_task_id,
    focusUntil: user.focus_until,
    projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, color: p.color, icon: p.icon })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.project_id || undefined,
      area: t.area || undefined,
      date: t.date || undefined,
      time: t.time || undefined,
      timeEnd: t.time_end || undefined,
      priority: t.priority,
      done: !!t.done,
      archived: !!t.archived,
      createdAt: t.created_at,
    })),
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
      frequency: JSON.parse(h.frequency),
      xp: h.xp,
      color: h.color,
      iconBg: h.icon_bg,
      quantitative: h.quant_goal ? { goal: h.quant_goal, unit: h.quant_unit || 'un' } : undefined,
      logs: logsByHabit[h.id] || {},
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location || undefined,
      done: !!e.done,
    })),
    tracking,
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      area: b.area,
      level: b.level,
      progress: b.progress,
      color: b.color,
    })),
  }
}

export function award(user, amount) {
  let total = user.xp + amount
  let lvl = user.level
  let cap = user.next_level_xp
  while (total >= cap) {
    total -= cap
    lvl += 1
    cap = 1500 + lvl * 200
  }
  db.prepare('UPDATE users SET xp = ?, next_level_xp = ?, level = ? WHERE id = ?').run(total, cap, lvl, user.id)
}

export function starterBuildings(userId) {
  const rows = [
    ['b-igreja', 'Igreja', 'fe', 1, 10, '#7c3aed'],
    ['b-acad', 'Academia', 'saude', 1, 10, '#ef4444'],
    ['b-biblio', 'Biblioteca', 'estudos', 1, 10, '#f59e0b'],
    ['b-oficina', 'Oficina', 'trabalho', 1, 10, '#4f46e5'],
    ['b-casa', 'Casa', 'financas', 1, 10, '#16a34a'],
  ]
  const ins = db.prepare('INSERT INTO buildings (id, user_id, name, area, level, progress, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const r of rows) ins.run(uid('b'), userId, r[1], r[2], r[3], r[4], r[5])
}
