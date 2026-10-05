import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decideCancelled, googleEventToLocal, localEventToGoogle, rruleToWeekdays, shouldApplyRemote, weekdaysToRrule } from '../server/calendar-map.js'

describe('calendar mapping', () => {
  it('converts weekdays to RRULE and back', () => {
    const rule = weekdaysToRrule([1, 3, 5])
    assert.equal(rule, 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    assert.deepEqual(rruleToWeekdays([rule]), [1, 3, 5])
  })

  it('maps a Google timed event into LifeOS', () => {
    const local = googleEventToLocal({
      id: 'g1',
      etag: '"abc"',
      summary: 'Jiu-jitsu',
      location: 'Academia',
      start: { dateTime: '2026-10-05T20:00:00-03:00' },
      end: { dateTime: '2026-10-05T21:30:00-03:00' },
    }, 'America/Sao_Paulo')
    assert.equal(local.title, 'Jiu-jitsu')
    assert.equal(local.date, '2026-10-05')
    assert.equal(local.time, '20:00')
    assert.equal(local.timeEnd, '21:30')
    assert.equal(local.googleEventId, 'g1')
    assert.equal(local.origin, 'google')
  })

  it('maps a weekly LifeOS event to Google with private id', () => {
    const body = localEventToGoogle({
      id: 'e_local',
      title: 'Trabalho',
      date: '2026-10-05',
      time: '09:00',
      timeEnd: '18:00',
      recurrence: 'weekly',
      weekdays: [1, 2, 3, 4, 5],
    }, 'America/Sao_Paulo')
    assert.equal(body.extendedProperties.private.lifeosEventId, 'e_local')
    assert.equal(body.recurrence[0], 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
    assert.equal(body.start.timeZone, 'America/Sao_Paulo')
  })

  it('skips pull when etag matches (no duplicate loop)', () => {
    const decision = shouldApplyRemote(
      { google_etag: '"v1"', dirty: 0, origin: 'google' },
      { googleEtag: '"v1"' },
    )
    assert.equal(decision.apply, false)
    assert.equal(decision.reason, 'etag-match')
  })

  it('keeps local dirty LifeOS events instead of overwriting', () => {
    const decision = shouldApplyRemote(
      { google_etag: '"old"', dirty: 1, origin: 'lifeos' },
      { googleEtag: '"new"' },
    )
    assert.equal(decision.apply, false)
    assert.equal(decision.reason, 'local-dirty')
  })

  it('deletes google-origin events on cancel and unlinks lifeos-origin', () => {
    assert.equal(decideCancelled({ origin: 'google' }), 'delete')
    assert.equal(decideCancelled({ origin: 'lifeos' }), 'unlink')
    assert.equal(decideCancelled(null), 'none')
  })
})
