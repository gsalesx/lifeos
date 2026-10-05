import { addDays, lastNDays, minutesBetween, weekday } from './dates.js'

export function eventOnDate(event, iso) {
  if (event.recurrence === 'weekly' && event.weekdays?.length) return event.weekdays.includes(weekday(iso))
  return event.date === iso
}

export function habitDueOn(habit, iso) {
  const dow = weekday(iso)
  const freq = habit.frequency
  if (freq === 'daily') return true
  if (freq === 'weekdays') return dow >= 1 && dow <= 5
  if (Array.isArray(freq)) return freq.includes(dow)
  return true
}

export function habitDone(habit, iso) {
  const v = habit.logs?.[iso]
  if (habit.quantitative) return Number(v || 0) >= habit.quantitative.goal
  return Boolean(v)
}

export function dayScore(habits, tasks, tracking, date) {
  const due = habits.filter((h) => habitDueOn(h, date))
  const habitPct = due.length ? Math.round((due.filter((h) => habitDone(h, date)).length / due.length) * 100) : 0
  const dayTasks = tasks.filter((t) => !t.archived && t.date === date)
  const taskPct = dayTasks.length ? Math.round((dayTasks.filter((t) => t.done).length / dayTasks.length) * 100) : 0
  const health = tracking
    ? Math.round(
      ((Math.min(minutesBetween(tracking.bedTime, tracking.wakeTime), 480) / 480) * 40 +
        (tracking.water / 8) * 20 +
        (tracking.mood / 5) * 20 +
        (tracking.energy / 5) * 20) *
        100,
    )
    : 70
  const healthPct = Math.min(100, Math.round(health))
  const total = Math.round(taskPct * 0.35 + habitPct * 0.3 + healthPct * 0.2 + taskPct * 0.15)
  return { total, taskPct, habitPct, healthPct, focusPct: taskPct }
}

export function weekDiscipline(habits, tasks, events, dates) {
  let habitDue = 0
  let habitDoneN = 0
  let taskDue = 0
  let taskDoneN = 0
  let eventDue = 0
  let eventDoneN = 0
  for (const iso of dates) {
    for (const h of habits) {
      if (!habitDueOn(h, iso)) continue
      habitDue += 1
      if (habitDone(h, iso)) habitDoneN += 1
    }
    for (const t of tasks) {
      if (t.archived || t.date !== iso) continue
      taskDue += 1
      if (t.done) taskDoneN += 1
    }
    for (const e of events) {
      if (!eventOnDate(e, iso)) continue
      eventDue += 1
      if (e.done) eventDoneN += 1
    }
  }
  const habitPct = habitDue ? Math.round((habitDoneN / habitDue) * 100) : 0
  const taskPct = taskDue ? Math.round((taskDoneN / taskDue) * 100) : 0
  const eventPct = eventDue ? Math.round((eventDoneN / eventDue) * 100) : 0
  const parts = []
  if (habitDue) parts.push(habitPct)
  if (taskDue) parts.push(taskPct)
  if (eventDue) parts.push(eventPct)
  const overall = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0
  return {
    overall,
    habitPct,
    taskPct,
    eventPct,
    habitDue,
    habitDone: habitDoneN,
    taskDue,
    taskDone: taskDoneN,
    eventDue,
    eventDone: eventDoneN,
    dates,
  }
}

export function hermesTips({ tasks, habits, tracking, date }) {
  const tips = []
  const overdue = tasks.filter((t) => !t.archived && !t.done && t.date && t.date < date)
  if (overdue.length) tips.push(`${overdue.length} tarefa${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}. Reagendar ou arquivar libera espaço mental.`)

  const lateHabits = habits.filter((h) => habitLateDays(h, date) >= 2)
  if (lateHabits.length) tips.push(`${lateHabits.map((h) => h.name).join(' e ')} ${lateHabits.length > 1 ? 'estão' : 'está'} em atraso. Um check rápido hoje recupera a sequência.`)

  const days = lastNDays(14, date)
  const sleeps = days.map((d) => tracking[d]).filter(Boolean).map((t) => minutesBetween(t.bedTime, t.wakeTime))
  if (sleeps.length) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length
    if (avg < 420) tips.push(`Média de sono em ${Math.floor(avg / 60)}h ${avg % 60}min. Dormir antes das 23:00 costuma levantar o score de saúde.`)
  }
  if (!tips.length) tips.push('Dia limpo. Mantenha o ritmo e registre o tracking antes de dormir.')
  return tips
}

export function habitLateDays(habit, end) {
  if (habitDone(habit, end) || !habitDueOn(habit, end)) return 0
  let miss = 0
  for (let i = 0; i < 14; i++) {
    const iso = addDays(end, -i)
    if (!habitDueOn(habit, iso)) continue
    if (habitDone(habit, iso)) break
    miss += 1
  }
  return miss
}

export function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const ALIASES = {
  jiu: ['jiu jitsu', 'jiujitsu', 'jujitsu', 'bjj'],
  biblia: ['biblia', 'bible', 'leitura biblica', 'palavra'],
  oracao: ['oracao', 'prayer', 'reza', 'orar'],
}

export function aliasTokens(query) {
  const n = normalizeName(query)
  const extra = []
  for (const [key, list] of Object.entries(ALIASES)) {
    if (n.includes(key) || list.some((a) => n.includes(a))) extra.push(key, ...list)
  }
  return [n, ...extra]
}

export function scoreNameMatch(name, query) {
  const n = normalizeName(name)
  const tokens = aliasTokens(query)
  if (!n || !tokens[0]) return 0
  if (n === tokens[0]) return 100
  if (tokens.some((t) => t && (n === t || n.includes(t) || t.includes(n)))) return 80
  const qParts = tokens[0].split(' ').filter(Boolean)
  if (qParts.length && qParts.every((p) => n.includes(p))) return 60
  return 0
}
