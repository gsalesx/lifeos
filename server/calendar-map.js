import { splitGoogleDateTime, splitGoogleEnd, toGoogleStartEnd, weekday } from './dates.js'

const GDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export function weekdaysToRrule(weekdays) {
  const days = [...new Set(weekdays || [])].sort((a, b) => a - b).map((d) => GDAY[d]).filter(Boolean)
  if (!days.length) return null
  return `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`
}

export function rruleToWeekdays(rrules) {
  const raw = Array.isArray(rrules) ? rrules.join('\n') : String(rrules || '')
  const m = raw.match(/BYDAY=([A-Z,]+)/i)
  if (!m) {
    if (/FREQ=WEEKLY/i.test(raw)) return [weekday(new Date().toISOString().slice(0, 10))]
    return null
  }
  return m[1].split(',').map((d) => GDAY.indexOf(d.trim().toUpperCase())).filter((n) => n >= 0)
}

export function lifeosPrivateId(event) {
  return event?.extendedProperties?.private?.lifeosEventId || null
}

export function googleEventToLocal(gEvent, timeZone) {
  const { date, time } = splitGoogleDateTime(gEvent, timeZone)
  const timeEnd = splitGoogleEnd(gEvent, timeZone)
  const weekdays = gEvent.recurrence ? rruleToWeekdays(gEvent.recurrence) : null
  return {
    title: gEvent.summary || '(sem título)',
    date,
    time,
    timeEnd: timeEnd || undefined,
    location: gEvent.location || undefined,
    description: gEvent.description || undefined,
    recurrence: weekdays?.length ? 'weekly' : undefined,
    weekdays: weekdays?.length ? weekdays : undefined,
    googleEventId: gEvent.id,
    googleEtag: gEvent.etag || null,
    origin: 'google',
    done: gEvent.status === 'cancelled' ? 1 : 0,
  }
}

export function localEventToGoogle(local, timeZone) {
  const times = toGoogleStartEnd(local, timeZone)
  const body = {
    summary: local.title,
    location: local.location || undefined,
    description: local.description || undefined,
    start: times.start,
    end: times.end,
    extendedProperties: {
      private: { lifeosEventId: local.id },
    },
  }
  if (local.recurrence === 'weekly' && local.weekdays?.length) {
    const rule = weekdaysToRrule(local.weekdays)
    if (rule) body.recurrence = [rule]
  }
  return body
}

export function shouldApplyRemote(existing, remote) {
  if (!existing) return { apply: true, reason: 'create' }
  if (existing.google_etag && existing.google_etag === remote.googleEtag) {
    return { apply: false, reason: 'etag-match' }
  }
  if (Number(existing.dirty) === 1 && existing.origin === 'lifeos') {
    return { apply: false, reason: 'local-dirty' }
  }
  return { apply: true, reason: 'update' }
}

export function decideCancelled(existing) {
  if (!existing) return 'none'
  if (existing.origin === 'google') return 'delete'
  return 'unlink'
}
