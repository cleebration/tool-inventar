-- cleebration-kit · Tabellen für Tools mit D1 (einmal je Tool als Migration einspielen)
CREATE TABLE IF NOT EXISTS kit_sitzungen (
  id_hash   TEXT PRIMARY KEY,
  konto_id  TEXT NOT NULL,
  email     TEXT NOT NULL,
  name      TEXT,
  frei      TEXT NOT NULL DEFAULT '{}',
  werte     TEXT NOT NULL DEFAULT '{}',
  rollen    TEXT NOT NULL DEFAULT '[]',
  teams     TEXT NOT NULL DEFAULT '[]',
  erstellt  INTEGER NOT NULL,
  ablauf    INTEGER NOT NULL,
  geprueft  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kit_sitzungen_konto ON kit_sitzungen(konto_id);
CREATE INDEX IF NOT EXISTS kit_sitzungen_ablauf ON kit_sitzungen(ablauf);
CREATE TABLE IF NOT EXISTS kit_merker (schluessel TEXT PRIMARY KEY, wert TEXT);
