const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function todayISO(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return todayISO(d)
}

export function weekday(iso: string) {
  return parseISO(iso).getDay()
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function longDate(iso: string) {
  const d = parseISO(iso)
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function shortDate(iso: string) {
  const d = parseISO(iso)
  return `${WEEKDAYS_SHORT[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function weekNumber(iso: string) {
  const d = parseISO(iso)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

export function formatClock(d = new Date()) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let dur = eh * 60 + em - (sh * 60 + sm)
  if (dur < 0) dur += 24 * 60
  return dur
}

export function formatDuration(mins: number) {
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}min`
}

export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const mondayFirst = (first.getDay() + 6) % 7
  const cells: Array<{ day: number | null; iso: string | null }> = []
  for (let i = 0; i < mondayFirst; i++) cells.push({ day: null, iso: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: todayISO(new Date(year, month, d)) })
  }
  return cells
}

export function lastNDays(n: number, end = todayISO()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))
}

export function startOfWeek(iso: string) {
  const d = parseISO(iso)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return todayISO(d)
}

export { WEEKDAYS_SHORT, WEEKDAYS_FULL, MONTHS }
