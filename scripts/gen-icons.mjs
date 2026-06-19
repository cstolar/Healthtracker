// Erzeugt einfache PNG-App-Icons ohne externe Tools.
// Ruhiges Motiv: dunkler Grund, weicher Akzent-Kreis (aufgehende Sonne).
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync(new URL('../public', import.meta.url), { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function png(size, draw) {
  const px = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y)
      const o = (y * size + x) * 4
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a
    }
  }
  // Filter-Byte 0 pro Zeile.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8        // bit depth
  ihdr[9] = 6        // RGBA
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [14, 14, 16]
const ACCENT = [125, 155, 118]

function makeIcon(size, maskable) {
  return png(size, (x, y) => {
    // Akzent-Kreis, leicht nach unten versetzt (Sonnenaufgang).
    const cx = size * 0.5
    const cy = size * 0.56
    const r = size * (maskable ? 0.26 : 0.3)
    const d = Math.hypot(x - cx, y - cy)
    if (d < r) {
      // weicher Rand
      const edge = Math.min(1, (r - d) / (size * 0.03))
      return [
        Math.round(BG[0] + (ACCENT[0] - BG[0]) * edge),
        Math.round(BG[1] + (ACCENT[1] - BG[1]) * edge),
        Math.round(BG[2] + (ACCENT[2] - BG[2]) * edge),
        255,
      ]
    }
    return [...BG, 255]
  })
}

const out = (name) => new URL('../public/' + name, import.meta.url)

writeFileSync(out('icon-192.png'), makeIcon(192, false))
writeFileSync(out('icon-512.png'), makeIcon(512, false))
writeFileSync(out('icon-512-maskable.png'), makeIcon(512, true))
writeFileSync(out('apple-touch-icon.png'), makeIcon(180, false))

console.log('Icons erzeugt.')
