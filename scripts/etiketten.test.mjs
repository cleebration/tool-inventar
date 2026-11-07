// Test Übergabe an Tool Etiketten (Auftrag 44) – ohne Pakete, ohne wrangler. Aufruf: node scripts/etiketten.test.mjs
// Optional Gegenprobe mit dem echten Leser aus tool-etiketten: ETIKETTEN_KARTON=/pfad/tool-etiketten/public/kern/karton.mjs node scripts/etiketten.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const lies = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const ctx = { TextEncoder, btoa, globalThis: null }; ctx.globalThis = ctx;
vm.runInNewContext(lies("public/etiketten-link.js"), ctx);
const etikettenLink = ctx.etikettenLink;
let ok = 0; const pruef = (n, f) => { f(); ok++; console.log("✓ " + n); };

const ein = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
const eintraege = [
  { nr: "INV-0001", name: "Winterkleidung – Größe 5–7", ort: "Haus › Keller › Regal 2", link: "https://inventar.cleebration.com/#/s/s1/g/g1" },
  { nr: "", name: "Box 3", ort: "Haus › Keller", link: "https://inventar.cleebration.com/#/s/s1?ort=o3" },
];

pruef("Adresse geht nach Etiketten, Liste nur im #-Teil", () => {
  const a = etikettenLink("Keller", eintraege);
  assert.match(a, /^https:\/\/etiketten\.cleebration\.com\/#inventar=[A-Za-z0-9_-]+$/);
  assert.equal(new URL(a).search, "");
});
pruef("Inhalt v1 mit Nr, Name, Ort, QR-Adresse (UTF-8)", () => {
  const d = JSON.parse(ein(etikettenLink("Keller", eintraege).split("#inventar=")[1]));
  assert.deepEqual(d, { v: 1, quelle: "inventar", titel: "Keller", eintraege });
});
pruef("höchstens 500 Einträge", () => {
  const viele = Array.from({ length: 700 }, (_, i) => ({ nr: "INV-" + i, name: "x", ort: "", link: "https://inventar.cleebration.com/#/s/a/g/" + i }));
  const d = JSON.parse(ein(etikettenLink("", viele).split("#inventar=")[1]));
  assert.equal(d.eintraege.length, 500); assert.equal(etikettenLink.MAX, 500);
});
pruef("App: Knopf „Etiketten drucken“ bei Sammlung/Ort und 🏷 je Ort, Skript vor app.js geladen", () => {
  const app = lies("public/app.js"), html = lies("public/index.html");
  assert.match(app, /id="etiketten"/); assert.match(app, /data-a="etk"/);
  assert.match(app, /"\/#\/s\/" \+ s\.id \+ "\/g\/" \+ g\.id/);
  assert.ok(html.indexOf("/etiketten-link.js") > 0 && html.indexOf("/etiketten-link.js") < html.indexOf("/app.js"));
});
if (process.env.ETIKETTEN_KARTON) {
  const k = await import(pathToFileURL(process.env.ETIKETTEN_KARTON).href);
  pruef("Gegenprobe: tool-etiketten liest die Liste", () => {
    const l = k.kartonLesen(new URL(etikettenLink("Keller", eintraege)).hash);
    assert.equal(l.eintraege.length, 2); assert.equal(l.verworfen, 0); assert.equal(l.eintraege[0].name, eintraege[0].name);
    const so = k.kartonSorten(l); assert.equal(so[1].werte.Link, eintraege[1].link);
  });
}
console.log(ok + " ok (Etiketten-Übergabe)");
