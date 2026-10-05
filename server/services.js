import { award, db, habitLogs, hydrateEvents, hydrateHabits, hydrateTasks, loadState, mapHabitRow, starterBuildings, uid } from './db.js'
import { todayISO, weekDates } from './dates.js'
import { dayScore, eventOnDate, habitDueOn, habitDone, hermesTips, scoreNameMatch, weekDiscipline } from './logic.js'
import { deleteGoogleEvent, pushEventToGoogle, syncCalendar } from './calendar.js'

function nowIso() {
  return new Date().toISOString()
}

export function stateOf(userId) {
  return loadState(userId)
}

export function createTask(user, input) {
  const title = String(input.title || '').trim()
  if (!title) throw Object.assign(new Error('Título obrigatório'), { status: 400 })
  const id = uid('t')
  db.prepare(`INSERT INTO tasks (id, user_id, title, project_id, area, date, time, time_end, priority, done, archived, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`)
    .run(id, user.id, title, input.projectId || null, input.area || null, input.date || null, input.time || null, input.timeEnd || null, input.priority || 'media', todayISO())
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function updateTask(user, id, patch) {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!t) throw Object.assign(new Error('Tarefa não encontrada'), { status: 404 })
  const next = {
    done: patch.done === undefined ? t.done : patch.done ? 1 : 0,
    archived: patch.archived === undefined ? t.archived : patch.archived ? 1 : 0,
    date: patch.date === undefined ? t.date : patch.date,
    title: patch.title === undefined ? t.title : String(patch.title).trim() || t.title,
    time: patch.time === undefined ? t.time : patch.time,
    time_end: patch.timeEnd === undefined ? t.time_end : patch.timeEnd,
    priority: patch.priority === undefined ? t.priority : patch.priority,
    project_id: patch.projectId === undefined ? t.project_id : patch.projectId,
    area: patch.area === undefined ? t.area : patch.area,
  }
  if (!t.done && next.done) {
    const gain = t.priority === 'alta' ? 25 : t.priority === 'media' ? 15 : 10
    award(user, gain)
  }
  db.prepare(`UPDATE tasks SET done = ?, archived = ?, date = ?, title = ?, time = ?, time_end = ?, priority = ?, project_id = ?, area = ? WHERE id = ?`)
    .run(next.done, next.archived, next.date, next.title, next.time, next.time_end, next.priority, next.project_id, next.area, t.id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(t.id)
}

export function createHabit(user, input) {
  const name = String(input.name || '').trim()
  if (!name) throw Object.assign(new Error('Nome obrigatório'), { status: 400 })
  const freq = input.frequency === 'weekdays' || Array.isArray(input.frequency) ? input.frequency : 'daily'
  const goal = input.quantitative?.goal ? Number(input.quantitative.goal) : null
  const id = uid('h')
  db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg, quant_goal, quant_unit, time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, user.id, name, input.category || 'saude', JSON.stringify(freq), input.xp || 15, input.color || '#4f46e5', input.iconBg || '#f4f4f5', goal, input.quantitative?.unit || null, input.time || null)
  return mapHabitRow(db.prepare('SELECT * FROM habits WHERE id = ?').get(id), {})
}

export function updateHabit(user, id, patch) {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!h) throw Object.assign(new Error('Hábito não encontrado'), { status: 404 })
  const freq = patch.frequency === undefined ? h.frequency : JSON.stringify(patch.frequency === 'weekdays' || Array.isArray(patch.frequency) ? patch.frequency : 'daily')
  const goal = patch.quantitative === undefined ? h.quant_goal : (patch.quantitative?.goal ? Number(patch.quantitative.goal) : null)
  const unit = patch.quantitative === undefined ? h.quant_unit : (patch.quantitative?.unit || null)
  db.prepare(`UPDATE habits SET name = ?, category = ?, frequency = ?, xp = ?, color = ?, icon_bg = ?, quant_goal = ?, quant_unit = ?, time = ? WHERE id = ?`)
    .run(
      patch.name === undefined ? h.name : String(patch.name).trim() || h.name,
      patch.category === undefined ? h.category : patch.category,
      freq,
      patch.xp === undefined ? h.xp : Number(patch.xp) || h.xp,
      patch.color === undefined ? h.color : patch.color,
      patch.iconBg === undefined ? h.icon_bg : patch.iconBg,
      goal,
      unit,
      patch.time === undefined ? h.time : patch.time,
      h.id,
    )
  return mapHabitRow(db.prepare('SELECT * FROM habits WHERE id = ?').get(h.id), habitLogs(h.id))
}

export function deleteHabit(user, id) {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!h) throw Object.assign(new Error('Hábito não encontrado'), { status: 404 })
  db.prepare('DELETE FROM habits WHERE id = ?').run(id)
  return { ok: true }
}

export function toggleHabit(user, id, date = todayISO()) {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!h) throw Object.assign(new Error('Hábito não encontrado'), { status: 404 })
  const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(h.id, date)
  const goal = h.quant_goal
  const current = log ? (goal ? Number(log.value) : log.value === 'true') : 0
  const wasDone = goal ? Number(current || 0) >= goal : Boolean(current)
  if (wasDone) {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?').run(h.id, date)
  } else {
    db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)').run(h.id, date, goal ? String(goal) : 'true')
    award(user, h.xp)
  }
  return mapHabitRow(db.prepare('SELECT * FROM habits WHERE id = ?').get(h.id), habitLogs(h.id))
}

export function setHabitValue(user, id, value, date = todayISO()) {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!h) throw Object.assign(new Error('Hábito não encontrado'), { status: 404 })
  db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)').run(h.id, date, String(value ?? 0))
  return mapHabitRow(db.prepare('SELECT * FROM habits WHERE id = ?').get(h.id), habitLogs(h.id))
}

export function markHabitDone(user, id, date = todayISO()) {
  const h = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!h) throw Object.assign(new Error('Hábito não encontrado'), { status: 404 })
  const mapped = mapHabitRow(h, habitLogs(h.id))
  if (habitDone(mapped, date)) return mapped
  const goal = h.quant_goal
  db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)').run(h.id, date, goal ? String(goal) : 'true')
  award(user, h.xp)
  return mapHabitRow(db.prepare('SELECT * FROM habits WHERE id = ?').get(h.id), habitLogs(h.id))
}

export async function createEvent(user, input, { sync = true } = {}) {
  const title = String(input.title || '').trim()
  const weekly = input.recurrence === 'weekly' && Array.isArray(input.weekdays) && input.weekdays.length
  if (!title || (!weekly && !input.date)) throw Object.assign(new Error('Título e data (ou dias da semana) são obrigatórios'), { status: 400 })
  const id = uid('e')
  const date = input.date || todayISO()
  db.prepare(`INSERT INTO events (id, user_id, title, date, time, location, done, recurrence, weekdays, origin, dirty, updated_at, time_end, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'lifeos', 1, ?, ?, ?)`)
    .run(id, user.id, title, date, input.time || '09:00', input.location || null, input.done ? 1 : 0, weekly ? 'weekly' : null, weekly ? JSON.stringify(input.weekdays) : null, nowIso(), input.timeEnd || null, input.description || null)
  if (sync && user.calendar_connected) {
    try { await pushEventToGoogle(user, id) } catch (err) { console.warn('push event', err.message) }
  }
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id)
}

export async function updateEvent(user, id, patch, { sync = true } = {}) {
  const e = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!e) throw Object.assign(new Error('Evento não encontrado'), { status: 404 })
  const weekly = patch.recurrence === undefined
    ? e.recurrence === 'weekly'
    : patch.recurrence === 'weekly' && Array.isArray(patch.weekdays || (e.weekdays ? JSON.parse(e.weekdays) : []))
  const weekdays = patch.weekdays === undefined ? e.weekdays : JSON.stringify(patch.weekdays)
  db.prepare(`UPDATE events SET title = ?, date = ?, time = ?, location = ?, done = ?, recurrence = ?, weekdays = ?,
    time_end = ?, description = ?, dirty = 1, updated_at = ? WHERE id = ?`)
    .run(
      patch.title === undefined ? e.title : String(patch.title).trim() || e.title,
      patch.date === undefined ? e.date : patch.date,
      patch.time === undefined ? e.time : patch.time,
      patch.location === undefined ? e.location : patch.location,
      patch.done === undefined ? e.done : patch.done ? 1 : 0,
      weekly ? 'weekly' : null,
      weekly ? weekdays : null,
      patch.timeEnd === undefined ? e.time_end : patch.timeEnd,
      patch.description === undefined ? e.description : patch.description,
      nowIso(),
      e.id,
    )
  if (sync && user.calendar_connected) {
    try { await pushEventToGoogle(user, id) } catch (err) { console.warn('push event', err.message) }
  }
  return db.prepare('SELECT * FROM events WHERE id = ?').get(e.id)
}

export async function deleteEvent(user, id, { sync = true } = {}) {
  const e = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!e) throw Object.assign(new Error('Evento não encontrado'), { status: 404 })
  if (sync && user.calendar_connected && e.google_event_id) {
    try { await deleteGoogleEvent(user, e.google_event_id) } catch (err) { console.warn('delete google event', err.message) }
  }
  db.prepare('DELETE FROM events WHERE id = ?').run(id)
  return { ok: true }
}

export function createProject(user, input) {
  const name = String(input.name || '').trim()
  if (!name) throw Object.assign(new Error('Nome obrigatório'), { status: 400 })
  const id = uid('p')
  db.prepare('INSERT INTO projects (id, user_id, name, status, color, icon, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, user.id, name, input.status || 'planejamento', input.color || '#4f46e5', input.icon || 'folder', input.description || '')
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
}

export function updateProject(user, id, patch) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!p) throw Object.assign(new Error('Projeto não encontrado'), { status: 404 })
  db.prepare('UPDATE projects SET name = ?, status = ?, color = ?, description = ? WHERE id = ?').run(
    patch.name === undefined ? p.name : String(patch.name).trim() || p.name,
    patch.status === undefined ? p.status : patch.status,
    patch.color === undefined ? p.color : patch.color,
    patch.description === undefined ? (p.description || '') : String(patch.description),
    p.id,
  )
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)
}

export function saveTracking(user, t) {
  if (!t.date) throw Object.assign(new Error('Data obrigatória'), { status: 400 })
  db.prepare(`INSERT INTO tracking (user_id, date, bed_time, wake_time, mood, stress, energy, water, meal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      bed_time = excluded.bed_time, wake_time = excluded.wake_time, mood = excluded.mood,
      stress = excluded.stress, energy = excluded.energy, water = excluded.water,
      meal = excluded.meal, notes = excluded.notes`)
    .run(user.id, t.date, t.bedTime || '23:00', t.wakeTime || '07:00', t.mood ?? 3, t.stress ?? 3, t.energy ?? 3, t.water ?? 0, t.meal || null, t.notes || '')
  return true
}

export function updateProfile(user, patch) {
  if (patch.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(patch.name).trim(), user.id)
  if (patch.settings && typeof patch.settings === 'object') {
    const prev = user.settings_json ? JSON.parse(user.settings_json) : {}
    db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify({ ...prev, ...patch.settings }), user.id)
  }
}

export function applyOnboarding(user, payload) {
  const habits = Array.isArray(payload.habits) ? payload.habits : []
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  const events = Array.isArray(payload.events) ? payload.events : []
  const projects = Array.isArray(payload.projects) ? payload.projects : []
  const today = todayISO()
  const tx = db.transaction(() => {
    const insH = db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg, quant_goal, quant_unit, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const h of habits.slice(0, 20)) {
      if (!h?.name) continue
      const freq = h.frequency === 'weekdays' || Array.isArray(h.frequency) ? h.frequency : 'daily'
      const goal = h.quantitative?.goal ? Number(h.quantitative.goal) : null
      insH.run(uid('h'), user.id, String(h.name).slice(0, 80), h.category || 'saude', JSON.stringify(freq), h.xp || 15, h.color || '#4f46e5', h.iconBg || '#f4f4f5', goal, h.quantitative?.unit || null, h.time || null)
    }
    const insP = db.prepare('INSERT INTO projects (id, user_id, name, status, color, icon, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const p of projects.slice(0, 10)) {
      if (!p?.name) continue
      insP.run(uid('p'), user.id, String(p.name).slice(0, 80), 'planejamento', p.color || '#4f46e5', 'folder', p.description || '')
    }
    const insT = db.prepare(`INSERT INTO tasks (id, user_id, title, project_id, area, date, time, priority, done, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`)
    for (const t of tasks.slice(0, 20)) {
      if (!t?.title) continue
      insT.run(uid('t'), user.id, String(t.title).slice(0, 120), t.projectId || null, t.area || null, t.date || today, t.time || null, t.priority || 'media', today)
    }
    const insE = db.prepare(`INSERT INTO events (id, user_id, title, date, time, location, done, recurrence, weekdays, origin, dirty, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'lifeos', 1, ?)`)
    for (const e of events.slice(0, 20)) {
      if (!e?.title) continue
      const weekly = e.recurrence === 'weekly' && Array.isArray(e.weekdays) && e.weekdays.length
      insE.run(uid('e'), user.id, String(e.title).slice(0, 80), e.date || today, e.time || '09:00', e.location || null, weekly ? 'weekly' : null, weekly ? JSON.stringify(e.weekdays) : null, nowIso())
    }
    db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(user.id)
  })
  tx()
}

export function logActivity(user, { name, date = todayISO(), note } = {}) {
  if (!name) throw Object.assign(new Error('Nome da atividade obrigatório'), { status: 400 })
  const habits = hydrateHabits(user.id)
  const events = hydrateEvents(user.id)
  const tasks = hydrateTasks(user.id)

  const habitHits = habits.map((h) => ({ kind: 'habit', item: h, score: scoreNameMatch(h.name, name) })).filter((x) => x.score > 0)
  const eventHits = events.filter((e) => eventOnDate(e, date) || e.recurrence === 'weekly').map((e) => ({ kind: 'event', item: e, score: scoreNameMatch(e.title, name) })).filter((x) => x.score > 0)
  const taskHits = tasks.filter((t) => !t.archived && (t.date === date || !t.date)).map((t) => ({ kind: 'task', item: t, score: scoreNameMatch(t.title, name) })).filter((x) => x.score > 0)

  const ranked = [...habitHits, ...eventHits, ...taskHits].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.kind === 'habit' && b.kind !== 'habit') return -1
    if (b.kind === 'habit' && a.kind !== 'habit') return 1
    return 0
  })
  const best = ranked[0]
  if (!best) {
    throw Object.assign(new Error(`Nenhuma atividade encontrada para "${name}". Crie o hábito ou evento antes.`), { status: 404 })
  }

  if (best.kind === 'habit') {
    const updated = markHabitDone(user, best.item.id, date)
    return { kind: 'habit', date, note: note || null, item: updated }
  }
  if (best.kind === 'event') {
    db.prepare('UPDATE events SET done = 1, updated_at = ? WHERE id = ?').run(nowIso(), best.item.id)
    return { kind: 'event', date, note: note || null, item: db.prepare('SELECT * FROM events WHERE id = ?').get(best.item.id) }
  }
  updateTask(user, best.item.id, { done: true, date })
  return { kind: 'task', date, note: note || null, item: db.prepare('SELECT * FROM tasks WHERE id = ?').get(best.item.id) }
}

export function logFaith(user, kind, date = todayISO()) {
  const query = kind === 'prayer' ? 'oracao' : 'biblia'
  try {
    return logActivity(user, { name: query, date })
  } catch {
    const habits = hydrateHabits(user.id).filter((h) => h.category === 'fe')
    const hit = habits.find((h) => scoreNameMatch(h.name, query) > 0) || habits[0]
    if (!hit) throw Object.assign(new Error(kind === 'prayer' ? 'Nenhum hábito de oração encontrado' : 'Nenhum hábito de Bíblia encontrado'), { status: 404 })
    return { kind: 'habit', date, item: markHabitDone(user, hit.id, date) }
  }
}

export function getAgenda(user, date = todayISO()) {
  const state = loadState(user.id)
  const habits = state.habits.filter((h) => habitDueOn(h, date)).map((h) => ({
    id: h.id, type: 'habit', name: h.name, time: h.time || null, done: habitDone(h, date), category: h.category,
  }))
  const tasks = state.tasks.filter((t) => !t.archived && t.date === date).map((t) => ({
    id: t.id, type: 'task', name: t.title, time: t.time || null, done: t.done, priority: t.priority,
  }))
  const events = state.events.filter((e) => eventOnDate(e, date)).map((e) => ({
    id: e.id, type: 'event', name: e.title, time: e.time, done: !!e.done, location: e.location, origin: e.origin,
  }))
  const items = [...habits, ...tasks, ...events].sort((a, b) => String(a.time || '99:99').localeCompare(String(b.time || '99:99')))
  return {
    date,
    items,
    score: dayScore(state.habits, state.tasks, state.tracking[date], date),
    tracking: state.tracking[date] || null,
  }
}

export function getWeek(user, date = todayISO()) {
  const dates = weekDates(date)
  const state = loadState(user.id)
  return {
    start: dates[0],
    end: dates[6],
    days: dates.map((d) => getAgenda(user, d)),
    discipline: weekDiscipline(state.habits, state.tasks, state.events, dates),
  }
}

export function getDiscipline(user, date = todayISO()) {
  const state = loadState(user.id)
  const dates = weekDates(date)
  return weekDiscipline(state.habits, state.tasks, state.events, dates)
}

export function getInsights(user, date = todayISO()) {
  const state = loadState(user.id)
  return hermesTips({ tasks: state.tasks, habits: state.habits, tracking: state.tracking, date })
}

export function getAlerts(user, date = todayISO()) {
  const state = loadState(user.id)
  const overdue = state.tasks.filter((t) => !t.archived && !t.done && t.date && t.date < date)
  const lateHabits = state.habits.filter((h) => habitDueOn(h, date) && !habitDone(h, date))
  return { date, overdue, pendingHabits: lateHabits.map((h) => ({ id: h.id, name: h.name })) }
}

export function getSettings(user) {
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  return {
    name: fresh.name,
    email: fresh.email,
    googleConnected: !!fresh.calendar_connected,
    calendarLastSync: fresh.last_calendar_sync || null,
    timeZone: todayISO() && (process.env.TZ_NAME || 'America/Sao_Paulo'),
    onboardingDone: !!fresh.onboarding_done,
    settings: fresh.settings_json ? JSON.parse(fresh.settings_json) : {},
  }
}

export async function triggerSync(user) {
  return syncCalendar(user)
}

export { starterBuildings, syncCalendar }
