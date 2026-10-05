import { randomToken, encryptSecret, decryptSecret, sha256 } from './crypto.js'

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function uidSafe(prefix = 'id') {
  return `${prefix}_${randomToken(9)}`
}

export { encryptSecret, decryptSecret, sha256, randomToken }
