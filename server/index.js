import { createApp } from './app.js'
import { startCalendarLoop } from './calendar.js'
import { config } from './config.js'
import { db, uid } from './db.js'
import { seedDemoUser } from './seed.js'
import bcrypt from 'bcryptjs'

function ensureDemo() {
  const email = config.demoEmail
  const password = config.demoPassword
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(existing.id)
    return
  }
  const id = uid('u')
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, onboarding_done) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id, email, bcrypt.hashSync(password, 10), 'Lucas', new Date().toISOString())
  seedDemoUser(id)
  console.log(`Conta demo criada: ${email}`)
}

ensureDemo()
startCalendarLoop()

const app = createApp()
app.listen(config.port, '0.0.0.0', () => {
  console.log(`LifeOS listening on ${config.port}`)
})
