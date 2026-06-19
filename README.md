# Tagwerk

Ein persönliches Gesundheits-Tagebuch. **Privat, lokal, offline – nur für dich.**

Ein ruhiges Morgenritual: App öffnen, in unter einer Minute die wichtigsten
Werte eintragen, Verläufe sehen. Keine Diagnosen, keine Wertung – nur deine
eigenen Zahlen, klar visualisiert.

## Prinzipien

- **Privat & lokal** – Alle Daten liegen in IndexedDB auf dem Gerät. Kein Login,
  kein Account, keine Cloud, keine externen Requests, keine Analytics.
- **Mobile-first PWA** – Auf dem iPhone-Homescreen installierbar, voll offline
  nutzbar (Service Worker, alles vorab gecacht).
- **Schnell** – Öffnet direkt auf dem heutigen Check-in. Tap-Skalen, Toggles und
  +/- statt Tippen; automatisches Speichern, kein Speichern-Button.
- **Deine Daten gehören dir** – Export als CSV und JSON, optional **passwortverschlüsselt**
  (AES-GCM + PBKDF2 via Web Crypto, komplett lokal), Import aus JSON oder verschlüsselter Datei.

## Check-in: eine Frage pro Screen

Der Morgen-Check-in führt **eine Frage pro Screen** durch alle Bereiche – große
Typografie, viel Weißraum. Skala/Auswahl/Toggle blenden nach dem Tippen sanft
zur nächsten Frage (Auto-Advance mit Cross-Fade); Zähler, Mehrfachauswahl und
Freitext gehen per **„Weiter"**. Zurück-Navigation, Überspringen und ein
dezenter Fortschrittsbalken sind dabei; `prefers-reduced-motion` wird respektiert
(dann sofortiger statt animierter Wechsel).

## Bereiche

Schlaf · Substanzen · **Nicht rauchen** (Zigaretten, Verlangen 0–10, Auslöser,
Zuversicht – mit Streak & gespartem Geld) · Sexuelle Gesundheit (Kernmodul,
EHS & Empfindlichkeit) · Bewegung · Stimmung & Stress · Tagesnotiz.

Felder sind als **heute** (z.B. Morgenerektion) oder **gestern** (z.B. Sex,
Substanzen) gekennzeichnet – passend zum morgendlichen Rückblick.

## Auswertungen

- **EHS-3-Linien-Chart**: morgens vs. allein vs. Partnersex über Zeit.
- **Empfindlichkeits-Trend**.
- **Streaks**: Kein-Porno-Tage, rauchfreie Tage.
- **Konfounder** (viel Alkohol, Cannabis) im EHS-Chart markiert.
- **Wochenrückblick** mit Durchschnitten und Zählungen.

Umschaltbar Woche/Monat. Rein deskriptiv – keine medizinische Interpretation.

## Datenmodell

Das gesamte UI rendert sich aus `src/schema.js`. Neue Bereiche oder Felder dort
ergänzen – Eingabe-UI, Persistenz und Exporte ziehen automatisch nach. Ein
Eintrag pro Tag, adressiert über das ISO-Datum (`YYYY-MM-DD`).

## Tech

React + Vite · Dexie (IndexedDB) · Recharts · vite-plugin-pwa.
Reines Frontend, kein Server.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Produktions-Build (dist/) inkl. Service Worker
npm run preview    # Build lokal testen

node scripts/gen-icons.mjs   # App-Icons neu erzeugen
```

### Auf dem iPhone installieren

`dist/` auf einem (statischen) HTTPS-Host bereitstellen, in Safari öffnen, dann
**Teilen → Zum Home-Bildschirm**. Danach läuft die App offline wie eine native
App. Für rein privaten Gebrauch genügt jeder statische Host – es werden keine
Server-Funktionen benötigt.
