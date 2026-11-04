-- Tool Inventar · Reihenfolge per Drag & Drop (Sammlungen, Gegenstände) und Tags statt einer Kategorie (2026-11-04)
ALTER TABLE sammlungen ADD COLUMN pos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sammlungen ADD COLUMN tags TEXT;            -- Tag-Vorschläge der Sammlung (JSON-Liste); NULL = aus Vorlage + Gegenständen
ALTER TABLE gegenstaende ADD COLUMN pos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gegenstaende ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
UPDATE gegenstaende SET tags = json_array(kategorie) WHERE kategorie != '';
UPDATE gegenstaende SET pos = nr;
UPDATE sammlungen SET pos = (SELECT COUNT(*) FROM sammlungen s2 WHERE s2.konto_id = sammlungen.konto_id AND s2.erstellt < sammlungen.erstellt);
