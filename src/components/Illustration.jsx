// Handgezeichnete Doodle-Illustrationen je Sektion (grug-inspiriert).
// Reine Linienzeichnungen in currentColor – passen sich der Sektionsfarbe an.

const COMMON = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" className="doodle">
      <g {...COMMON}>{children}</g>
    </svg>
  )
}

// Aufgehende Sonne (Intro / Morgen)
const Dawn = () => (
  <Svg>
    <path d="M18 84 q14 -3 28 -2 q14 1 28 0 q14 -1 28 1" />
    <path d="M40 84 a20 20 0 0 1 40 0" />
    <path d="M60 40 v-12 M82 48 l9 -9 M38 48 l-9 -9 M94 70 h13 M26 70 H13" />
  </Svg>
)

// Mond + Sterne (Schlaf)
const Moon = () => (
  <Svg>
    <path d="M74 30 a30 30 0 1 0 18 54 a24 24 0 1 1 -18 -54 z" />
    <path d="M34 38 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" />
    <path d="M40 78 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
  </Svg>
)

// Weinglas (Substanzen)
const Glass = () => (
  <Svg>
    <path d="M40 26 h40 q2 18 -4 30 q-6 12 -16 12 q-10 0 -16 -12 q-6 -12 -4 -30 z" />
    <path d="M44 40 q16 5 32 0" />
    <path d="M60 68 v22 M46 92 h28" />
  </Svg>
)

// Setzling (Nicht rauchen – Wachstum)
const Sprout = () => (
  <Svg>
    <path d="M60 92 V52" />
    <path d="M60 64 q-20 2 -28 -14 q20 -4 28 14 z" />
    <path d="M60 56 q18 0 26 -14 q-20 -2 -26 14 z" />
    <path d="M44 92 q16 6 32 0" />
  </Svg>
)

// Herz mit Pfeil (Sexuelle Gesundheit)
const HeartArrow = () => (
  <Svg>
    <path d="M60 86 q-26 -18 -30 -38 q-2 -16 14 -16 q12 0 16 12 q4 -12 16 -12 q16 0 14 16 q-4 20 -30 38 z" />
    <path d="M24 40 l72 36" />
    <path d="M96 76 l-2 -12 M96 76 l-12 -2" />
    <path d="M24 40 l12 1 M24 40 l1 12" />
  </Svg>
)

// Berge + Sonne (Bewegung)
const Mountain = () => (
  <Svg>
    <path d="M16 86 l24 -40 l18 26 l14 -20 l32 34 z" />
    <path d="M40 46 l8 12 M74 52 l-7 10" />
    <circle cx="84" cy="36" r="9" />
  </Svg>
)

// Sonne hinter Wolke + Lächeln (Stimmung)
const Cloud = () => (
  <Svg>
    <circle cx="74" cy="44" r="14" />
    <path d="M74 22 v-7 M96 44 h7 M90 28 l5 -5" />
    <path d="M34 78 q-14 0 -14 -12 q0 -12 13 -12 q2 -12 16 -12 q14 0 16 13 q12 -1 12 11 q0 12 -13 12 z" />
  </Svg>
)

// Stift schreibt (Tagesnotiz)
const Pen = () => (
  <Svg>
    <path d="M30 84 q18 -6 60 -48" />
    <path d="M74 22 l16 16 l-40 40 l-18 4 l4 -18 z" />
    <path d="M70 30 l16 16" />
  </Svg>
)

// Fahne auf Hügel (Abschluss)
const Flag = () => (
  <Svg>
    <path d="M16 92 q24 -10 44 -10 q22 0 44 10" />
    <path d="M54 82 V34" />
    <path d="M54 36 q16 2 26 8 q-12 6 -26 8 z" />
    <circle cx="54" cy="30" r="3" />
  </Svg>
)

// Pfeil nach oben (aktueller Schritt in der Subnavigation)
const ArrowUp = () => (
  <Svg>
    <path d="M60 94 q-3 -32 -1 -64" />
    <path d="M36 54 q20 -24 23 -28 q4 4 23 27" />
  </Svg>
)

const MAP = {
  intro: Dawn,
  sleep: Moon,
  substances: Glass,
  nosmoke: Sprout,
  sexual: HeartArrow,
  movement: Mountain,
  mood: Cloud,
  note: Pen,
  done: Flag,
  arrowup: ArrowUp,
}

export function Illustration({ name }) {
  const Comp = MAP[name] || Dawn
  return (
    <div className="illustration">
      <Comp />
    </div>
  )
}
