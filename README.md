# Gaming-Bingo · consolecheat-ex18

Zufällige 5×5-Bingo-Karten mit Gaming-Klischees zum Abhaken – beim Spielen, im Stream oder auf der Couch. Teil der consolecheat-Werkzeuge. Inoffiziell, nicht von Sony.

**Live:** https://robfreak.github.io/consolecheat-ex18/ (nachdem GitHub Pages eingeschaltet ist, siehe unten)

## Funktionen

- **Karten:** 24 zufällige Begriffe plus freies Mittelfeld. Eingebaute Liste „Gaming-Klischees“ mit 48 Begriffen auf Deutsch und Englisch. Die Listen laufen parallel, derselbe Seed zeigt in beiden Sprachen dieselben Klischees.
- **Bingo:** Reihen, Spalten und beide Diagonalen (12 Linien). Die volle Linie wird hervorgehoben, `aria-live` sagt „Bingo!“ an, dazu Canvas-Konfetti ohne Bibliothek. Mit `prefers-reduced-motion` bleibt das Konfetti still stehen.
- **Eigene Listen:** anlegen, bearbeiten (ein Begriff pro Zeile), löschen, verwenden. Mindestens 24 verschiedene, nicht leere Begriffe, höchstens 200, je höchstens 60 Zeichen. Doppelte (ohne Groß-/Kleinschreibung) und leere Zeilen fallen weg. Höchstens 20 Listen.
- **Teilen ohne Server:** Die Karte ergibt sich deterministisch aus Seed + Liste. „Link kopieren“ baut
  - `#seed=<base36>&list=klischees` für die eingebaute Liste,
  - `#seed=<base36>&terms=<base64url>&name=<Name>` für eigene Listen. Ist `terms` größer als 1800 Zeichen, gibt es eine klare Meldung statt eines Links.
  Abgehakte Felder stehen nicht im Link. „Neue Karte“ würfelt einen neuen Seed.
- **PNG-Export:** 1000 × 1200 px aus einem Canvas, mit Titel, Liste, Seed, Markierungen und Siegerlinie, in den selbst gehosteten Schriften Outfit und Source Sans 3.
- DE/EN (Standard Deutsch), hell/dunkel, ab 390 px Breite, Tastatur und Screenreader.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| Pfeiltasten / Steuerkreuz | Cursor auf der Karte bewegen (Roving Tabindex) |
| Pos1 / Ende | Anfang / Ende der Reihe |
| Leertaste / Enter / × | Feld abhaken |
| △ | Neue Karte |
| Options | PNG speichern |

Der erste Abruf eines Controllers (auch nach dem Wiederverbinden) merkt sich nur den Tastenzustand und löst nichts aus. Solange ein Textfeld den Fokus hat, greifen Controller-Eingaben nicht.

## Speicher

Eigene Listen, die aktuelle Karte (Seed, Liste, Markierungen) und die Zahl der Bingos liegen im `localStorage` unter `consolecheat-bingo-v1` (mit Schema und Version). Unlesbare Daten fallen auf leere Daten zurück. Der Knopf auf der Datenschutz-Seite löscht nur diesen Schlüssel. Sprache und Erscheinungsbild teilen sich alle Werkzeuge über `consolecheat-lang` und `consolecheat-theme`.

## Entwicklung

Node 22.6 oder neuer.

```sh
npm ci
npm test        # node --test über src/bingo/*.test.ts
npm run build   # tsc, vite build, scripts/check-dist.mjs
npm run dev
```

Der Code liegt in `src/bingo`. Die Seite lädt nichts von Dritten; `scripts/check-dist.mjs` prüft das im Build.

## GitHub Pages einschalten

Der Workflow `.github/workflows/pages.yml` baut bei jedem Push auf `main` und legt `dist/` in den Branch `gh-pages`. Einmalig in den Repository-Einstellungen: **Settings → Pages → Source: Deploy from a branch → Branch `gh-pages` / `(root)`**. Danach ist die Seite unter https://robfreak.github.io/consolecheat-ex18/ erreichbar.

## Lizenz der Schriften

Outfit und Source Sans 3 stehen unter der SIL Open Font License, siehe `public/FONT-OFL.txt` und `THIRD_PARTY_NOTICES.md`.
