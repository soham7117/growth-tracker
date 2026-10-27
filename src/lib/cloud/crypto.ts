// Backup encoding: JSON -> gzip -> (optional AES-GCM encryption) -> text.
//   "gt0.<base64 gzip>"                          plain (compressed only)
//   "gt1.<salt>.<iv>.<base64 ciphertext>"        encrypted with a passphrase (PBKDF2 + AES-GCM)
// Encryption happens in the browser, so the database owner cannot read the content.

const enc = new TextEncoder()
const dec = new TextDecoder()
const ITERATIONS = 200_000

export class WrongPassphraseError extends Error {
  constructor() {
    super('wrong_passphrase')
  }
}

function toB64(bytes: Uint8Array) {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(s)
}

function fromB64(b64: string) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const w = stream.writable.getWriter()
  w.write(data as BufferSource)
  w.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

const gzip = (d: Uint8Array) => pipe(d, new CompressionStream('gzip'))
const gunzip = (d: Uint8Array) => pipe(d, new DecompressionStream('gzip'))

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encodeBackup(json: string, passphrase?: string): Promise<string> {
  const packed = await gzip(enc.encode(json))
  if (!passphrase) return 'gt0.' + toB64(packed)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, packed as BufferSource))
  return `gt1.${toB64(salt)}.${toB64(iv)}.${toB64(ct)}`
}

export const isEncryptedBackup = (text: string) => text.startsWith('gt1.')

export async function decodeBackup(text: string, passphrase?: string): Promise<string> {
  if (text.startsWith('gt0.')) return dec.decode(await gunzip(fromB64(text.slice(4))))
  if (text.startsWith('gt1.')) {
    if (!passphrase) throw new WrongPassphraseError()
    const [, s, i, c] = text.split('.')
    const key = await deriveKey(passphrase, fromB64(s))
    let packed: ArrayBuffer
    try {
      packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(i) as BufferSource }, key, fromB64(c) as BufferSource)
    } catch {
      throw new WrongPassphraseError()
    }
    return dec.decode(await gunzip(new Uint8Array(packed)))
  }
  throw new Error('Unknown backup format')
}
