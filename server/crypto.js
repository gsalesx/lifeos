import crypto from 'node:crypto'
import { config } from './config.js'

function keyBytes() {
  const raw = config.tokenEncryptionKey || config.sessionSecret
  return crypto.createHash('sha256').update(String(raw)).digest()
}

export function encryptSecret(plain) {
  if (plain == null || plain === '') return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${tag.toString('hex')}.${enc.toString('hex')}`
}

export function decryptSecret(packed) {
  if (!packed) return null
  const [ivH, tagH, dataH] = String(packed).split('.')
  if (!ivH || !tagH || !dataH) return null
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivH, 'hex'))
  decipher.setAuthTag(Buffer.from(tagH, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]).toString('utf8')
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}
