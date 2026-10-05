import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-cal-'))
process.env.DATA_DIR = dataDir
process.env.SESSION_SECRET = 'test-session-secret-please-be-long'
process.env.NODE_ENV = 'test'

const { db, uid } = await import('../server/db.js')
const { applyRemoteEvent } = await import('../server/calendar.js')

const userId = uid('u')
db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, onboarding_done) VALUES (?, ?, ?, ?, ?, 1)')
  .run(userId, 'cal@lifeos.test', '', 'Cal', new Date().toISOString())
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true })
})

describe('applyRemoteEvent', () => {
  it('creates, updates by etag, and skips unchanged', () => {
    const item = {
      id: 'google-abc',
      etag: '"1"',
      summary: 'Daily standup',
      start: { dateTime: '2026-10-05T10:00:00-03:00' },
      end: { dateTime: '2026-10-05T10:30:00-03:00' },
      status: 'confirmed',
    }
    assert.equal(applyRemoteEvent(user, item), 'create')
    assert.equal(applyRemoteEvent(user, item), 'etag-match')
    const updated = { ...item, etag: '"2"', summary: 'Daily standup (novo)' }
    assert.equal(applyRemoteEvent(user, updated), 'update')
    const row = db.prepare('SELECT * FROM events WHERE google_event_id = ?').get('google-abc')
    assert.equal(row.title, 'Daily standup (novo)')
    assert.equal(row.origin, 'google')
  })

  it('does not duplicate a LifeOS event that already has the private id', () => {
    const id = uid('e')
    db.prepare(`INSERT INTO events (id, user_id, title, date, time, done, origin, dirty, google_event_id, google_etag)
      VALUES (?, ?, ?, ?, ?, 0, 'lifeos', 0, ?, ?)`)
      .run(id, userId, 'Trabalho', '2026-10-05', '09:00', 'g-work', '"a"')
    const result = applyRemoteEvent(user, {
      id: 'g-work',
      etag: '"a"',
      summary: 'Trabalho',
      start: { dateTime: '2026-10-05T09:00:00-03:00' },
      status: 'confirmed',
      extendedProperties: { private: { lifeosEventId: id } },
    })
    assert.equal(result, 'etag-match')
    const count = db.prepare('SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND title = ?').get(userId, 'Trabalho')
    assert.equal(count.n, 1)
  })

  it('unlinks a LifeOS event cancelled in Google instead of deleting it', () => {
    const id = uid('e')
    db.prepare(`INSERT INTO events (id, user_id, title, date, time, done, origin, dirty, google_event_id)
      VALUES (?, ?, ?, ?, ?, 0, 'lifeos', 0, ?)`).run(id, userId, 'Família', '2026-10-06', '19:00', 'g-fam')
    assert.equal(applyRemoteEvent(user, { id: 'g-fam', status: 'cancelled' }), 'unlink')
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id)
    assert.ok(row)
    assert.equal(row.google_event_id, null)
  })
})
