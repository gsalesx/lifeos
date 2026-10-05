import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emailAllowed, parseEmailList } from '../server/config.js'
import { encryptSecret, decryptSecret, sha256 } from '../server/crypto.js'
import { addDays, startOfWeek, todayISO, weekDates } from '../server/dates.js'
import { scoreNameMatch, weekDiscipline } from '../server/logic.js'

describe('allowlist', () => {
  it('allows anyone when the list is empty', () => {
    assert.equal(emailAllowed('a@b.com', ''), true)
    assert.deepEqual(parseEmailList(''), [])
  })

  it('restricts to listed emails', () => {
    const list = 'guilherme@sales.com, other@x.com'
    assert.equal(emailAllowed('guilherme@sales.com', list), true)
    assert.equal(emailAllowed('GUILHERME@SALES.COM', list), true)
    assert.equal(emailAllowed('nope@x.com', list), false)
  })
})

describe('crypto', () => {
  it('roundtrips secrets', () => {
    const packed = encryptSecret('refresh-token-value')
    assert.notEqual(packed, 'refresh-token-value')
    assert.equal(decryptSecret(packed), 'refresh-token-value')
    assert.equal(sha256('abc').length, 64)
  })
})

describe('dates and discipline', () => {
  it('uses America/Sao_Paulo for today', () => {
    const iso = todayISO('America/Sao_Paulo')
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/)
  })

  it('builds a Monday-Sunday week', () => {
    const start = startOfWeek('2026-10-07')
    assert.equal(start, '2026-10-05')
    assert.deepEqual(weekDates('2026-10-07'), [
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ])
    assert.equal(addDays(start, 1), '2026-10-06')
  })

  it('matches activity names with aliases', () => {
    assert.ok(scoreNameMatch('Jiu Jitsu', 'fui no jiu-jitsu hoje') >= 80)
    assert.ok(scoreNameMatch('Bíblia', 'biblia') >= 80)
    assert.ok(scoreNameMatch('Oração', 'prayer') >= 80)
    assert.equal(scoreNameMatch('Academia', 'xyz'), 0)
  })

  it('computes weekly discipline percent', () => {
    const dates = ['2026-10-05', '2026-10-06']
    const habits = [{
      name: 'Oração',
      frequency: 'daily',
      logs: { '2026-10-05': true },
    }]
    const d = weekDiscipline(habits, [], [], dates)
    assert.equal(d.habitDue, 2)
    assert.equal(d.habitDone, 1)
    assert.equal(d.habitPct, 50)
    assert.equal(d.overall, 50)
  })
})
