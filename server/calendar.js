import { config } from './config.js'
import { db, uid } from './db.js'
import { TZ, todayISO } from './dates.js'
import { calendarRequest } from './google.js'
import { decideCancelled, googleEventToLocal, lifeosPrivateId, localEventToGoogle, shouldApplyRemote } from './calendar-map.js'

const CAL_ID = (user) => user.calendar_id || 'primary'

export async function listGoogleEvents(user, { syncToken, pageToken } = {}) {
  const calendarId = encodeURIComponent(CAL_ID(user))
  const query = {
    maxResults: 2500,
    showDeleted: true,
    singleEvents: false,
    pageToken,
  }
  if (syncToken) {
    query.syncToken = syncToken
  } else {
    query.timeMin = new Date(Date.now() - 30 * 86400000).toISOString()
  }
  return calendarRequest(user, `/calendars/${calendarId}/events`, { query })
}

export async function pullGoogleEvents(user) {
  let syncToken = user.calendar_sync_token || null
  let pageToken = null
  let pulled = 0
  let updated = 0
  let removed = 0
  let skipped = 0
  const created = []

  for (let i = 0; i < 20; i++) {
    let data
    try {
      data = await listGoogleEvents(user, { syncToken, pageToken })
    } catch (err) {
      if (err.status === 410 && syncToken) {
        db.prepare('UPDATE users SET calendar_sync_token = NULL WHERE id = ?').run(user.id)
        user.calendar_sync_token = null
        syncToken = null
        pageToken = null
        continue
      }
      throw err
    }

    for (const item of data.items || []) {
      const result = applyRemoteEvent(user, item)
      if (result === 'create') {
        pulled += 1
        created.push(item.id)
      } else if (result === 'update') updated += 1
      else if (result === 'delete' || result === 'unlink') removed += 1
      else skipped += 1
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken
      continue
    }
    if (data.nextSyncToken) {
      db.prepare('UPDATE users SET calendar_sync_token = ? WHERE id = ?').run(data.nextSyncToken, user.id)
      user.calendar_sync_token = data.nextSyncToken
    }
    break
  }

  return { pulled, updated, removed, skipped }
}

export function applyRemoteEvent(user, item) {
  const lifeosId = lifeosPrivateId(item)
  const byLifeos = lifeosId
    ? db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(lifeosId, user.id)
    : null
  const byGoogle = item.id
    ? db.prepare('SELECT * FROM events WHERE user_id = ? AND google_event_id = ?').get(user.id, item.id)
    : null
  const existing = byLifeos || byGoogle

  if (item.status === 'cancelled') {
    const action = decideCancelled(existing)
    if (action === 'delete') db.prepare('DELETE FROM events WHERE id = ?').run(existing.id)
    if (action === 'unlink') {
      db.prepare('UPDATE events SET google_event_id = NULL, google_etag = NULL, dirty = 0 WHERE id = ?').run(existing.id)
    }
    return action
  }

  const remote = googleEventToLocal(item, TZ)
  const decision = shouldApplyRemote(existing, remote)
  if (!decision.apply) return decision.reason

  if (!existing) {
    const id = uid('e')
    db.prepare(`INSERT INTO events (id, user_id, title, date, time, location, done, recurrence, weekdays, google_event_id, google_etag, origin, dirty, updated_at, time_end, description)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'google', 0, ?, ?, ?)`)
      .run(
        id,
        user.id,
        remote.title,
        remote.date,
        remote.time,
        remote.location || null,
        remote.recurrence || null,
        remote.weekdays ? JSON.stringify(remote.weekdays) : null,
        remote.googleEventId,
        remote.googleEtag,
        new Date().toISOString(),
        remote.timeEnd || null,
        remote.description || null,
      )
    return 'create'
  }

  db.prepare(`UPDATE events SET title = ?, date = ?, time = ?, location = ?, recurrence = ?, weekdays = ?,
    google_event_id = ?, google_etag = ?, time_end = ?, description = ?, updated_at = ? WHERE id = ?`)
    .run(
      remote.title,
      remote.date,
      remote.time,
      remote.location || null,
      remote.recurrence || null,
      remote.weekdays ? JSON.stringify(remote.weekdays) : null,
      remote.googleEventId,
      remote.googleEtag,
      remote.timeEnd || null,
      remote.description || null,
      new Date().toISOString(),
      existing.id,
    )
  return 'update'
}

export async function pushEventToGoogle(user, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(eventId, user.id)
  if (!event) return null
  const local = {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    timeEnd: event.time_end,
    location: event.location,
    description: event.description,
    recurrence: event.recurrence,
    weekdays: event.weekdays ? JSON.parse(event.weekdays) : undefined,
  }
  const body = localEventToGoogle(local, TZ)
  const calendarId = encodeURIComponent(CAL_ID(user))
  let data
  if (event.google_event_id) {
    data = await calendarRequest(user, `/calendars/${calendarId}/events/${encodeURIComponent(event.google_event_id)}`, {
      method: 'PATCH',
      body,
    })
  } else {
    data = await calendarRequest(user, `/calendars/${calendarId}/events`, { method: 'POST', body })
  }
  db.prepare('UPDATE events SET google_event_id = ?, google_etag = ?, dirty = 0, updated_at = ? WHERE id = ?')
    .run(data.id, data.etag || null, new Date().toISOString(), event.id)
  return data
}

export async function deleteGoogleEvent(user, googleEventId) {
  const calendarId = encodeURIComponent(CAL_ID(user))
  try {
    await calendarRequest(user, `/calendars/${calendarId}/events/${encodeURIComponent(googleEventId)}`, { method: 'DELETE' })
  } catch (err) {
    if (err.status === 404 || err.status === 410) return
    throw err
  }
}

export async function pushDirtyEvents(user) {
  const rows = db.prepare(`SELECT id FROM events WHERE user_id = ? AND origin = 'lifeos' AND (dirty = 1 OR google_event_id IS NULL)`).all(user.id)
  let pushed = 0
  let failed = 0
  for (const row of rows) {
    try {
      await pushEventToGoogle(user, row.id)
      pushed += 1
    } catch (err) {
      failed += 1
      console.warn('calendar push failed', row.id, err.message)
    }
  }
  return { pushed, failed }
}

export async function syncCalendar(user) {
  if (!user.calendar_connected && !user.google_refresh_enc) {
    throw Object.assign(new Error('Google Calendar não está conectado'), { status: 400 })
  }
  const pulled = await pullGoogleEvents(user)
  const pushed = await pushDirtyEvents(user)
  const stamp = new Date().toISOString()
  db.prepare('UPDATE users SET last_calendar_sync = ? WHERE id = ?').run(stamp, user.id)
  return { ok: true, at: stamp, date: todayISO(), ...pulled, ...pushed }
}

export function startCalendarLoop() {
  const ms = config.calendarSyncMs
  if (!ms) return
  setInterval(() => {
    const users = db.prepare('SELECT * FROM users WHERE calendar_connected = 1 AND google_refresh_enc IS NOT NULL').all()
    for (const user of users) {
      syncCalendar(user).catch((err) => console.warn('periodic calendar sync', user.email, err.message))
    }
  }, ms).unref?.()
}
