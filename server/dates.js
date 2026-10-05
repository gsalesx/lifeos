import { config } from './config.js'

export const TZ = config.timeZone || 'America/Sao_Paulo'

export function todayISO(timeZone = TZ, d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone })
}

export function nowTime(timeZone = TZ, d = new Date()) {
  return d.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false })
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function weekday(iso) {
  return parseISO(iso).getDay()
}

export function startOfWeek(iso) {
  const d = parseISO(iso)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function weekDates(iso) {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function lastNDays(n, end) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))
}

export function minutesBetween(start, end) {
  const [sh, sm] = String(start).split(':').map(Number)
  const [eh, em] = String(end).split(':').map(Number)
  let dur = eh * 60 + em - (sh * 60 + sm)
  if (dur < 0) dur += 24 * 60
  return dur
}

export function splitGoogleDateTime(event, timeZone = TZ) {
  const start = event.start || {}
  if (start.date && !start.dateTime) {
    return { date: start.date, time: '00:00', allDay: true }
  }
  const raw = start.dateTime || start.date
  if (!raw) return { date: todayISO(timeZone), time: '09:00', allDay: false }
  const d = new Date(raw)
  return {
    date: d.toLocaleDateString('en-CA', { timeZone }),
    time: d.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }),
    allDay: false,
  }
}

export function splitGoogleEnd(event, timeZone = TZ) {
  const end = event.end || {}
  if (end.date && !end.dateTime) return null
  const raw = end.dateTime
  if (!raw) return null
  const d = new Date(raw)
  return d.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false })
}

export function toGoogleStartEnd(local, timeZone = TZ) {
  if (local.recurrence === 'weekly') {
    const date = local.date || todayISO(timeZone)
    return {
      start: { dateTime: `${date}T${local.time || '09:00'}:00`, timeZone },
      end: { dateTime: `${date}T${local.timeEnd || addHour(local.time || '09:00')}:00`, timeZone },
    }
  }
  return {
    start: { dateTime: `${local.date}T${local.time || '09:00'}:00`, timeZone },
    end: { dateTime: `${local.date}T${local.timeEnd || addHour(local.time || '09:00')}:00`, timeZone },
  }
}

export function addHour(hhmm) {
  const [h, m] = String(hhmm || '09:00').split(':').map(Number)
  const next = (h + 1) % 24
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}
