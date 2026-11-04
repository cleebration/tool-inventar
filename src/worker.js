// Tool Inventar · inventar.cleebration.com
// Konto-Tool im cleebration store (Tool-Grundsätze 6–12): Kit für Anmeldung, Sets, Meine Sachen, Ereignisse, Moderation.
// D1 „inventar“ (Sammlungen, Orte, Gegenstände), R2 „inventar-fotos-eu“ (Fotos, im Browser verkleinert, ohne EXIF).

import { kit, json, esc, jetzt, zufall, sprache, nurIntern } from "./cleebration-kit.js";
import { VORLAGEN, STATUS, felderAus, felderPruefen } from "./vorlagen.js";
import { oeffentlicheSeite } from "./seite.js";

const TOOL = "inventar";
// Rückfallwerte, solange der Store schweigt (Preise.md: Basis 3 Sammlungen / 250 Gegenstände / 5 Fotos, Plus 20 Fotos)
const RUECKFALL = { sammlungen_frei: 3, gegenstaende_frei: 250, fotos_frei: 5, fotos_plus: 20 };
const MAX_FOTO = 2_500_000; // Bytes nach Verkleinerung im Browser (lange Seite 2000 px)
const MAX_IMPORT = 500;     // Zeilen je Aufruf

const id = () => zufall(12);
const slugAus = t => String(t || "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sammlung";
const text = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
const zahl = v => (v === "" || v == null || isNaN(+v) ? null : +v);
const fehler = (status, f) => json(status, { fehler: f });

export default {
  async fetch(request, env, ctx) {
    const k = kit({ tool: TOOL, env });
    try {
      const fertig = await k.route(request);
      if (fertig) return fertig;
      return await weiter(request, env, ctx, k);
    } catch (e) {
      console.error("inventar", e && e.stack || e);
      return fehler(500, "Interner Fehler");
    }
  },

  // Nachts: abgelaufene Sitzungen, gelöschte Konten → alle Sammlungen + Fotos dieses Kontos weg
  async scheduled(event, env, ctx) {
    const k = kit({ tool: TOOL, env });
    ctx.waitUntil(k.aufraeumen(async kontoId => {
      const { results } = await env.DB.prepare("SELECT id FROM sammlungen WHERE konto_id = ?1").bind(kontoId).all();
      for (const s of results || []) await sammlungLoeschen(env, s.id);
    }));
  },
};

async function weiter(request, env, ctx, k) {
  const url = new URL(request.url);
  const p = url.pathname;
  const lang = sprache(request);

  // Öffentliche Ansicht einer Sammlung: /o/<slug> (öffentlich) oder /o/<slug>?t=<token> (per Link)
  let m = p.match(/^\/o\/([a-z0-9-]{1,48})\/?$/);
  if (m && request.method === "GET") return oeffentlich(request, env, k, m[1], url, lang);

  // Fotos: /f/<sammlung>/<gegenstand>/<datei>.jpg
  m = p.match(/^\/f\/([A-Za-z0-9_-]{1,24})\/([A-Za-z0-9_-]{1,24})\/([A-Za-z0-9_-]{1,24}\.jpg)$/);
  if (m && request.method === "GET") return foto(request, env, k, m[1], m[2], m[3], url);

  // Sprache umschalten (Leiste → Zahnrad → Sprache): Cookie wie der Store, zurück auf dieselbe Seite
  if (p === "/sprache" && request.method === "GET") {
    const l = url.searchParams.get("l") === "en" ? "en" : "de";
    const h = new Headers({ Location: url.origin + nurIntern(url.searchParams.get("zurueck") || "/"), "Cache-Control": "no-store" });
    h.append("Set-Cookie", `cleeb_lang=${l}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`);
    return new Response(null, { status: 302, headers: h });
  }

  // Besucher melden einen Inhalt (zentral in der Meldungen-Inbox des Stores)
  if (p === "/api/melden" && request.method === "POST") {
    if (!k.herkunftOk(request)) return fehler(403, "Herkunft");
    const b = await request.json().catch(() => ({}));
    const s = await env.DB.prepare("SELECT id, slug, sicht FROM sammlungen WHERE slug = ?1").bind(text(b.slug, 48)).first();
    if (!s || s.sicht === "privat") return fehler(404, "Nicht gefunden");
    await k.melden({ schluessel: s.id, url: url.origin + "/o/" + s.slug, grund: text(b.grund, 40) || "sonstiges", text: text(b.text, 1000) });
    await k.ereignis(null, "gemeldet");
    return json(200, { ok: true });
  }

  // Ab hier: nur angemeldet + Name (Grundsatz 6)
  const se = await k.sitzung(request);
  if (p.startsWith("/api/")) {
    if (!se) return fehler(401, "Nicht angemeldet");
    if (!k.herkunftOk(request)) return fehler(403, "Herkunft");
    return api(request, env, ctx, k, se, url, lang);
  }
  if (!se) return k.zurAnmeldung(request);
  if (!se.name) return k.zurNamenswahl(request);

  // App-Hülle (eine Seite, Routen im Hash) – Sprache und Name serverseitig eintragen
  if (p === "/" || p === "/index.html") {
    const roh = await env.ASSETS.fetch(new Request(url.origin + "/index.html"));
    const neu = new HTMLRewriter()
      .on("html", { element: el => el.setAttribute("lang", lang) })
      .on("cleebration-leiste", { element: el => { el.setAttribute("name", se.name); el.setAttribute("lang", lang); el.setAttribute("sprache", "/sprache?l=" + (lang === "en" ? "de" : "en") + "&zurueck=%2F"); } })
      .on("cleebration-fuss", { element: el => el.setAttribute("eigen", lang === "en" ? "Create your own inventory for free" : "Eigenes Inventar gratis erstellen") })
      .transform(roh);
    return k.sicher(neu, { html: true });
  }
  const a = await env.ASSETS.fetch(request);
  return k.sicher(a);
}

/* ---------------- API ---------------- */

async function api(request, env, ctx, k, se, url, lang) {
  const p = url.pathname, M = request.method, db = env.DB;
  const werte = await k.werte(RUECKFALL);
  const plus = k.darf(se, "plus");
  const admin = k.hatRolle(se, "admin");
  const grenzen = {
    sammlungen: plus || admin ? null : +werte.sammlungen_frei || RUECKFALL.sammlungen_frei,
    gegenstaende: plus || admin ? null : +werte.gegenstaende_frei || RUECKFALL.gegenstaende_frei,
    fotos: plus || admin ? +werte.fotos_plus || RUECKFALL.fotos_plus : +werte.fotos_frei || RUECKFALL.fotos_frei,
    plus,
  };

  if (p === "/api/start" && M === "GET") {
    let { results } = await db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM gegenstaende g WHERE g.sammlung_id = s.id) AS anzahl
      FROM sammlungen s WHERE konto_id = ?1 ORDER BY pos, erstellt`).bind(se.konto_id).all();
    results = results || [];
    // Grundsatz 6: wer noch nichts hat, bekommt sofort etwas zum Bearbeiten
    if (!results.length) {
      const s = await sammlungAnlegen(env, k, se, url, { name: lang === "en" ? "My inventory" : "Mein Inventar", vorlage: "frei" });
      results = [{ ...s, anzahl: 0 }];
    }
    return json(200, { name: se.name, grenzen, vorlagen: VORLAGEN, status: STATUS, sammlungen: results.map(sammlungAus) });
  }

  // Reihenfolge der Sammlungen (Drag & Drop in der Übersicht)
  if (p === "/api/sammlungen/reihenfolge" && M === "PUT") {
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 500) : [];
    const { results } = await db.prepare("SELECT id FROM sammlungen WHERE konto_id = ?1").bind(se.konto_id).all();
    const eigene = new Set((results || []).map(r => r.id));
    const st = ids.filter(x => eigene.has(x)).map((x, i) => db.prepare("UPDATE sammlungen SET pos = ?2 WHERE id = ?1").bind(x, i));
    if (st.length) await db.batch(st);
    return json(200, { ok: true });
  }

  if (p === "/api/sammlungen" && M === "POST") {
    const n = await db.prepare("SELECT COUNT(*) AS n FROM sammlungen WHERE konto_id = ?1").bind(se.konto_id).first();
    if (grenzen.sammlungen != null && n.n >= grenzen.sammlungen) return json(402, { fehler: "grenze", grenze: "sammlungen", wert: grenzen.sammlungen });
    const b = await request.json().catch(() => ({}));
    const s = await sammlungAnlegen(env, k, se, url, { name: text(b.name, 80), vorlage: b.vorlage });
    return json(201, sammlungAus({ ...s, anzahl: 0 }));
  }

  let m = p.match(/^\/api\/sammlungen\/([A-Za-z0-9_-]{1,24})(\/.*)?$/);
  if (m) {
    const s = await eigeneSammlung(db, se, m[1]);
    if (!s) return fehler(404, "Sammlung nicht gefunden");
    const rest = m[2] || "";

    if (rest === "" && M === "GET") {
      const [g, o] = await Promise.all([
        db.prepare("SELECT * FROM gegenstaende WHERE sammlung_id = ?1 ORDER BY pos, nr").bind(s.id).all(),
        db.prepare("SELECT * FROM orte WHERE sammlung_id = ?1 ORDER BY pos, name").bind(s.id).all(),
      ]);
      return json(200, { sammlung: sammlungAus(s, g.results || []), gegenstaende: (g.results || []).map(gegenstandAus), orte: o.results || [], grenzen });
    }

    if (rest === "" && M === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const neu = { ...s };
      if (b.name != null) neu.name = text(b.name, 80) || s.name;
      if (b.sicht && ["privat", "link", "oeffentlich"].includes(b.sicht)) neu.sicht = b.sicht;
      if (b.praefix != null) neu.praefix = String(b.praefix).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || s.praefix;
      if (b.felder) { const f = felderPruefen(b.felder); if (f) neu.felder = JSON.stringify(f); }
      if (b.vorlage && VORLAGEN[b.vorlage] && b.vorlage !== s.vorlage) {
        // Vorlage wechseln: fehlende Felder der neuen Vorlage dazu, eigene Felder bleiben
        const alt = JSON.parse(neu.felder || "[]"), da = new Set(alt.map(f => f.id));
        neu.felder = JSON.stringify([...alt, ...felderAus(b.vorlage).filter(f => !da.has(f.id))]);
        neu.vorlage = b.vorlage;
      }
      if (b.slug != null) {
        const sl = slugAus(b.slug);
        const belegt = await db.prepare("SELECT id FROM sammlungen WHERE slug = ?1 AND id != ?2").bind(sl, s.id).first();
        if (belegt) return json(409, { fehler: "slug" });
        neu.slug = sl;
      }
      if (b.neuerLink) neu.link_token = zufall(18);
      if (Array.isArray(b.tags)) neu.tags = JSON.stringify(tagsPruefen(b.tags));
      if (b.tagWeg != null || b.tagUm) {
        // Tag aus der Sammlung entfernen bzw. umbenennen – auch bei allen Gegenständen
        const alt = text(b.tagWeg != null ? b.tagWeg : b.tagUm.von, 40), zu = b.tagUm ? text(b.tagUm.zu, 40).trim() : "";
        const liste = tagsDerSammlung(neu, await alleTags(db, s.id));
        neu.tags = JSON.stringify(tagsPruefen(liste.flatMap(t => (t === alt ? (zu ? [zu] : []) : [t]))));
        const { results } = await db.prepare("SELECT id, tags FROM gegenstaende WHERE sammlung_id = ?1").bind(s.id).all();
        const st = [];
        for (const r of results || []) {
          const tg = JSON.parse(r.tags || "[]");
          if (!tg.includes(alt)) continue;
          const nt = tagsPruefen(tg.flatMap(t => (t === alt ? (zu ? [zu] : []) : [t])));
          st.push(db.prepare("UPDATE gegenstaende SET tags = ?2, kategorie = ?3 WHERE id = ?1").bind(r.id, JSON.stringify(nt), nt[0] || ""));
        }
        if (st.length) await db.batch(st);
      }
      await db.prepare("UPDATE sammlungen SET name=?2, sicht=?3, praefix=?4, felder=?5, vorlage=?6, slug=?7, link_token=?8, tags=?10, geaendert=?9 WHERE id=?1")
        .bind(s.id, neu.name, neu.sicht, neu.praefix, neu.felder, neu.vorlage, neu.slug, neu.link_token, jetzt(), neu.tags ?? null).run();
      if (neu.sicht !== s.sicht && neu.sicht !== "privat") await k.ereignis(se, "geteilt");
      ctx.waitUntil(meineSachen(k, se, url, neu));
      return json(200, sammlungAus(neu, null, await alleTags(db, s.id)));
    }

    if (rest === "" && M === "DELETE") {
      await sammlungLoeschen(env, s.id);
      ctx.waitUntil(k.inhaltWeg(se, s.id));
      return json(200, { ok: true });
    }

    // Reihenfolge der Gegenstände (Kacheln per Drag & Drop)
    if (rest === "/reihenfolge" && M === "PUT") {
      const b = await request.json().catch(() => ({}));
      const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 5000) : [];
      const { results } = await db.prepare("SELECT id FROM gegenstaende WHERE sammlung_id = ?1").bind(s.id).all();
      const da = new Set((results || []).map(r => r.id));
      const st = ids.filter(x => da.has(x)).map((x, i) => db.prepare("UPDATE gegenstaende SET pos = ?2 WHERE id = ?1").bind(x, i));
      for (let i = 0; i < st.length; i += 90) await db.batch(st.slice(i, i + 90));
      await beruehrt(db, s.id);
      return json(200, { ok: true });
    }

    // Orte
    if (rest === "/orte" && M === "POST") {
      const b = await request.json().catch(() => ({}));
      const eltern = b.eltern_id ? await db.prepare("SELECT id FROM orte WHERE id = ?1 AND sammlung_id = ?2").bind(b.eltern_id, s.id).first() : null;
      const n = await db.prepare("SELECT COUNT(*) AS n FROM orte WHERE sammlung_id = ?1").bind(s.id).first();
      if (n.n >= 1000) return json(402, { fehler: "grenze", grenze: "orte" });
      const o = { id: id(), sammlung_id: s.id, eltern_id: eltern ? eltern.id : null, name: text(b.name, 80) || "Ort", pos: n.n };
      await db.prepare("INSERT INTO orte (id, sammlung_id, eltern_id, name, pos) VALUES (?1,?2,?3,?4,?5)").bind(o.id, o.sammlung_id, o.eltern_id, o.name, o.pos).run();
      await beruehrt(db, s.id);
      return json(201, o);
    }
    let mo = rest.match(/^\/orte\/([A-Za-z0-9_-]{1,24})$/);
    if (mo) {
      const o = await db.prepare("SELECT * FROM orte WHERE id = ?1 AND sammlung_id = ?2").bind(mo[1], s.id).first();
      if (!o) return fehler(404, "Ort nicht gefunden");
      if (M === "PATCH") {
        const b = await request.json().catch(() => ({}));
        let eltern = o.eltern_id;
        if ("eltern_id" in b) {
          eltern = b.eltern_id || null;
          if (eltern && !(await gueltigerElternteil(db, s.id, o.id, eltern))) return fehler(400, "Ort kann nicht in sich selbst liegen");
        }
        const name = b.name != null ? text(b.name, 80) || o.name : o.name;
        const pos = b.pos != null ? Math.max(0, Math.floor(+b.pos) || 0) : o.pos;
        await db.prepare("UPDATE orte SET name=?2, eltern_id=?3, pos=?4 WHERE id=?1").bind(o.id, name, eltern, pos).run();
        await beruehrt(db, s.id);
        return json(200, { ...o, name, eltern_id: eltern, pos });
      }
      if (M === "DELETE") {
        // Kinder und Gegenstände rücken eine Ebene nach oben – nichts geht verloren
        await db.batch([
          db.prepare("UPDATE orte SET eltern_id = ?2 WHERE eltern_id = ?1 AND sammlung_id = ?3").bind(o.id, o.eltern_id, s.id),
          db.prepare("UPDATE gegenstaende SET ort_id = ?2 WHERE ort_id = ?1 AND sammlung_id = ?3").bind(o.id, o.eltern_id, s.id),
          db.prepare("DELETE FROM orte WHERE id = ?1").bind(o.id),
        ]);
        await beruehrt(db, s.id);
        return json(200, { ok: true });
      }
    }

    // Gegenstände
    if (rest === "/gegenstaende" && M === "POST") {
      const b = await request.json().catch(() => ({}));
      const anz = await kontoGegenstaende(db, se.konto_id);
      if (grenzen.gegenstaende != null && anz >= grenzen.gegenstaende) return json(402, { fehler: "grenze", grenze: "gegenstaende", wert: grenzen.gegenstaende });
      const g = await gegenstandAnlegen(db, s, b);
      await k.ereignis(se, "angelegt");
      ctx.waitUntil(meineSachen(k, se, url, s));
      return json(201, gegenstandAus(g));
    }
    let mg = rest.match(/^\/gegenstaende\/([A-Za-z0-9_-]{1,24})(\/fotos(?:\/([A-Za-z0-9_-]{1,24}\.jpg))?)?$/);
    if (mg) {
      const g = await db.prepare("SELECT * FROM gegenstaende WHERE id = ?1 AND sammlung_id = ?2").bind(mg[1], s.id).first();
      if (!g) return fehler(404, "Gegenstand nicht gefunden");
      if (!mg[2] && M === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const neu = await felderSetzen(db, s, g, b);
        await db.prepare("UPDATE gegenstaende SET name=?2, kategorie=?3, ort_id=?4, menge=?5, status=?6, werte=?7, notizen=?8, geaendert=?9, tags=?10 WHERE id=?1")
          .bind(g.id, neu.name, neu.kategorie, neu.ort_id, neu.menge, neu.status, neu.werte, neu.notizen, jetzt(), neu.tags).run();
        await beruehrt(db, s.id);
        return json(200, gegenstandAus({ ...g, ...neu, geaendert: jetzt() }));
      }
      if (!mg[2] && M === "DELETE") {
        for (const f of JSON.parse(g.fotos || "[]")) await env.FOTOS.delete(`f/${s.id}/${g.id}/${f}`);
        await db.prepare("DELETE FROM gegenstaende WHERE id = ?1").bind(g.id).run();
        await beruehrt(db, s.id);
        return json(200, { ok: true });
      }
      if (mg[2] && !mg[3] && M === "POST") {
        const fotos = JSON.parse(g.fotos || "[]");
        if (fotos.length >= grenzen.fotos) return json(402, { fehler: "grenze", grenze: "fotos", wert: grenzen.fotos });
        const typ = request.headers.get("Content-Type") || "";
        if (!/^image\/jpeg\b/.test(typ)) return fehler(415, "Nur JPEG (wird im Browser umgewandelt)");
        const daten = await request.arrayBuffer();
        if (!daten.byteLength || daten.byteLength > MAX_FOTO) return fehler(413, "Foto zu groß");
        const u8 = new Uint8Array(daten);
        if (u8[0] !== 0xff || u8[1] !== 0xd8) return fehler(415, "Kein JPEG");
        const datei = id() + ".jpg";
        await env.FOTOS.put(`f/${s.id}/${g.id}/${datei}`, daten, { httpMetadata: { contentType: "image/jpeg" } });
        fotos.push(datei);
        await db.prepare("UPDATE gegenstaende SET fotos = ?2, geaendert = ?3 WHERE id = ?1").bind(g.id, JSON.stringify(fotos), jetzt()).run();
        await beruehrt(db, s.id);
        await k.ereignis(se, "foto");
        return json(201, { fotos });
      }
      if (mg[3] && M === "DELETE") {
        const fotos = JSON.parse(g.fotos || "[]").filter(f => f !== mg[3]);
        await env.FOTOS.delete(`f/${s.id}/${g.id}/${mg[3]}`);
        await db.prepare("UPDATE gegenstaende SET fotos = ?2, geaendert = ?3 WHERE id = ?1").bind(g.id, JSON.stringify(fotos), jetzt()).run();
        return json(200, { fotos });
      }
      if (mg[2] && !mg[3] && M === "PUT") { // Reihenfolge der Fotos (erstes = Titelbild)
        const b = await request.json().catch(() => ({}));
        const alt = JSON.parse(g.fotos || "[]");
        const neu = Array.isArray(b.fotos) ? b.fotos.filter(f => alt.includes(f)) : alt;
        const fotos = [...neu, ...alt.filter(f => !neu.includes(f))];
        await db.prepare("UPDATE gegenstaende SET fotos = ?2, geaendert = ?3 WHERE id = ?1").bind(g.id, JSON.stringify(fotos), jetzt()).run();
        return json(200, { fotos });
      }
    }

    // Import: Zeilen, die der Browser aus CSV/XLSX gelesen und Feldern zugeordnet hat
    if (rest === "/import" && M === "POST") {
      const b = await request.json().catch(() => ({}));
      const zeilen = Array.isArray(b.zeilen) ? b.zeilen.slice(0, MAX_IMPORT) : [];
      const anz = await kontoGegenstaende(db, se.konto_id);
      if (grenzen.gegenstaende != null && anz + zeilen.length > grenzen.gegenstaende)
        return json(402, { fehler: "grenze", grenze: "gegenstaende", wert: grenzen.gegenstaende, frei: Math.max(0, grenzen.gegenstaende - anz) });
      // Orte über Pfad „Haus / Keller / Regal 2“ anlegen oder finden
      const { results: ortListe } = await db.prepare("SELECT * FROM orte WHERE sammlung_id = ?1").bind(s.id).all();
      const orte = ortListe || [];
      async function ortPfad(pfad) {
        const teile = String(pfad || "").split(/\s*[\/>›»]\s*/).map(t => t.trim()).filter(Boolean).slice(0, 8);
        let eltern = null;
        for (const t of teile) {
          let o = orte.find(x => x.eltern_id === eltern && x.name.toLowerCase() === t.toLowerCase());
          if (!o) {
            o = { id: id(), sammlung_id: s.id, eltern_id: eltern, name: text(t, 80), pos: orte.length };
            await db.prepare("INSERT INTO orte (id, sammlung_id, eltern_id, name, pos) VALUES (?1,?2,?3,?4,?5)").bind(o.id, s.id, o.eltern_id, o.name, o.pos).run();
            orte.push(o);
          }
          eltern = o.id;
        }
        return eltern;
      }
      let neu = 0;
      for (const z of zeilen) {
        const ort_id = z.ort ? await ortPfad(z.ort) : null;
        await gegenstandAnlegen(db, s, { ...z, ort_id }, true);
        s.naechste_nr++;
        neu++;
      }
      await beruehrt(db, s.id);
      await k.ereignis(se, "importiert", { anzahl: neu });
      ctx.waitUntil(meineSachen(k, se, url, s));
      return json(200, { neu });
    }

    if (rest === "/export.csv" && M === "GET") {
      const [g, o] = await Promise.all([
        db.prepare("SELECT * FROM gegenstaende WHERE sammlung_id = ?1 ORDER BY pos, nr").bind(s.id).all(),
        db.prepare("SELECT * FROM orte WHERE sammlung_id = ?1").bind(s.id).all(),
      ]);
      await k.ereignis(se, "exportiert");
      return new Response("﻿" + csvAus(s, g.results || [], o.results || [], lang, url.origin), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${s.slug}.csv"`, "Cache-Control": "no-store" },
      });
    }
  }

  return fehler(404, "Unbekannt");
}

/* ---------------- Daten ---------------- */

async function sammlungAnlegen(env, k, se, url, { name, vorlage }) {
  const db = env.DB;
  const v = VORLAGEN[vorlage] ? vorlage : "frei";
  let slug = slugAus(name || VORLAGEN[v].de);
  for (let i = 0; i < 5 && await db.prepare("SELECT id FROM sammlungen WHERE slug = ?1").bind(slug).first(); i++)
    slug = slugAus(name || VORLAGEN[v].de).slice(0, 32) + "-" + zufall(4).toLowerCase().replace(/[^a-z0-9]/g, "x");
  const s = {
    id: id(), konto_id: se.konto_id, name: name || VORLAGEN[v].de, vorlage: v,
    felder: JSON.stringify(felderAus(v)), sicht: "privat", slug, link_token: zufall(18),
    praefix: VORLAGEN[v].praefix, naechste_nr: 1, erstellt: jetzt(), geaendert: jetzt(),
  };
  const mx = await db.prepare("SELECT COALESCE(MAX(pos), -1) + 1 AS p FROM sammlungen WHERE konto_id = ?1").bind(se.konto_id).first();
  s.pos = mx ? mx.p : 0;
  await db.prepare(`INSERT INTO sammlungen (id, konto_id, name, vorlage, felder, sicht, slug, link_token, praefix, naechste_nr, erstellt, geaendert, pos)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`)
    .bind(s.id, s.konto_id, s.name, s.vorlage, s.felder, s.sicht, s.slug, s.link_token, s.praefix, s.naechste_nr, s.erstellt, s.geaendert, s.pos).run();
  await meineSachen(k, se, url, s);
  return s;
}

async function sammlungLoeschen(env, sid) {
  const db = env.DB;
  let cursor;
  do { // alle Fotos dieser Sammlung aus R2
    const l = await env.FOTOS.list({ prefix: `f/${sid}/`, cursor });
    if (l.objects.length) await env.FOTOS.delete(l.objects.map(o => o.key));
    cursor = l.truncated ? l.cursor : undefined;
  } while (cursor);
  await db.batch([
    db.prepare("DELETE FROM gegenstaende WHERE sammlung_id = ?1").bind(sid),
    db.prepare("DELETE FROM orte WHERE sammlung_id = ?1").bind(sid),
    db.prepare("DELETE FROM sammlungen WHERE id = ?1").bind(sid),
  ]);
}

async function gegenstandAnlegen(db, s, b, ausImport = false) {
  // Nummer atomar hochzählen (zwei Geräte gleichzeitig dürfen keine doppelte Nr. bekommen)
  const r = await db.prepare("UPDATE sammlungen SET naechste_nr = naechste_nr + 1, geaendert = ?2 WHERE id = ?1 RETURNING naechste_nr - 1 AS nr")
    .bind(s.id, jetzt()).first();
  const nr = r ? r.nr : s.naechste_nr;
  const leer = { name: "", kategorie: "", tags: "[]", ort_id: null, menge: 1, status: "vorhanden", werte: "{}", notizen: "" };
  const werte = await felderSetzen(db, s, leer, b, ausImport);
  const mx = await db.prepare("SELECT COALESCE(MAX(pos), 0) + 1 AS p FROM gegenstaende WHERE sammlung_id = ?1").bind(s.id).first();
  const g = { id: id(), sammlung_id: s.id, nr, ...werte, fotos: "[]", erstellt: jetzt(), geaendert: jetzt(), pos: mx ? mx.p : nr };
  await db.prepare(`INSERT INTO gegenstaende (id, sammlung_id, nr, name, kategorie, ort_id, menge, status, werte, notizen, fotos, erstellt, geaendert, tags, pos)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`)
    .bind(g.id, g.sammlung_id, g.nr, g.name, g.kategorie, g.ort_id, g.menge, g.status, g.werte, g.notizen, g.fotos, g.erstellt, g.geaendert, g.tags, g.pos).run();
  return g;
}

// Übernimmt nur bekannte Felder; Werte nach Typ prüfen
async function felderSetzen(db, s, g, b, ortGeprueft = false) {
  const neu = { name: g.name, kategorie: g.kategorie, tags: g.tags || "[]", ort_id: g.ort_id, menge: g.menge, status: g.status, notizen: g.notizen };
  if (b.name != null) neu.name = text(b.name, 200);
  // Tags (mehrere je Gegenstand); „kategorie“ bleibt für alte Aufrufe/Import: Komma-Liste → Tags
  let tags = null;
  if (Array.isArray(b.tags)) tags = b.tags;
  else if (b.tags != null) tags = String(b.tags).split(/[,;]/);
  else if (b.kategorie != null) tags = String(b.kategorie).split(/[,;]/);
  if (tags) { const t = tagsPruefen(tags); neu.tags = JSON.stringify(t); neu.kategorie = t[0] || ""; }
  if (b.menge != null) neu.menge = Math.max(0, zahl(b.menge) ?? 1);
  if (b.status && STATUS.includes(b.status)) neu.status = b.status;
  if (b.notizen != null) neu.notizen = text(b.notizen, 5000);
  if ("ort_id" in b) {
    if (!b.ort_id) neu.ort_id = null;
    else if (ortGeprueft) neu.ort_id = b.ort_id;
    else {
      const o = await db.prepare("SELECT id FROM orte WHERE id = ?1 AND sammlung_id = ?2").bind(b.ort_id, s.id).first();
      neu.ort_id = o ? o.id : g.ort_id;
    }
  }
  const felder = JSON.parse(s.felder || "[]");
  const werte = JSON.parse(g.werte || "{}");
  const ein = b.werte && typeof b.werte === "object" ? b.werte : {};
  for (const f of felder) {
    if (!(f.id in ein)) continue;
    const v = ein[f.id];
    if (v === "" || v == null) { delete werte[f.id]; continue; }
    if (f.typ === "zahl") { const z = zahl(String(v).replace(/[€\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")); if (z == null) delete werte[f.id]; else werte[f.id] = z; }
    else if (f.typ === "janein") werte[f.id] = v === true || /^(ja|yes|true|1|x)$/i.test(String(v).trim()) ? true : /^(nein|no|false|0)$/i.test(String(v).trim()) || v === false ? false : text(v, 20);
    else if (f.typ === "datum") werte[f.id] = text(v, 20);
    else werte[f.id] = text(v, f.typ === "lang" ? 5000 : 300);
  }
  neu.werte = JSON.stringify(werte);
  return neu;
}

async function gueltigerElternteil(db, sid, oid, elternId) {
  let x = elternId;
  for (let i = 0; i < 20 && x; i++) {
    if (x === oid) return false;
    const o = await db.prepare("SELECT eltern_id FROM orte WHERE id = ?1 AND sammlung_id = ?2").bind(x, sid).first();
    if (!o) return false;
    x = o.eltern_id;
  }
  return true;
}

const eigeneSammlung = (db, se, sid) => db.prepare("SELECT * FROM sammlungen WHERE id = ?1 AND konto_id = ?2").bind(sid, se.konto_id).first();
const beruehrt = (db, sid) => db.prepare("UPDATE sammlungen SET geaendert = ?2 WHERE id = ?1").bind(sid, jetzt()).run();
async function kontoGegenstaende(db, kontoId) {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM gegenstaende g JOIN sammlungen s ON s.id = g.sammlung_id WHERE s.konto_id = ?1").bind(kontoId).first();
  return r ? r.n : 0;
}

function sammlungAus(s, gegenstaende = null, vorhanden = null) {
  const da = vorhanden || (gegenstaende ? [...new Set(gegenstaende.flatMap(g => JSON.parse(g.tags || "[]")))] : []);
  return {
    id: s.id, name: s.name, vorlage: s.vorlage, felder: JSON.parse(s.felder || "[]"), sicht: s.sicht, slug: s.slug,
    link_token: s.link_token, praefix: s.praefix, anzahl: s.anzahl, geaendert: s.geaendert, pos: s.pos || 0,
    tags: tagsDerSammlung(s, da),
  };
}
function gegenstandAus(g) {
  return { ...g, werte: JSON.parse(g.werte || "{}"), fotos: JSON.parse(g.fotos || "[]"), tags: JSON.parse(g.tags || "[]") };
}
// Tag-Liste säubern: Text, ≤ 40 Zeichen, ohne Doppelte (Groß/klein egal), höchstens 30
function tagsPruefen(liste) {
  const aus = [], gesehen = new Set();
  for (const t of liste || []) {
    const v = String(t == null ? "" : t).replace(/\s+/g, " ").trim().slice(0, 40);
    if (!v || gesehen.has(v.toLowerCase())) continue;
    gesehen.add(v.toLowerCase()); aus.push(v);
    if (aus.length >= 30) break;
  }
  return aus;
}
// Vorschläge der Sammlung: gespeicherte Liste, sonst Vorlage; dazu alle Tags, die Gegenstände tragen
function tagsDerSammlung(s, vorhanden = []) {
  const basis = s.tags != null ? JSON.parse(s.tags || "[]") : (VORLAGEN[s.vorlage] || VORLAGEN.frei).kategorien;
  return tagsPruefen([...basis, ...vorhanden]);
}
async function alleTags(db, sid) {
  const { results } = await db.prepare("SELECT tags FROM gegenstaende WHERE sammlung_id = ?1").bind(sid).all();
  return [...new Set((results || []).flatMap(r => JSON.parse(r.tags || "[]")))];
}

function meineSachen(k, se, url, s) {
  return k.inhalt(se, {
    schluessel: s.id, titel: s.name,
    url: s.sicht === "privat" ? url.origin + "/#/s/" + s.id : url.origin + "/o/" + s.slug + (s.sicht === "link" ? "?t=" + s.link_token : ""),
    bearbeiten: url.origin + "/#/s/" + s.id, oeffentlich: s.sicht === "oeffentlich",
  });
}

function csvZelle(v) {
  const t = v == null ? "" : String(v);
  return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}
function ortPfadText(orte, oid) {
  const teile = [];
  for (let i = 0; i < 20 && oid; i++) { const o = orte.find(x => x.id === oid); if (!o) break; teile.unshift(o.name); oid = o.eltern_id; }
  return teile.join(" / ");
}
// Semikolon + BOM: öffnet in Excel (DE) direkt richtig; Import liest beides
function csvAus(s, gegenstaende, orte, lang, origin) {
  const felder = JSON.parse(s.felder || "[]").filter(f => !f.aus);
  const kopf = lang === "en"
    ? ["No.", "Name", "Tags", "Place", "Quantity", "Status", ...felder.map(f => f.en), "Notes", "Photos"]
    : ["Nr.", "Name", "Tags", "Ort", "Menge", "Status", ...felder.map(f => f.de), "Notizen", "Fotos"];
  const zeilen = [kopf];
  for (const g of gegenstaende) {
    const w = JSON.parse(g.werte || "{}");
    const fotos = JSON.parse(g.fotos || "[]").map(f => `${origin}/f/${s.id}/${g.id}/${f}`).join(" ");
    zeilen.push([
      s.praefix + "-" + String(g.nr).padStart(4, "0"), g.name, JSON.parse(g.tags || "[]").join(", "), ortPfadText(orte, g.ort_id), g.menge, g.status,
      ...felder.map(f => (w[f.id] === true ? "ja" : w[f.id] === false ? "nein" : w[f.id] ?? "")), g.notizen, fotos,
    ]);
  }
  return zeilen.map(z => z.map(csvZelle).join(";")).join("\r\n") + "\r\n";
}

/* ---------------- Öffentlich + Fotos ---------------- */

async function sichtbar(request, env, k, s, token) {
  if (s.sicht === "oeffentlich") return { ok: true, besitzer: false };
  const se = await k.sitzung(request);
  if (se && se.konto_id === s.konto_id) return { ok: true, besitzer: true, se };
  if (s.sicht === "link" && token && token === s.link_token) return { ok: true, besitzer: false };
  return { ok: false };
}

async function oeffentlich(request, env, k, slug, url, lang) {
  const s = await env.DB.prepare("SELECT * FROM sammlungen WHERE slug = ?1").bind(slug).first();
  const t = url.searchParams.get("t") || "";
  const v = s ? await sichtbar(request, env, k, s, t) : { ok: false };
  if (!v.ok) return new Response(lang === "en" ? "Not found" : "Nicht gefunden", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const gesperrt = await k.gesperrteInhalte();
  if (gesperrt.has(s.id) && !v.besitzer) return new Response(lang === "en" ? "This collection has been blocked." : "Diese Sammlung wurde gesperrt.", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const [g, o] = await Promise.all([
    env.DB.prepare("SELECT * FROM gegenstaende WHERE sammlung_id = ?1 AND status IN ('vorhanden','verliehen') ORDER BY pos, nr").bind(s.id).all(),
    env.DB.prepare("SELECT * FROM orte WHERE sammlung_id = ?1 ORDER BY pos, name").bind(s.id).all(),
  ]);
  if (!v.besitzer) await k.ereignis(null, "angesehen");
  return oeffentlicheSeite({
    s: sammlungAus(s), gegenstaende: (g.results || []).map(gegenstandAus), orte: o.results || [],
    lang, token: s.sicht === "link" ? t : "", besitzer: v.besitzer, name: v.se ? v.se.name : "", origin: url.origin,
  });
}

async function foto(request, env, k, sid, gid, datei, url) {
  const s = await env.DB.prepare("SELECT * FROM sammlungen WHERE id = ?1").bind(sid).first();
  if (!s) return new Response("", { status: 404 });
  const v = await sichtbar(request, env, k, s, url.searchParams.get("t") || "");
  if (!v.ok) return new Response("", { status: 404 });
  if (!v.besitzer) {
    const g = await env.DB.prepare("SELECT status FROM gegenstaende WHERE id = ?1 AND sammlung_id = ?2").bind(gid, sid).first();
    if (!g || !["vorhanden", "verliehen"].includes(g.status)) return new Response("", { status: 404 });
  }
  const o = await env.FOTOS.get(`f/${sid}/${gid}/${datei}`);
  if (!o) return new Response("", { status: 404 });
  return new Response(o.body, {
    headers: {
      "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
      "Cache-Control": s.sicht === "oeffentlich" ? "public, max-age=86400" : "private, max-age=3600",
    },
  });
}

export const _test = { slugAus, csvAus, ortPfadText };
