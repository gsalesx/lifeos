import { db, uid } from './db.js'

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekday(iso) {
  return new Date(`${iso}T12:00:00`).getDay()
}

export function seedDemoUser(userId) {
  const today = todayISO()
  const insP = db.prepare('INSERT INTO projects (id, user_id, name, status, color, icon) VALUES (?, ?, ?, ?, ?, ?)')
  const projects = [
    ['p-saas', 'SaaS Shopify', 'andamento', '#4f46e5', 'bolt'],
    ['p-port', 'Portfólio Dev', 'planejamento', '#16a34a', 'folder'],
    ['p-com', 'Comercial', 'andamento', '#f59e0b', 'folder'],
    ['p-pes', 'Pessoal', 'andamento', '#818cf8', 'folder'],
  ]
  const pids = {}
  for (const [old, name, status, color, icon] of projects) {
    const id = uid('p')
    pids[old] = id
    insP.run(id, userId, name, status, color, icon)
  }

  const insT = db.prepare(`INSERT INTO tasks (id, user_id, title, project_id, area, date, time, time_end, priority, done, archived, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
  const tasks = [
    ['Criar Landing Page', 'p-saas', 'trabalho', today, '09:00', '11:30', 'alta', 0, addDays(today, -3)],
    ['Reunião com cliente', 'p-com', 'trabalho', today, '16:00', null, 'alta', 0, addDays(today, -1)],
    ['Estudar inglês', 'p-pes', 'estudos', today, '20:00', null, 'baixa', 0, today],
    ['Revisar código do projeto', 'p-saas', 'trabalho', today, '14:00', null, 'media', 1, addDays(today, -2)],
    ['Atualizar portfólio', 'p-port', 'trabalho', today, null, null, 'baixa', 1, addDays(today, -4)],
    ['Configurar domínio', 'p-saas', 'trabalho', addDays(today, -2), null, null, 'alta', 0, addDays(today, -4)],
    ['Revisar metas da semana', 'p-pes', 'trabalho', today, null, null, 'media', 0, today],
    ['Ler 30 páginas', 'p-pes', 'estudos', today, null, null, 'media', 1, today],
    ['Daily e revisão', 'p-saas', 'trabalho', addDays(today, -1), null, null, 'media', 1, addDays(today, -1)],
    ['Ajustar checkout', 'p-saas', 'trabalho', addDays(today, -2), null, null, 'alta', 1, addDays(today, -3)],
    ['Estudar vocabulário', 'p-pes', 'estudos', addDays(today, -3), null, null, 'baixa', 1, addDays(today, -3)],
    ['Landing hero', 'p-saas', 'trabalho', addDays(today, -4), null, null, 'alta', 1, addDays(today, -5)],
    ['Reunião comercial', 'p-com', 'trabalho', addDays(today, -5), null, null, 'alta', 1, addDays(today, -6)],
    ['Treino extra', 'p-pes', 'saude', addDays(today, -6), null, null, 'media', 1, addDays(today, -6)],
  ]
  for (const t of tasks) {
    insT.run(uid('t'), userId, t[0], pids[t[1]], t[2], t[3], t[4], t[5], t[6], t[7], t[8])
  }

  const insH = db.prepare(`INSERT INTO habits (id, user_id, name, category, frequency, xp, color, icon_bg, quant_goal, quant_unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insL = db.prepare('INSERT INTO habit_logs (habit_id, date, value) VALUES (?, ?, ?)')
  const habitDefs = [
    { name: 'Oração', cat: 'fe', freq: 'daily', xp: 15, color: '#f59e0b', bg: '#fef3c7', rate: 0.94 },
    { name: 'Bíblia', cat: 'fe', freq: 'daily', xp: 15, color: '#f59e0b', bg: '#fef3c7', rate: 0.78 },
    { name: 'Jiu Jitsu', cat: 'saude', freq: [1, 3, 5], xp: 40, color: '#16a34a', bg: '#f0fdf4', rate: 0.86, skipW: true },
    { name: 'Água', cat: 'saude', freq: 'daily', xp: 10, color: '#0ea5e9', bg: '#f0f9ff', rate: 0.88, goal: 8, unit: 'copos' },
    { name: 'Academia', cat: 'saude', freq: 'weekdays', xp: 30, color: '#ef4444', bg: '#fef2f2', rate: 0.55, skipW: true },
    { name: 'Leitura', cat: 'estudos', freq: 'daily', xp: 20, color: '#3b82f6', bg: '#eff6ff', rate: 0.72 },
    { name: 'Vitaminas', cat: 'saude', freq: 'daily', xp: 5, color: '#8b5cf6', bg: '#f5f3ff', rate: 0.96 },
  ]
  for (const h of habitDefs) {
    const hid = uid('h')
    insH.run(hid, userId, h.name, h.cat, JSON.stringify(h.freq), h.xp, h.color, h.bg, h.goal ?? null, h.unit ?? null)
    for (let i = 34; i >= 0; i--) {
      const iso = addDays(today, -i)
      const dow = weekday(iso)
      if (h.skipW && (dow === 0 || dow === 6)) continue
      if (Array.isArray(h.freq) && !h.freq.includes(dow)) continue
      if (h.freq === 'weekdays' && (dow === 0 || dow === 6)) continue
      if (i === 0 && (h.name === 'Oração' || h.name === 'Leitura' || h.name === 'Vitaminas')) {
        insL.run(hid, iso, h.goal ? String(h.goal) : 'true')
        continue
      }
      if (i === 0 && h.name === 'Água') {
        insL.run(hid, iso, '6')
        continue
      }
      if (Math.random() < h.rate) {
        insL.run(hid, iso, h.goal ? String(Math.max(4, Math.round(h.goal * 0.8))) : 'true')
      }
    }
  }

  const insE = db.prepare('INSERT INTO events (id, user_id, title, date, time, location, done) VALUES (?, ?, ?, ?, ?, ?, ?)')
  insE.run(uid('e'), userId, 'Daily standup', today, '10:00', 'Google Meet', 1)
  insE.run(uid('e'), userId, 'Reunião SaaS Shopify', today, '14:00', 'Google Meet', 0)
  insE.run(uid('e'), userId, 'Reunião com cliente', today, '16:00', 'Google Meet', 0)

  const insTr = db.prepare(`INSERT INTO tracking (user_id, date, bed_time, wake_time, mood, stress, energy, water, meal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const beds = ['22:00', '22:30', '23:00', '23:30']
  const wakes = ['06:00', '06:30', '07:00', '07:30']
  for (let i = 14; i >= 0; i--) {
    const date = addDays(today, -i)
    insTr.run(userId, date, i === 0 ? '22:30' : beds[i % beds.length], i === 0 ? '06:00' : wakes[i % wakes.length], i === 0 ? 4 : 3 + ((i * 3) % 3), i === 0 ? 3 : 2 + (i % 5), i === 0 ? 4 : 3 + (i % 3), i === 0 ? 6 : 5 + (i % 4), '18h', i === 0 ? '' : null)
  }

  const insB = db.prepare('INSERT INTO buildings (id, user_id, name, area, level, progress, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const b of [
    ['Igreja', 'fe', 2, 40, '#7c3aed'],
    ['Academia', 'saude', 3, 60, '#ef4444'],
    ['Biblioteca', 'estudos', 1, 20, '#f59e0b'],
    ['Oficina', 'trabalho', 2, 40, '#4f46e5'],
    ['Casa', 'financas', 4, 80, '#16a34a'],
  ]) insB.run(uid('b'), userId, b[0], b[1], b[2], b[3], b[4])

  db.prepare('UPDATE users SET xp = 3240, next_level_xp = 5000, level = 12, name = ? WHERE id = ?').run('Lucas', userId)
}
