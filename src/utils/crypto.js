// Verschlüsselter Export/Import – läuft komplett lokal über die Web Crypto API.
// Kein Schlüssel, kein Klartext verlässt je das Gerät.
//
// Verfahren: Schlüssel aus dem Passwort via PBKDF2 (SHA-256), Inhalt mit
// AES-GCM verschlüsselt. AES-GCM ist authentifiziert: ein falsches Passwort
// (oder manipulierte Datei) lässt das Entschlüsseln fehlschlagen.

const ITERATIONS = 250_000
const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(str) {
  const bin = atob(str)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}

async function deriveKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Erkennt unser verschlüsseltes Dateiformat.
export function isEncryptedEnvelope(obj) {
  return obj && obj.format === 'tagwerk-encrypted' && typeof obj.data === 'string'
}

// Beliebiges Objekt -> verschlüsselte JSON-Datei (als String).
export async function encryptToEnvelope(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, ITERATIONS)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(payload))
  )
  return JSON.stringify(
    {
      app: 'tagwerk',
      format: 'tagwerk-encrypted',
      version: 1,
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      cipher: 'AES-GCM',
      iterations: ITERATIONS,
      salt: toB64(salt),
      iv: toB64(iv),
      data: toB64(new Uint8Array(ciphertext)),
    },
    null,
    2
  )
}

// Verschlüsselte Datei -> ursprüngliches Objekt. Wirft bei falschem Passwort.
export async function decryptEnvelope(envelope, password) {
  const salt = fromB64(envelope.salt)
  const iv = fromB64(envelope.iv)
  const key = await deriveKey(password, salt, envelope.iterations || ITERATIONS)
  let plaintext
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromB64(envelope.data))
  } catch {
    throw new Error('Falsches Passwort oder beschädigte Datei.')
  }
  return JSON.parse(dec.decode(plaintext))
}
