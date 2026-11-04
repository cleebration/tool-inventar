// Öffentliche Ansicht einer Sammlung (/o/<slug>) – serverseitig, schnell, ohne Konto.
// Zeigt nur Felder mit „öffentlich“, Orte höchstens zwei Ebenen tief (Haus → Raum), nie Notizen, nie verkaufte/weg.

import { esc, SICHERHEIT } from "./cleebration-kit.js";

const STORE = "https://store.cleebration.com";
const T = {
  de: { suche: "Suchen", alle: "Alle", stueck: "Gegenstände", melden: "Inhalt melden", gemeldet: "Danke – wir sehen uns das an.",
        grund: "Warum?", senden: "Melden", leer: "Noch nichts zu sehen.", ja: "ja", nein: "nein", verliehen: "verliehen", menge: "Menge",
        bearbeiten: "Bearbeiten", privatHinweis: "Nur du siehst diese Vorschau – die Sammlung ist privat.", impressum: "Impressum", datenschutz: "Datenschutz",
        gruende: [["unangemessen", "Unangemessen"], ["rechte", "Urheberrecht"], ["privat", "Private Daten"], ["sonstiges", "Sonstiges"]] },
  en: { suche: "Search", alle: "All", stueck: "items", melden: "Report content", gemeldet: "Thanks – we'll take a look.",
        grund: "Why?", senden: "Report", leer: "Nothing here yet.", ja: "yes", nein: "no", verliehen: "lent out", menge: "Quantity",
        bearbeiten: "Edit", privatHinweis: "Only you see this preview – the collection is private.", impressum: "Imprint", datenschutz: "Privacy",
        gruende: [["unangemessen", "Inappropriate"], ["rechte", "Copyright"], ["privat", "Private data"], ["sonstiges", "Other"]] },
};

function ortKurz(orte, oid) {
  const kette = [];
  for (let i = 0; i < 20 && oid; i++) { const o = orte.find(x => x.id === oid); if (!o) break; kette.unshift(o.name); oid = o.eltern_id; }
  return kette.slice(0, 2).join(" · ");
}

export function oeffentlicheSeite({ s, gegenstaende, orte, lang, token, besitzer, name, origin }) {
  const t = T[lang] || T.de;
  const felder = s.felder.filter(f => !f.aus && f.oeffentlich);
  const q = token ? "?t=" + encodeURIComponent(token) : "";
  const tags = [...new Set(gegenstaende.flatMap(g => g.tags || []))].sort((a, b) => a.localeCompare(b, lang));
  const zurueck = encodeURIComponent("/o/" + s.slug + q);
  const andere = "/sprache?l=" + (lang === "en" ? "de" : "en") + "&zurueck=" + zurueck;
  const wert = (f, v) => v === true ? t.ja : v === false ? t.nein : esc(v);

  const karten = gegenstaende.map(g => {
    const bild = g.fotos[0] ? `<img loading="lazy" src="/f/${s.id}/${g.id}/${g.fotos[0]}${q}" alt="${esc(g.name)}">` : `<div class="ohne" aria-hidden="true">📦</div>`;
    const mehr = g.fotos.slice(1).map(f => `<img loading="lazy" src="/f/${s.id}/${g.id}/${f}${q}" alt="">`).join("");
    const zeilen = felder.filter(f => g.werte[f.id] != null && g.werte[f.id] !== "")
      .map(f => `<div class="z"><dt>${esc(lang === "en" ? f.en : f.de)}</dt><dd>${wert(f, g.werte[f.id])}</dd></div>`).join("");
    const ort = ortKurz(orte, g.ort_id);
    const such = [g.name, ...(g.tags || []), ort, ...felder.map(f => g.werte[f.id])].filter(v => v != null).join(" ").toLowerCase();
    return `<article class="karte" data-k="${esc(JSON.stringify(g.tags || []))}" data-s="${esc(such)}">
  <button class="bild" type="button" aria-label="${esc(g.name)}">${bild}</button>
  <div class="text"><h2>${esc(g.name || "—")}</h2>
  <p class="meta">${[(g.tags || []).join(", "), ort, g.menge !== 1 ? `${t.menge} ${esc(g.menge)}` : "", g.status === "verliehen" ? t.verliehen : ""].filter(Boolean).map(esc).join(" · ")}</p>
  ${zeilen ? `<dl>${zeilen}</dl>` : ""}${mehr ? `<div class="mehr" hidden>${mehr}</div>` : ""}</div></article>`;
  }).join("\n");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.name)}</title>
<meta name="description" content="${esc(s.name)} – ${gegenstaende.length} ${t.stueck}">
${s.sicht === "oeffentlich" ? "" : '<meta name="robots" content="noindex">'}
<script src="${STORE}/leiste.js" defer></script>
<script src="${STORE}/kit.js" data-produkt="inventar" defer></script>
<link rel="stylesheet" href="/oeffentlich.css">
</head><body>
<cleebration-leiste tool="inventar" lang="${lang}" sprache="${esc(andere)}"${name ? ` name="${esc(name)}"` : ""}${besitzer ? ` bearbeiten="/#/s/${s.id}" bearbeiten-text="${t.bearbeiten}"` : ""}>
  <input data-icon="suche" data-icon-breit title="${t.suche}" type="search" id="suche" placeholder="${t.suche}" aria-label="${t.suche}">
</cleebration-leiste>
<main>
  <header class="kopf"><h1>${esc(s.name)}</h1><p>${gegenstaende.length} ${t.stueck}</p>
  ${besitzer && s.sicht === "privat" ? `<p class="hinweis">${t.privatHinweis}</p>` : ""}
  ${tags.length > 1 ? `<nav class="chips"><button type="button" aria-pressed="true" data-k="">${t.alle}</button>${tags.map(k => `<button type="button" aria-pressed="false" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</nav>` : ""}
  </header>
  <section class="raster" id="raster">${karten || `<p class="leer">${t.leer}</p>`}</section>
  <details class="melden"><summary>${t.melden}</summary>
    <form id="meldung"><label>${t.grund} <select name="grund">${t.gruende.map(([w, l]) => `<option value="${w}">${l}</option>`).join("")}</select></label>
    <textarea name="text" maxlength="1000" rows="3"></textarea><button type="submit">${t.senden}</button></form></details>
</main>
<cleebration-fuss produkt="inventar" name="Inventar" eigen="${lang === "en" ? "Create your own inventory for free" : "Eigenes Inventar gratis erstellen"}"></cleebration-fuss>
<dialog id="gross"><button type="button" class="x" aria-label="X">✕</button>
  <div class="galerie"><div class="bahn" id="bahn"></div><button type="button" class="pf l" aria-label="‹">‹</button><button type="button" class="pf r" aria-label="›">›</button><p class="zaehler" id="zaehler"></p></div>
  <div id="grossInhalt"></div></dialog>
<script>
(function(){
  var suche=document.getElementById("suche"),karten=[].slice.call(document.querySelectorAll(".karte")),gew=[];
  karten.forEach(function(k){try{k._t=JSON.parse(k.dataset.k||"[]");}catch(e){k._t=[];}});
  function filtern(){var q=(suche&&suche.value||"").toLowerCase().trim();karten.forEach(function(k){k.hidden=!!(gew.some(function(t){return k._t.indexOf(t)<0;})||(q&&k.dataset.s.indexOf(q)<0));});}
  if(suche)suche.addEventListener("input",filtern);
  var chips=[].slice.call(document.querySelectorAll(".chips button"));
  chips.forEach(function(b){b.onclick=function(){var k=b.dataset.k;if(!k)gew=[];else{var i=gew.indexOf(k);if(i<0)gew.push(k);else gew.splice(i,1);}
    chips.forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.k?gew.indexOf(x.dataset.k)>=0:!gew.length));});filtern();};});
  // Galerie: alle Fotos eines Gegenstands zum Durchblättern (Pfeile, Wischen, Tasten)
  var d=document.getElementById("gross"),di=document.getElementById("grossInhalt"),bahn=document.getElementById("bahn"),z=document.getElementById("zaehler"),n=0,i=0;
  function zeige(j){i=Math.max(0,Math.min(n-1,j));bahn.scrollTo({left:i*bahn.clientWidth,behavior:"smooth"});z.textContent=n>1?(i+1)+" / "+n:"";
    d.querySelector(".l").hidden=i<=0;d.querySelector(".r").hidden=i>=n-1;}
  karten.forEach(function(k){k.querySelector(".bild").onclick=function(){var b=[].slice.call(k.querySelectorAll("img"));n=b.length;
    bahn.innerHTML=b.map(function(x){return '<img src="'+x.src+'" alt="">';}).join("");d.querySelector(".galerie").hidden=!n;
    di.innerHTML=k.querySelector(".text").outerHTML.replace(' hidden','');var m=di.querySelector(".mehr");if(m)m.remove();d.showModal();bahn.scrollLeft=0;zeige(0);};});
  d.querySelector(".l").onclick=function(){zeige(i-1);};d.querySelector(".r").onclick=function(){zeige(i+1);};
  bahn.addEventListener("scroll",function(){var j=Math.round(bahn.scrollLeft/Math.max(1,bahn.clientWidth));if(j!==i){i=j;z.textContent=n>1?(i+1)+" / "+n:"";d.querySelector(".l").hidden=i<=0;d.querySelector(".r").hidden=i>=n-1;}},{passive:true});
  d.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")zeige(i-1);if(e.key==="ArrowRight")zeige(i+1);});
  d.querySelector(".x").onclick=function(){d.close();};d.addEventListener("click",function(e){if(e.target===d)d.close();});
  var f=document.getElementById("meldung");
  f.onsubmit=function(e){e.preventDefault();fetch("/api/melden",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:${JSON.stringify(s.slug)},grund:f.grund.value,text:f.text.value})}).then(function(){f.innerHTML="<p>${t.gemeldet}</p>";});};
})();
</script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...SICHERHEIT } });
}
