-- Tool Inventar · Sammlungen, Orte, Gegenstände (Fotos in R2 „inventar-fotos-eu“)
CREATE TABLE IF NOT EXISTS sammlungen (
  id          TEXT PRIMARY KEY,
  konto_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  vorlage     TEXT NOT NULL DEFAULT 'frei',
  felder      TEXT NOT NULL DEFAULT '[]',   -- [{id,de,en,typ,oeffentlich,aus,eigen}]
  sicht       TEXT NOT NULL DEFAULT 'privat', -- privat | link | oeffentlich
  slug        TEXT NOT NULL UNIQUE,
  link_token  TEXT NOT NULL,
  praefix     TEXT NOT NULL DEFAULT 'INV',
  naechste_nr INTEGER NOT NULL DEFAULT 1,
  erstellt    INTEGER NOT NULL,
  geaendert   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sammlungen_konto ON sammlungen(konto_id);

CREATE TABLE IF NOT EXISTS orte (
  id          TEXT PRIMARY KEY,
  sammlung_id TEXT NOT NULL,
  eltern_id   TEXT,
  name        TEXT NOT NULL,
  pos         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS orte_sammlung ON orte(sammlung_id);

CREATE TABLE IF NOT EXISTS gegenstaende (
  id          TEXT PRIMARY KEY,
  sammlung_id TEXT NOT NULL,
  nr          INTEGER NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  kategorie   TEXT NOT NULL DEFAULT '',
  ort_id      TEXT,
  menge       REAL NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'vorhanden', -- vorhanden | verliehen | verkauft | weg
  werte       TEXT NOT NULL DEFAULT '{}',
  notizen     TEXT NOT NULL DEFAULT '',
  fotos       TEXT NOT NULL DEFAULT '[]',        -- ["<datei>.jpg", …] in R2 unter f/<sammlung>/<gegenstand>/
  erstellt    INTEGER NOT NULL,
  geaendert   INTEGER NOT NULL,
  UNIQUE (sammlung_id, nr)
);
CREATE INDEX IF NOT EXISTS gegenstaende_sammlung ON gegenstaende(sammlung_id, nr);
