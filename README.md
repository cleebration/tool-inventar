# Tool Inventar

Alles, was man besitzt: mit Foto, Ort und QR-Code wiederfinden, zeigen und bewerten.
Konto-Tool im cleebration store (Kachel-Art „Konto-Tool“, Tool-Grundsätze 1–12). Adresse: **https://inventar.cleebration.com** (noch nicht live).

Konzept, Preise und Stand: Google Drive `1! claude/05 Projekte/Tool Inventar` (Konzept Tool Inventar.md, Preise.md, Projekt-Log.md).

## Was es kann (Phase 1)
- **Sammlungen** mit Vorlage: Wertsachen · Werkzeug · Instrumente · Kisten & Lager · frei. Felder je Sammlung ein-/ausblenden, umbenennen, Typ wählen, eigene dazu, per Griff ⋮⋮ sortieren.
- **Gegenstände** mit laufender Nummer (`INV-0001`, Kürzel je Sammlung), Kategorie, Ort, Menge, Status (vorhanden/verliehen/verkauft/weg), Feldern, Notizen; speichert automatisch.
- **Fotos** direkt mit der Handykamera oder aus der Galerie; der Browser verkleinert auf 2000 px und entfernt dabei EXIF/GPS. Erstes Foto = Titelbild.
- **Orte** als Baum (Haus → Raum → Regal → Box); QR-Code je Ort und je Gegenstand (`<cleebration-qr>`). Ort löschen: Inhalt rückt eine Ebene hoch.
- **Suche, Filter** (Kategorie, Ort inkl. Unter-Orte, Status), Kacheln/Liste, Gesamt-Schätzwert.
- **Import** CSV/Excel mit Spalten-Zuordnung (Orts-Pfad „Haus / Keller / Regal 2“ legt Orte an, unbekannte Spalten → neue Felder); **Export** CSV (Semikolon + BOM, öffnet in Excel direkt).
- **Teilen**: privat · mit Link (Token, `noindex`) · öffentlich – Seite `/o/<adresse>`. Öffentlich nie: Felder ohne 👁, Notizen, Orte tiefer als 2 Ebenen, verkaufte/weg. Besucher können melden (→ Meldungen-Inbox im Store).

## Aufbau
| Teil | Datei |
|---|---|
| Worker (API, Anmeldung über Kit, öffentliche Seite, Fotos) | `src/worker.js`, `src/seite.js`, `src/vorlagen.js` |
| Kit (nie hier ändern – Quelle `store/public/kit/`) | `src/cleebration-kit.js` (KIT_VERSION 1) |
| App (eine Seite, Routen im Hash) | `public/index.html`, `public/app.js`, `public/app.css` |
| D1 `inventar` | `migrations/0001_kit_sitzungen.sql`, `migrations/0002_inventar.sql` |
| R2 `inventar-fotos-eu` (Westeuropa) | Fotos unter `f/<sammlung>/<gegenstand>/<datei>.jpg` |
| Cron 03:17 UTC | `kit.aufraeumen` – Sitzungen + gelöschte Konten (samt Fotos) |

Grenzen kommen aus dem Store (`/admin/sets` → Inventar): `sammlungen_frei`, `gegenstaende_frei`, `fotos_frei`, `fotos_plus`; Set `plus` hebt sie auf. Rückfall im Code: 3 / 250 / 5 / 20. Admins (Rolle ab `admin`) ohne Grenzen.

API (nur angemeldet, schreibend nur mit passender Herkunft):
`GET /api/start` · `POST /api/sammlungen` · `GET|PATCH|DELETE /api/sammlungen/:id` · `POST /api/sammlungen/:id/orte` · `PATCH|DELETE …/orte/:id` · `POST …/gegenstaende` · `PATCH|DELETE …/gegenstaende/:id` · `POST|PUT …/gegenstaende/:id/fotos` · `DELETE …/fotos/:datei` · `POST …/import` · `GET …/export.csv` · öffentlich: `GET /o/:slug[?t=]`, `GET /f/…`, `POST /api/melden`.

## Testen (lokal, ohne Cloudflare-Konto)
```
npm i
npm test        # Syntax + wrangler dev mit lokaler D1/R2 + nachgebauter Store (scripts/fake-store.mjs), 15 Prüfungen mit beiden Konten chris/chrisnate
```

## Live schalten (Freigabe Chris)
1. ~~D1 `inventar` und R2 `inventar-fotos` anlegen, `database_id` eintragen, Migrationen~~ – erledigt 2026-11-04 (D1 `417c04fe-…`, Westeuropa; R2 `inventar-fotos-eu`, Westeuropa; `d1_migrations` kennt 0001+0002). Der leere Bucket `inventar-fotos` (Nordamerika) wird nicht genutzt.
2. Store `/admin`: Produkt + Tool `inventar` (Art Konto-Tool), Tool-Schlüssel → Secret `STORE_SCHLUESSEL` im Worker; Sets Basis (gratis) und Plus (19 €/Jahr, Schalter „bezahlt“ ab Verkaufsstart); Werte wie oben.
3. Cloudflare Workers Builds mit diesem Repo verbinden (Push auf `main` deployt), Custom Domain `inventar.cleebration.com`.
4. Kachel-Check, mit beiden Konten prüfen, Kachel sichtbar schalten.
