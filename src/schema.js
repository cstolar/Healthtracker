// ---------------------------------------------------------------------------
// Schema-getriebenes Datenmodell.
//
// Die gesamte App rendert sich aus dieser Konfiguration. Neue Bereiche oder
// Felder hier ergänzen – die UI, Persistenz und Exporte ziehen automatisch nach.
//
// Feldtypen:
//   scale    – Tap-Skala 1..max, optional mit Kurzlabels je Stufe
//   toggle   – Ja/Nein
//   counter  – +/- mit min/max/step und Einheit
//   slider   – Schieberegler (min..max)
//   select   – Segment-Auswahl aus options[{value,label}]
//   time     – Uhrzeit (HH:MM)
//   number   – optionale Zahl (kleines Eingabefeld)
//   text     – einzeilige Notiz
//   textarea – mehrzeiliger Freitext
//   computed – berechnet (nicht editierbar), z.B. Schlafdauer
//
// Gemeinsame Eigenschaften:
//   when     – 'today' | 'yesterday' (Zeitbezug-Label)
//   showIf   – (values) => boolean, blendet abhängige Felder ein/aus
//   optional – rein informativ ("optional")
//   metric   – true markiert ein Feld als auswertbare Kennzahl für Trends
// ---------------------------------------------------------------------------

export const EHS_LABELS = {
  1: 'wird größer, aber nicht hart',
  2: 'hart, aber nicht penetrationsfähig',
  3: 'penetrationsfähig, aber nicht voll steif',
  4: 'voll steif',
}

const EHS_SHORT = {
  1: 'wird größer',
  2: 'hart',
  3: 'penetrabel',
  4: 'voll steif',
}

export const SCHEMA = [
  {
    id: 'sleep',
    title: 'Schlaf',
    emoji: '🌙',
    intro: 'Wie war die Nacht?',
    fields: [
      {
        id: 'sleepWindow',
        type: 'sleepwindow',
        label: 'Schlaffenster',
        hint: 'Zieh Mond und Wecker auf deine Zeiten.',
      },
      // bedtime/waketime werden vom Schlaffenster gesetzt – keine eigenen Fragen,
      // aber als Felder erhalten für Schlafdauer-Berechnung und Export.
      { id: 'bedtime', type: 'time', label: 'Bettzeit', when: 'yesterday', subfield: true },
      { id: 'waketime', type: 'time', label: 'Aufwachzeit', when: 'today', subfield: true },
      {
        id: 'sleepDuration',
        type: 'computed',
        label: 'Schlafdauer',
        unit: 'Std.',
        metric: true,
        compute: (v) => durationHours(v.bedtime, v.waketime),
      },
      {
        id: 'sleepQuality',
        type: 'scale',
        label: 'Schlafqualität',
        when: 'today',
        max: 5,
        metric: true,
        endLabels: ['schlecht', 'top'],
      },
    ],
  },

  {
    id: 'substances',
    title: 'Substanzen',
    emoji: '🍷',
    intro: 'Rückblick auf gestern.',
    fields: [
      {
        id: 'alcohol',
        type: 'slider',
        label: 'Alkohol',
        when: 'yesterday',
        min: 0,
        max: 10,
        step: 1,
        unit: 'Drinks',
        maxLabel: '10+',
        metric: true,
      },
      {
        id: 'cannabis',
        type: 'toggle',
        label: 'Cannabis',
        when: 'yesterday',
        metric: true,
      },
      {
        id: 'cannabisAmount',
        type: 'select',
        label: 'Menge',
        when: 'yesterday',
        options: [
          { value: 'wenig', label: 'wenig' },
          { value: 'mittel', label: 'mittel' },
          { value: 'viel', label: 'viel' },
        ],
        showIf: (v) => v.cannabis === true,
      },
    ],
  },

  {
    id: 'nosmoke',
    title: 'Nicht rauchen',
    emoji: '🚭',
    intro: 'Schritt für Schritt. Jeder Datenpunkt zählt – ganz ohne Wertung.',
    fields: [
      {
        id: 'cigarettes',
        type: 'counter',
        label: 'Zigaretten gestern',
        when: 'yesterday',
        min: 0,
        max: 60,
        step: 1,
        unit: 'Stk.',
        metric: true,
        hint: '0 = rauchfreier Tag. Zählt in deine Serie.',
      },
      {
        id: 'cravingMax',
        type: 'scale',
        label: 'Stärkstes Rauchverlangen gestern',
        when: 'yesterday',
        min: 0,
        max: 10,
        endLabels: ['keins', 'übermächtig'],
        metric: true,
      },
      {
        id: 'cravingTrigger',
        type: 'multiselect',
        label: 'Auslöser des stärksten Verlangens',
        when: 'yesterday',
        options: [
          { value: 'stress', label: 'Stress' },
          { value: 'essen', label: 'nach dem Essen' },
          { value: 'kaffee', label: 'Kaffee' },
          { value: 'alkohol', label: 'Alkohol' },
          { value: 'sozial', label: 'soziale Situation' },
          { value: 'langeweile', label: 'Langeweile' },
          { value: 'pause', label: 'Pause / Routine' },
          { value: 'sonstiges', label: 'Sonstiges' },
        ],
      },
      {
        id: 'quitConfidence',
        type: 'scale',
        label: 'Zuversicht, heute rauchfrei zu bleiben',
        when: 'today',
        min: 1,
        max: 5,
        endLabels: ['gering', 'sehr hoch'],
        metric: true,
      },
    ],
  },

  {
    id: 'sexual',
    title: 'Sexuelle Gesundheit',
    emoji: '🔥',
    intro: 'Dein Kernmodul. Ehrlich und ohne Wertung.',
    fields: [
      // --- Heute Morgen ---
      {
        id: 'morningEHS',
        type: 'scale',
        label: 'Morgenerektion (EHS)',
        when: 'today',
        max: 4,
        stepLabels: EHS_SHORT,
        descriptions: EHS_LABELS,
        metric: true,
      },
      {
        id: 'glansSensitivity',
        type: 'scale',
        label: 'Eichel-Empfindlichkeit',
        when: 'today',
        max: 5,
        endLabels: ['abgestumpft', 'sehr empfindlich'],
        metric: true,
      },

      // --- Rückblick gestern: Selbstbefriedigung ---
      {
        id: 'masturbation',
        type: 'toggle',
        label: 'Selbstbefriedigung',
        when: 'yesterday',
      },
      {
        id: 'masturbationPorn',
        type: 'toggle',
        label: 'mit Pornografie?',
        when: 'yesterday',
        showIf: (v) => v.masturbation === true,
      },
      {
        id: 'masturbationTechnique',
        type: 'select',
        label: 'Technik',
        when: 'yesterday',
        options: [
          { value: 'leicht', label: 'leicht' },
          { value: 'intensiv', label: 'intensiv' },
        ],
        showIf: (v) => v.masturbation === true,
      },
      {
        id: 'masturbationEHS',
        type: 'scale',
        label: 'EHS dabei',
        when: 'yesterday',
        max: 4,
        stepLabels: EHS_SHORT,
        descriptions: EHS_LABELS,
        metric: true,
        showIf: (v) => v.masturbation === true,
      },

      // --- Rückblick gestern: Partnersex ---
      {
        id: 'partnerSex',
        type: 'toggle',
        label: 'Partnersex',
        when: 'yesterday',
      },
      {
        id: 'partnerEHS',
        type: 'scale',
        label: 'EHS dabei',
        when: 'yesterday',
        max: 4,
        stepLabels: EHS_SHORT,
        descriptions: EHS_LABELS,
        metric: true,
        showIf: (v) => v.partnerSex === true,
      },
      {
        id: 'erectionHeld',
        type: 'select',
        label: 'Erektion bis zum Ende gehalten?',
        when: 'yesterday',
        options: [
          { value: 'ja', label: 'ja' },
          { value: 'teilweise', label: 'teilweise' },
          { value: 'nein', label: 'nein' },
        ],
        showIf: (v) => v.partnerSex === true,
      },
      {
        id: 'condomLoss',
        type: 'toggle',
        label: 'Verlust beim Kondom-Anlegen?',
        when: 'yesterday',
        showIf: (v) => v.partnerSex === true,
      },
      {
        id: 'presentMind',
        type: 'scale',
        label: 'Im Kopf ↔ präsent',
        when: 'yesterday',
        max: 5,
        endLabels: ['stark im Kopf', 'ganz im Moment'],
        metric: true,
        showIf: (v) => v.partnerSex === true,
      },

      // --- Protokoll-Adhärenz (heute) ---
      {
        id: 'noPornKept',
        type: 'toggle',
        label: 'Kein-Porno eingehalten',
        when: 'today',
        adherence: true,
      },
      {
        id: 'pelvicFloor',
        type: 'toggle',
        label: 'Beckenboden-Übung gemacht',
        when: 'today',
        adherence: true,
      },
      {
        id: 'stimulationFree',
        type: 'toggle',
        label: 'Reizfreier Tag',
        when: 'today',
        adherence: true,
      },
    ],
  },

  {
    id: 'movement',
    title: 'Bewegung',
    emoji: '🏃',
    intro: 'Was hast du gestern getan?',
    fields: [
      { id: 'exercised', type: 'toggle', label: 'Sport gemacht', when: 'yesterday' },
      {
        id: 'exerciseType',
        type: 'select',
        label: 'Typ',
        when: 'yesterday',
        options: [
          { value: 'kraft', label: 'Kraft' },
          { value: 'ausdauer', label: 'Ausdauer' },
          { value: 'beides', label: 'beides' },
        ],
        showIf: (v) => v.exercised === true,
      },
      {
        id: 'exerciseDuration',
        type: 'counter',
        label: 'Dauer',
        when: 'yesterday',
        min: 0,
        max: 360,
        step: 5,
        unit: 'Min.',
        metric: true,
        showIf: (v) => v.exercised === true,
      },
      {
        id: 'restingHR',
        type: 'number',
        label: 'Ruhepuls',
        unit: 'bpm',
        optional: true,
        metric: true,
      },
      {
        id: 'vo2max',
        type: 'number',
        label: 'VO₂max',
        unit: '',
        optional: true,
        metric: true,
      },
    ],
  },

  {
    id: 'mood',
    title: 'Stimmung & Stress',
    emoji: '🌤️',
    intro: 'Wie fühlst du dich gerade?',
    fields: [
      {
        id: 'mood',
        type: 'scale',
        label: 'Stimmung',
        when: 'today',
        max: 5,
        endLabels: ['tief', 'hoch'],
        metric: true,
      },
      {
        id: 'stress',
        type: 'scale',
        label: 'Stress',
        when: 'today',
        max: 5,
        endLabels: ['ruhig', 'angespannt'],
        metric: true,
      },
      {
        id: 'moodNote',
        type: 'text',
        label: 'Kurznotiz',
        optional: true,
        placeholder: 'Ein Wort, ein Gedanke …',
      },
    ],
  },

  {
    id: 'note',
    title: 'Tagesnotiz',
    emoji: '✍️',
    intro: 'Was sonst noch war.',
    fields: [
      {
        id: 'dailyNote',
        type: 'textarea',
        label: 'Notiz',
        optional: true,
        placeholder: 'Frei von der Leber weg …',
      },
    ],
  },
]

// Schlafdauer aus Bett- und Aufwachzeit (über Mitternacht hinweg).
export function durationHours(bedtime, waketime) {
  if (!bedtime || !waketime) return null
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = waketime.split(':').map(Number)
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

// Flache Liste aller Felder über alle Bereiche – praktisch für Export & Trends.
export const ALL_FIELDS = SCHEMA.flatMap((area) =>
  area.fields.map((f) => ({ ...f, areaId: area.id, areaTitle: area.title }))
)

export const METRIC_FIELDS = ALL_FIELDS.filter((f) => f.metric)

export function getField(id) {
  return ALL_FIELDS.find((f) => f.id === id)
}
