// Vorlagen = Kontext-Apps des Inventar-Kerns (Tool-Grundsatz 3).
// Jedes Feld: id, de, en, typ (text | lang | zahl | datum | janein), oeffentlich (Standard in öffentlicher Ansicht).
// Geld, Belege, Seriennummern und Daten bleiben öffentlich standardmäßig aus (Konzept, Abschnitt 4).

const F = (id, de, en, typ = "text", oeffentlich = true) => ({ id, de, en, typ, oeffentlich });

export const VORLAGEN = {
  frei: {
    de: "Sammlung", en: "Collection", icon: "📦", praefix: "INV",
    beschreibung: { de: "Nur Name, Fotos, Ort – eigene Felder nach Bedarf", en: "Name, photos, place – add your own fields" },
    kategorien: [],
    felder: [],
  },
  wertsachen: {
    de: "Wertsachen", en: "Valuables", icon: "🖼️", praefix: "INV",
    beschreibung: { de: "Bilder, Ikonen, Skulpturen, Schmuck – mit Schätzwert", en: "Art, icons, sculptures, jewellery – with estimates" },
    kategorien: ["Bild", "Ikone", "Skulptur", "Schmuck", "Möbel", "Uhr", "Sonstiges"],
    felder: [
      F("hersteller", "Künstler/Hersteller", "Artist/Maker"),
      F("datierung", "Datierung/Epoche", "Date/Period"),
      F("material", "Material/Maße", "Material/Size"),
      F("zustand", "Zustand", "Condition"),
      F("herkunft", "Herkunft", "Provenance", "lang", false),
      F("kaufpreis", "Kaufpreis (€)", "Purchase price (€)", "zahl", false),
      F("kaufdatum", "Kaufdatum", "Purchase date", "datum", false),
      F("wert_von", "Schätzwert von (€)", "Estimate from (€)", "zahl", false),
      F("wert_bis", "Schätzwert bis (€)", "Estimate to (€)", "zahl", false),
      F("wert_quelle", "Quelle der Schätzung", "Source of estimate", "lang", false),
      F("gutachten", "Gutachten empfohlen", "Appraisal recommended", "janein", false),
      F("versicherung", "versicherungsrelevant", "Relevant for insurance", "janein", false),
    ],
  },
  werkzeug: {
    de: "Werkzeug", en: "Tools", icon: "🛠️", praefix: "WZ",
    beschreibung: { de: "Geräte, Akkus, Garantie, verliehen an …", en: "Devices, batteries, warranty, lent to …" },
    kategorien: ["Bohren & Schrauben", "Sägen", "Schleifen", "Garten", "Messen", "Akku & Ladegerät", "Handwerkzeug", "Sonstiges"],
    felder: [
      F("marke", "Marke", "Brand"),
      F("modell", "Modell", "Model"),
      F("akku", "Akku-System", "Battery system"),
      F("seriennummer", "Seriennummer", "Serial number", "text", false),
      F("kaufpreis", "Kaufpreis (€)", "Purchase price (€)", "zahl", false),
      F("kaufdatum", "Kaufdatum", "Purchase date", "datum", false),
      F("garantie", "Garantie bis", "Warranty until", "datum", false),
      F("verliehen", "verliehen an", "Lent to", "text", false),
    ],
  },
  instrumente: {
    de: "Instrumente", en: "Instruments", icon: "🎹", praefix: "INS",
    beschreibung: { de: "Instrumente, Synths, Effekte, Studio", en: "Instruments, synths, effects, studio" },
    kategorien: ["Tasteninstrumente", "Saiteninstrumente", "Blasinstrumente", "Percussion", "Synthesizer", "Drumcomputer & Grooveboxen", "Controller & Keyboards", "Verstärker & Effekte", "Studio"],
    felder: [
      F("hersteller", "Hersteller", "Maker"),
      F("modell", "Modell", "Model"),
      F("anschluesse", "Anschlüsse", "Connections", "lang"),
      F("bildquelle", "Bildquelle", "Image credit"),
      F("kaufpreis", "Kaufpreis (€)", "Purchase price (€)", "zahl", false),
      F("seriennummer", "Seriennummer", "Serial number", "text", false),
    ],
  },
  kisten: {
    de: "Kisten & Lager", en: "Boxes & Storage", icon: "🗃️", praefix: "BOX",
    beschreibung: { de: "Was ist in welcher Box? QR auf die Kiste, scannen, finden", en: "What's in which box? QR on the box, scan, find" },
    kategorien: ["Werkzeug", "Elektronik", "Kabel", "Deko", "Saisonal", "Unterlagen", "Sonstiges"],
    felder: [
      F("boxnr", "Box-Nr.", "Box no."),
      F("inhalt", "Inhalt", "Contents", "lang"),
    ],
  },
};

export const TYPEN = ["text", "lang", "zahl", "datum", "janein"];
export const STATUS = ["vorhanden", "verliehen", "verkauft", "weg"];

// Felder einer neuen Sammlung aus der Vorlage (Kopie, damit Nutzer sie ändern können)
export function felderAus(vorlage) {
  const v = VORLAGEN[vorlage] || VORLAGEN.frei;
  return v.felder.map(f => ({ ...f, aus: false, eigen: false }));
}

// Felder prüfen, die vom Browser kommen
export function felderPruefen(liste) {
  if (!Array.isArray(liste)) return null;
  const ids = new Set();
  const out = [];
  for (const f of liste.slice(0, 60)) {
    const id = String(f.id || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
    if (!id || ids.has(id)) continue;
    ids.add(id);
    out.push({
      id,
      de: String(f.de || f.en || id).slice(0, 60),
      en: String(f.en || f.de || id).slice(0, 60),
      typ: TYPEN.includes(f.typ) ? f.typ : "text",
      oeffentlich: !!f.oeffentlich,
      aus: !!f.aus,
      eigen: !!f.eigen,
    });
  }
  return out;
}
