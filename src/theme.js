// Farbwelten je Sektion – für Abwechslung im Check-in (grug-inspirierte
// Vollbild-Hintergründe). Jede Sektion hat eigenen Grund-, Tinten- und Akzentton.
// Die Werte werden als CSS-Variablen auf den Flow-Screen gelegt; die bestehenden
// Feld-Komponenten (var(--accent), --field-bg, …) ziehen automatisch nach.

export const SECTION_THEMES = {
  intro: { bg: '#16243a', ink: '#f4efe6', soft: '#b7c4d8', accent: '#ffd27a' },
  sleep: { bg: '#1b2350', ink: '#eef0fb', soft: '#aab2e0', accent: '#9db1ff' },
  substances: { bg: '#3b2342', ink: '#f5e9f1', soft: '#caa9d2', accent: '#e08ec0' },
  nosmoke: { bg: '#173d2c', ink: '#e9f4ec', soft: '#a4cab2', accent: '#74d39a' },
  sexual: { bg: '#4d211d', ink: '#f9e8e2', soft: '#dba99a', accent: '#ff8a66' },
  movement: { bg: '#0f3a44', ink: '#e4f2f4', soft: '#94c2c9', accent: '#46d3e4' },
  mood: { bg: '#523f12', ink: '#f7efda', soft: '#d6c085', accent: '#f7c24a' },
  note: { bg: '#26262b', ink: '#efedf1', soft: '#b3b0b9', accent: '#d2ccd8' },
  done: { bg: '#173d2c', ink: '#e9f4ec', soft: '#a4cab2', accent: '#74d39a' },
}

export function themeFor(areaId) {
  return SECTION_THEMES[areaId] || SECTION_THEMES.note
}

// Als Inline-Style für den Flow-Container: überschreibt die globalen Variablen.
export function themeVars(t) {
  return {
    '--bg': t.bg,
    '--ink': t.ink,
    '--ink-soft': t.soft,
    '--muted': t.soft,
    '--accent': t.accent,
    '--field-bg': 'rgba(255,255,255,0.10)',
    '--line': 'rgba(255,255,255,0.16)',
    '--line-strong': 'rgba(255,255,255,0.28)',
  }
}
