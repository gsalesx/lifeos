import { addDays, lastNDays, minutesBetween, todayISO, weekday } from './dates'
import type { AreaId, EventItem, Frequency, Habit, Task, Tracking } from '../store/types'

export const AREA_META: Record<AreaId, { label: string; color: string }> = {
  fe: { label: 'Fé', color: '#f59e0b' },
  saude: { label: 'Saúde', color: '#22c55e' },
  trabalho: { label: 'Trabalho', color: '#3b82f6' },
  estudos: { label: 'Estudos', color: '#818cf8' },
  financas: { label: 'Finanças', color: '#ec4899' },
}

export const PRIORITY_META = {
  alta: { label: 'Alta', color: '#ef4444', bg: '#fef2f2' },
  media: { label: 'Média', color: '#71717a', bg: '#f4f4f5' },
  baixa: { label: 'Baixa', color: '#71717a', bg: '#f4f4f5' },
}

export function eventOnDate(event: EventItem, iso: string) {
  if (event.recurrence === 'weekly' && event.weekdays?.length) return event.weekdays.includes(weekday(iso))
  return event.date === iso
}

export function daysFromFrequency(f: Frequency): number[] {
  if (f === 'daily') return [0, 1, 2, 3, 4, 5, 6]
  if (f === 'weekdays') return [1, 2, 3, 4, 5]
  return [...f].sort((a, b) => a - b)
}

export function frequencyFromDays(days: number[]): Frequency {
  const d = [...new Set(days)].sort((a, b) => a - b)
  if (d.length === 7) return 'daily'
  if (d.length === 5 && d.join() === '1,2,3,4,5') return 'weekdays'
  return d
}

export function freqLabel(f: Frequency) {
  if (f === 'daily') return 'Todo dia'
  if (f === 'weekdays') return 'Seg a sex'
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return f.map((n) => names[n]).join(', ')
}

export function habitDueOn(habit: Habit, iso: string) {
  const dow = weekday(iso)
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5
  return habit.frequency.includes(dow)
}

export function habitValue(habit: Habit, iso: string) {
  return habit.logs[iso]
}

export function habitDone(habit: Habit, iso: string) {
  const v = habitValue(habit, iso)
  if (habit.quantitative) return Number(v || 0) >= habit.quantitative.goal
  return Boolean(v)
}

export function habitStreak(habit: Habit, end = todayISO()) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const iso = addDays(end, -i)
    if (!habitDueOn(habit, iso)) continue
    if (habitDone(habit, iso)) streak += 1
    else break
  }
  return streak
}

export function habitLateDays(habit: Habit, end = todayISO()) {
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

export function areaScore(habits: Habit[], tasks: Task[], area: AreaId, date = todayISO()) {
  const areaHabits = habits.filter((h) => h.category === area && habitDueOn(h, date))
  const habitPct = areaHabits.length
    ? Math.round((areaHabits.filter((h) => habitDone(h, date)).length / areaHabits.length) * 100)
    : 60
  const areaTasks = tasks.filter((t) => !t.archived && t.area === area && t.date === date)
  const taskPct = areaTasks.length
    ? Math.round((areaTasks.filter((t) => t.done).length / areaTasks.length) * 100)
    : habitPct
  return Math.round(habitPct * 0.7 + taskPct * 0.3)
}

export function dayScore(habits: Habit[], tasks: Task[], tracking: Tracking | undefined, date = todayISO()) {
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
      ) / 1
    : 70
  const healthPct = Math.min(100, Math.round(health))
  const focusPct = taskPct
  const total = Math.round(taskPct * 0.35 + habitPct * 0.3 + healthPct * 0.2 + focusPct * 0.15)
  return { total, taskPct, habitPct, healthPct, focusPct }
}

export function weekPattern(habit: Habit, end = todayISO()) {
  return lastNDays(7, end).map((iso) => {
    if (!habitDueOn(habit, iso)) return '-'
    return habitDone(habit, iso) ? '1' : '0'
  }).join('')
}

export function hermesTips(input: {
  tasks: Task[]
  habits: Habit[]
  tracking: Record<string, Tracking>
  date: string
}) {
  const tips: string[] = []
  const overdue = input.tasks.filter((t) => !t.archived && !t.done && t.date && t.date < input.date)
  if (overdue.length) tips.push(`${overdue.length} tarefa${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}. Reagendar ou arquivar libera espaço mental.`)

  const lateHabits = input.habits.filter((h) => habitLateDays(h, input.date) >= 2)
  if (lateHabits.length) tips.push(`${lateHabits.map((h) => h.name).join(' e ')} ${lateHabits.length > 1 ? 'estão' : 'está'} em atraso. Um check rápido hoje recupera a sequência.`)

  const days = lastNDays(14, input.date)
  const byDow: number[] = Array(7).fill(0)
  const countDow: number[] = Array(7).fill(0)
  for (const iso of days) {
    const n = input.tasks.filter((t) => t.date === iso && t.done).length
    const dow = weekday(iso)
    byDow[dow] += n
    countDow[dow] += 1
  }
  const avgs = byDow.map((v, i) => (countDow[i] ? v / countDow[i] : 0))
  const best = avgs.indexOf(Math.max(...avgs))
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  if (Math.max(...avgs) > 0) {
    const mean = avgs.reduce((a, b) => a + b, 0) / 7
    const lift = mean ? Math.round(((avgs[best] - mean) / mean) * 100) : 0
    if (lift >= 15) tips.push(`Você tende a ser ${lift}% mais produtivo às ${names[best]}s. Empilhe o trabalho pesado nesse dia.`)
  }

  const sleeps = days
    .map((d) => input.tracking[d])
    .filter(Boolean)
    .map((t) => minutesBetween(t.bedTime, t.wakeTime))
  if (sleeps.length) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length
    if (avg < 420) tips.push(`Média de sono em ${Math.floor(avg / 60)}h ${avg % 60}min. Dormir antes das 23:00 costuma levantar o score de saúde.`)
  }

  if (!tips.length) tips.push('Dia limpo. Mantenha o ritmo e registre o tracking antes de dormir.')
  return tips
}
