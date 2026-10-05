import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import bcrypt from 'bcryptjs'

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-mcp-'))
process.env.DATA_DIR = dataDir
process.env.SESSION_SECRET = 'test-session-secret-please-be-long'
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-32bytes-min'
process.env.MCP_BOOTSTRAP_TOKEN = 'bootstrap-test-token'
process.env.NODE_ENV = 'test'
process.env.PORT = '0'

const { createApp } = await import('../server/app.js')
const { db, uid } = await import('../server/db.js')
const { createApiToken } = await import('../server/tokens.js')
const { handleMcpMessage, TOOLS } = await import('../server/mcp.js')

let server
let base
let user
let token

function rpc(method, params, id = 1) {
  return fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
}

before(async () => {
  const id = uid('u')
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, onboarding_done) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id, 'gui@lifeos.test', bcrypt.hashSync('password12', 4), 'Guilherme', new Date().toISOString())
  db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg, quant_goal, quant_unit, time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('h'), id, 'Jiu Jitsu', 'saude', JSON.stringify([1, 3, 5]), 40, '#16a34a', '#f0fdf4', null, null, '20:00')
  db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg, quant_goal, quant_unit, time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('h'), id, 'Bíblia', 'fe', JSON.stringify('daily'), 15, '#f59e0b', '#fef3c7', null, null, '07:15')
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  token = createApiToken(id, 'test').token
  const app = createApp()
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(dataDir, { recursive: true, force: true })
})

describe('MCP HTTP', () => {
  it('rejects missing bearer', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    assert.equal(res.status, 401)
  })

  it('lists tools', async () => {
    const res = await rpc('tools/list')
    assert.equal(res.status, 200)
    const body = await res.json()
    const names = body.result.tools.map((t) => t.name)
    assert.ok(names.includes('log_activity'))
    assert.ok(names.includes('sync_calendar'))
    assert.ok(names.includes('get_discipline'))
    assert.ok(names.includes('create_event'))
    assert.ok(TOOLS.length >= 20)
  })

  it('accepts the bootstrap env token', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { Authorization: 'Bearer bootstrap-test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }),
    })
    const body = await res.json()
    assert.equal(body.result.serverInfo.name, 'lifeos')
    assert.ok(res.headers.get('mcp-session-id'))
  })

  it('log_activity marks jiu-jitsu done today and persists', async () => {
    const res = await rpc('tools/call', { name: 'log_activity', arguments: { name: 'fui no jiu-jitsu hoje' } }, 3)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.result.isError, undefined)
    assert.equal(body.result.structuredContent.kind, 'habit')
    const date = body.result.structuredContent.date
    const logs = db.prepare('SELECT * FROM habit_logs WHERE date = ?').all(date)
    assert.ok(logs.length >= 1)
    const habit = db.prepare('SELECT * FROM habits WHERE name = ?').get('Jiu Jitsu')
    const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, date)
    assert.ok(log)
    assert.equal(log.value, 'true')
  })

  it('handleMcpMessage works without HTTP', async () => {
    const listed = await handleMcpMessage(user, { jsonrpc: '2.0', id: 1, method: 'tools/list' })
    assert.ok(listed.result.tools.some((t) => t.name === 'get_today'))
    const bible = await handleMcpMessage(user, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'log_bible_reading', arguments: {} },
    })
    assert.equal(bible.result.structuredContent.kind, 'habit')
    const hid = db.prepare('SELECT id FROM habits WHERE name = ?').get('Bíblia').id
    const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ?').get(hid)
    assert.ok(log)
  })
})
