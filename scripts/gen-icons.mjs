// Erzeugt die App-Icons aus der Sonnenaufgang-Doodle des Flow-Starts.
// Navy Grund + warmes Gelb, zentriert. Rasterisierung via sharp.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const OUT = new URL('../public/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const BG = '#16243a'
const INK = '#ffd27a'

// Motiv im 120er-Koordinatensystem (identisch zur Dawn-Illustration im Flow).
const MOTIF = `
  <path d="M18 84 q14 -3 28 -2 q14 1 28 0 q14 -1 28 1" />
  <path d="M40 84 a20 20 0 0 1 40 0" />
  <path d="M60 40 v-12 M82 48 l9 -9 M38 48 l-9 -9 M94 70 h13 M26 70 H13" />
`
// Motiv-Grenzen -> Mittelpunkt (60,57), Breite 94.
const MOTIF_CX = 60
const MOTIF_CY = 57
const MOTIF_W = 94

function svg(size, frac, bg = BG) {
  const scale = (size * frac) / MOTIF_W
  const sw = 3 // im 120er-Raum; skaliert mit
  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgRect}
    <g transform="translate(${size / 2},${size / 2}) scale(${scale}) translate(${-MOTIF_CX},${-MOTIF_CY})"
       fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      ${MOTIF}
    </g>
  </svg>`
}

async function png(name, size, frac, bg = BG) {
  await sharp(Buffer.from(svg(size, frac, bg))).png().toFile(new URL(name, OUT).pathname)
  console.log('•', name)
}

// Normale Icons: zentriert mit etwas Rand. Maskable: mehr Sicherheitsabstand.
await png('icon-192.png', 192, 0.66)
await png('icon-512.png', 512, 0.66)
await png('icon-512-maskable.png', 512, 0.52)
await png('apple-touch-icon.png', 180, 0.62)

// Vektor-Favicon
import { writeFileSync } from 'node:fs'
writeFileSync(new URL('favicon.svg', OUT), svg(64, 0.7))
console.log('• favicon.svg')
console.log('Icons erzeugt.')
