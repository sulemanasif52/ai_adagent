import crypto from 'node:crypto'
import { env } from '../env.js'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function getKey() {
  const raw = Buffer.from(env.ENCRYPTION_KEY, 'base64')
  if (raw.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${raw.length})`)
  }
  return raw
}

export function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return null
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join(':')
}

export function decrypt(ciphertext) {
  if (!ciphertext) return null
  const [ivB64, ctB64, tagB64] = ciphertext.split(':')
  if (!ivB64 || !ctB64 || !tagB64) return null
  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()])
  return pt.toString('utf8')
}

// Returns the value with the last 4 chars visible: "sk-...A1B2"
export function mask(plaintext) {
  if (!plaintext) return ''
  const s = String(plaintext)
  if (s.length <= 8) return '••••'
  return `••••${s.slice(-4)}`
}
