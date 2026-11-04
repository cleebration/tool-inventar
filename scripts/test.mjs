// Ende-zu-Ende-Test gegen „wrangler dev“ + fake-store: beide Konten (chris = Admin, chrisnate = Nutzer, Grundsatz 8).
// Start: npm run test (startet beides selbst)
import assert from "node:assert/strict";

const APP = process.env.APP || "http://127.0.0.1:8787";
const STORE = process.env.STORE || "http://127.0.0.1:8788";
// wrangler dev meldet dem Worker den Host aus der Route (inventar.cleebration.com) – im Test auf APP umbiegen
const HOST = process.env.HOST || "http://inventar.cleebration.com";
const lokal = u => u.replace(/^https?:\/\/inventar\.cleebration\.com/, APP);
let ok = 0;
const pruef = async (name, f) => { await f(); ok++; console.log("✓ " + name); };

function browser() {
  const jar = new Map();
  async function go(pfad, opt = {}) {
    const h = { ...(opt.headers || {}), Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; ") };
    if (opt.json) { h["Content-Type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    if (opt.origin !== false && opt.method && opt.method !== "GET") h.Origin = HOST;
    const r = await fetch(pfad.startsWith("http") ? lokal(pfad) : APP + pfad, { method: opt.method || "GET", headers: h, body: opt.body, redirect: "manual" });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); const v = kv.slice(i + 1); if (/Max-Age=0/.test(c)) jar.delete(kv.slice(0, i)); else jar.set(kv.slice(0, i), v); }
    return r;
  }
  async function anmelden(konto) {
    await fetch(STORE + "/test/als?konto=" + konto);
    let r = await go("/anmelden?zurueck=/");
    assert.equal(r.status, 302);
    r = await fetch(r.headers.get("location"), { redirect: "manual" });          // Store
    r = await go(r.headers.get("location"));                                       // /anmelden/zurueck
    assert.equal(r.status, 302, "Rücksprung");
  }
  return { go, anmelden, jar };
}
const jpeg = () => { const b = new Uint8Array(5000); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; return b; };

const nate = browser(), chris = browser(), gast = browser();

await pruef("ohne Anmeldung → /anmelden", async () => {
  const r = await gast.go("/");
  assert.equal(r.status, 302); assert.match(r.headers.get("location"), /\/anmelden\?zurueck=/);
  assert.equal((await gast.go("/api/start")).status, 401);
});

await pruef("chrisnate meldet sich an, App-Hülle mit Name", async () => {
  await nate.anmelden("chrisnate");
  const r = await nate.go("/");
  const html = await r.text();
  assert.equal(r.status, 200); assert.match(html, /name="chrisnate"/); assert.match(html, /data-icon="neu"/);
});

let s, g;
await pruef("Start legt sofort eine Sammlung an (Grundsatz 6)", async () => {
  const j = await (await nate.go("/api/start")).json();
  assert.equal(j.sammlungen.length, 1); s = j.sammlungen[0];
  assert.equal(s.sicht, "privat"); assert.equal(j.grenzen.sammlungen, 3);
});

await pruef("Vorlage Wertsachen: Felder dazu, Wertfelder nicht öffentlich", async () => {
  const j = await (await nate.go("/api/sammlungen/" + s.id, { method: "PATCH", json: { vorlage: "wertsachen", name: "Ikonen & Statuen" } })).json();
  assert.ok(j.felder.find(f => f.id === "wert_bis" && !f.oeffentlich)); s = j;
});

await pruef("Orte-Baum + Gegenstand anlegen und ändern", async () => {
  const haus = await (await nate.go(`/api/sammlungen/${s.id}/orte`, { method: "POST", json: { name: "Haus" } })).json();
  const wz = await (await nate.go(`/api/sammlungen/${s.id}/orte`, { method: "POST", json: { name: "Wohnzimmer", eltern_id: haus.id } })).json();
  const zyklus = await nate.go(`/api/sammlungen/${s.id}/orte/${haus.id}`, { method: "PATCH", json: { eltern_id: wz.id } });
  assert.equal(zyklus.status, 400, "Ort darf nicht in sich selbst liegen");
  g = await (await nate.go(`/api/sammlungen/${s.id}/gegenstaende`, { method: "POST", json: {} })).json();
  assert.equal(g.nr, 1);
  const neu = await (await nate.go(`/api/sammlungen/${s.id}/gegenstaende/${g.id}`, { method: "PATCH",
    json: { name: "Ikone Hodegetria", kategorie: "Ikone", ort_id: wz.id, werte: { wert_von: "1.200,50", gutachten: "ja", hersteller: "unbekannt", fremd: "x" } } })).json();
  assert.equal(neu.werte.wert_von, 1200.5); assert.equal(neu.werte.gutachten, true); assert.equal(neu.werte.fremd, undefined);
  const g2 = await (await nate.go(`/api/sammlungen/${s.id}/gegenstaende`, { method: "POST", json: { name: "Statue" } })).json();
  assert.equal(g2.nr, 2);
});

await pruef("Foto hoch, nur JPEG, Besitzer sieht es, Fremde nicht", async () => {
  const bad = await nate.go(`/api/sammlungen/${s.id}/gegenstaende/${g.id}/fotos`, { method: "POST", body: "x", headers: { "Content-Type": "image/png" } });
  assert.equal(bad.status, 415);
  const r = await nate.go(`/api/sammlungen/${s.id}/gegenstaende/${g.id}/fotos`, { method: "POST", body: jpeg(), headers: { "Content-Type": "image/jpeg" } });
  assert.equal(r.status, 201); g.fotos = (await r.json()).fotos;
  assert.equal((await nate.go(`/f/${s.id}/${g.id}/${g.fotos[0]}`)).status, 200);
  assert.equal((await gast.go(`/f/${s.id}/${g.id}/${g.fotos[0]}`)).status, 404);
});

await pruef("chris (Admin) sieht und ändert nichts von chrisnate", async () => {
  await chris.anmelden("chris");
  const j = await (await chris.go("/api/start")).json();
  assert.ok(!j.sammlungen.find(x => x.id === s.id)); assert.equal(j.grenzen.sammlungen, null, "Admin ohne Grenze");
  assert.equal((await chris.go("/api/sammlungen/" + s.id)).status, 404);
  assert.equal((await chris.go(`/api/sammlungen/${s.id}/gegenstaende/${g.id}`, { method: "PATCH", json: { name: "x" } })).status, 404);
  assert.equal((await chris.go(`/f/${s.id}/${g.id}/${g.fotos[0]}`)).status, 404);
});

await pruef("Öffentliche Ansicht: privat 404, Link nur mit Token, öffentlich ohne Werte", async () => {
  assert.equal((await gast.go("/o/" + s.slug)).status, 404);
  let j = await (await nate.go("/api/sammlungen/" + s.id, { method: "PATCH", json: { sicht: "link" } })).json();
  assert.equal((await gast.go("/o/" + s.slug)).status, 404);
  const r = await gast.go(`/o/${s.slug}?t=${j.link_token}`);
  const html = await r.text();
  assert.equal(r.status, 200); assert.match(html, /Ikone Hodegetria/); assert.doesNotMatch(html, /1200/); assert.match(html, /noindex/);
  assert.equal((await gast.go(`/f/${s.id}/${g.id}/${g.fotos[0]}?t=${j.link_token}`)).status, 200);
  j = await (await nate.go("/api/sammlungen/" + s.id, { method: "PATCH", json: { sicht: "oeffentlich" } })).json();
  const h2 = await (await gast.go("/o/" + s.slug)).text();
  assert.doesNotMatch(h2, /noindex/); assert.doesNotMatch(h2, /Wohnzimmer.*Haus/);
});

await pruef("Fremde Seite darf nicht schreiben (Herkunft)", async () => {
  const r = await nate.go(`/api/sammlungen/${s.id}/gegenstaende`, { method: "POST", json: {}, headers: { Origin: "https://boese.example" }, origin: false });
  assert.equal(r.status, 403);
});

await pruef("Melden geht an den Store", async () => {
  const r = await gast.go("/api/melden", { method: "POST", json: { slug: s.slug, grund: "rechte", text: "test" } });
  assert.equal(r.status, 200);
  const log = await (await fetch(STORE + "/test/log")).json();
  assert.ok(log.find(x => x.p === "/api/v1/meldung" && x.b.schluessel === s.id));
});

await pruef("Import mit Orts-Pfad, neuem Feld und Export als CSV", async () => {
  const felder = [...s.felder, { id: "versicherer", de: "Versicherer", en: "Insurer", typ: "text", eigen: true }];
  s = await (await nate.go("/api/sammlungen/" + s.id, { method: "PATCH", json: { felder } })).json();
  const r = await nate.go(`/api/sammlungen/${s.id}/import`, { method: "POST", json: { zeilen: [
    { name: "Bild Linz", kategorie: "Bild", ort: "Haus / Keller / Regal 2", werte: { wert_bis: "800", versicherer: "Uniqa" } },
    { name: "Uhr", ort: "Haus/Wohnzimmer", status: "verkauft" },
  ] } });
  assert.deepEqual(await r.json(), { neu: 2 });
  const j = await (await nate.go("/api/sammlungen/" + s.id)).json();
  assert.equal(j.orte.filter(o => o.name === "Haus").length, 1, "Haus nicht doppelt");
  assert.equal(j.gegenstaende.length, 4); assert.deepEqual(j.gegenstaende.map(x => x.nr), [1, 2, 3, 4]);
  const csv = await (await nate.go(`/api/sammlungen/${s.id}/export.csv`)).text();
  assert.match(csv, /INV-0003;Bild Linz;Bild;Haus \/ Keller \/ Regal 2/); assert.match(csv, /Uniqa/);
  const h = await (await gast.go("/o/" + s.slug)).text();
  assert.doesNotMatch(h, />Uhr</, "verkauft ist öffentlich unsichtbar"); assert.doesNotMatch(h, /Uniqa/);
});

await pruef("Grenzen aus dem Store: 4. Sammlung und Fotos über Basis", async () => {
  await fetch(STORE + "/test/werte", { method: "POST", body: JSON.stringify({ fotos_frei: 1 }) });
  await new Promise(r => setTimeout(r, 50));
  for (let i = 0; i < 2; i++) assert.equal((await nate.go("/api/sammlungen", { method: "POST", json: { vorlage: "werkzeug", name: "W" + i } })).status, 201);
  const r = await nate.go("/api/sammlungen", { method: "POST", json: { vorlage: "kisten" } });
  assert.equal(r.status, 402); assert.equal((await r.json()).grenze, "sammlungen");
});

await pruef("Ort löschen: Gegenstände rücken hoch, nichts geht verloren", async () => {
  const j = await (await nate.go("/api/sammlungen/" + s.id)).json();
  const keller = j.orte.find(o => o.name === "Keller"), haus = j.orte.find(o => o.name === "Haus");
  await nate.go(`/api/sammlungen/${s.id}/orte/${keller.id}`, { method: "DELETE" });
  const j2 = await (await nate.go("/api/sammlungen/" + s.id)).json();
  assert.equal(j2.orte.find(o => o.name === "Regal 2").eltern_id, haus.id);
  assert.equal(j2.gegenstaende.length, 4);
});

await pruef("Sammlung löschen entfernt auch Fotos", async () => {
  assert.equal((await nate.go("/api/sammlungen/" + s.id, { method: "DELETE" })).status, 200);
  assert.equal((await nate.go(`/f/${s.id}/${g.id}/${g.fotos[0]}`)).status, 404);
  assert.equal((await gast.go("/o/" + s.slug)).status, 404);
});

await pruef("Abmelden beendet die Sitzung", async () => {
  const r = await nate.go("/abmelden");
  assert.equal(r.status, 302);
  assert.equal((await nate.go("/api/start")).status, 401);
});

console.log(`\n${ok} Prüfungen bestanden.`);
