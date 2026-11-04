/* Tool Inventar · Browser-App (eine Seite, Routen im Hash)
 * #/                      Sammlungen
 * #/s/<id>[?ort=<ort>]    Sammlung (Kacheln/Liste, Suche, Filter)
 * #/s/<id>/g/<id>         Gegenstand bearbeiten (speichert automatisch)
 * Tool-Grundsätze: Leiste oben mit Werkzeugen als Kind-Elementen, automatisch speichern, X + Klick daneben schließt, DE/EN.
 */
(function () {
  "use strict";
  var L = (document.documentElement.lang || "de").slice(0, 2) === "en" ? "en" : "de";
  var T = {
    de: {
      sammlungen: "Deine Sammlungen", neueSammlung: "Neue Sammlung", gegenstaende: "Gegenstände", vorlageWaehlen: "Wofür ist die Sammlung?",
      name: "Name", kategorie: "Kategorie", ort: "Ort", menge: "Menge", status: "Status", notizen: "Notizen", ohneOrt: "– ohne Ort –",
      st: { vorhanden: "vorhanden", verliehen: "verliehen", verkauft: "verkauft", weg: "weg" },
      fotoAufnehmen: "Foto aufnehmen", fotoWaehlen: "Fotos wählen", titelbild: "Titelbild", fotoLoeschen: "Foto entfernen",
      loeschen: "Löschen", gegenstandLoeschen: "Gegenstand löschen?", gespeichert: "gespeichert ✓", fehler: "Nicht gespeichert – bitte nochmal",
      leer: "Noch nichts drin. Tippe auf ＋ und mach ein Foto.", nichtsGefunden: "Nichts gefunden.", alle: "Alle", neu: "Neu",
      orte: "Orte", ortNeu: "Ort hinzufügen", darunter: "darunter", ortLoeschen: "Ort entfernen? Gegenstände und Unter-Orte rücken eine Ebene hoch.", liegtIn: "liegt in",
      teilen: "Teilen", privat: "Privat", privatTxt: "Nur du", link: "Mit Link", linkTxt: "Wer den Link hat", oeffentlich: "Öffentlich", oeffentlichTxt: "Alle, auch Suchmaschinen",
      kopieren: "Link kopieren", kopiert: "Kopiert ✓", neuerLink: "Neuen Link erzeugen (alter gilt nicht mehr)", adresse: "Adresse", ansehen: "Ansehen",
      teilenHinweis: "Werte, Kaufpreise, Notizen, Seriennummern und genaue Orte bleiben immer privat – außer du schaltest ein Feld ausdrücklich öffentlich.",
      daten: "Import / Export", export: "Als CSV herunterladen", import: "Datei übernehmen (CSV, Excel)", importStart: "Übernehmen",
      spalte: "Spalte", ziel: "wird zu", ignorieren: "– nicht übernehmen –", neuesFeld: "＋ neues Feld", zeilen: "Zeilen", importiert: "übernommen",
      einstellungen: "Sammlung einstellen", vorlage: "Vorlage", praefix: "Nummern-Kürzel", felder: "Felder", feldNeu: "Feld hinzufügen",
      an: "an", oeff: "öffentlich", typ: { text: "Text", lang: "Langtext", zahl: "Zahl", datum: "Datum", janein: "Ja/Nein" },
      sammlungLoeschen: "Sammlung löschen", loeschenFrage: "Zum Löschen den Namen der Sammlung eintippen:", ja: "ja", nein: "nein",
      grenze: { sammlungen: "Mehr Sammlungen gibt es mit Inventar Plus.", gegenstaende: "Mehr Gegenstände gibt es mit Inventar Plus.", fotos: "Mehr Fotos je Gegenstand gibt es mit Inventar Plus." },
      zumStore: "Im Store ansehen", qr: "QR-Code", qrOrt: "QR für diesen Ort – aufkleben, scannen, Inhalt sehen", qrDing: "QR für diesen Gegenstand",
      inOrt: "Inhalt von", ansicht: "Kacheln / Liste", wert: "Gesamt-Schätzwert", laedt: "Lädt …", foto: "Foto", fotoLaedt: "Foto wird hochgeladen …",
    },
    en: {
      sammlungen: "Your collections", neueSammlung: "New collection", gegenstaende: "items", vorlageWaehlen: "What is the collection for?",
      name: "Name", kategorie: "Category", ort: "Place", menge: "Quantity", status: "Status", notizen: "Notes", ohneOrt: "– no place –",
      st: { vorhanden: "here", verliehen: "lent out", verkauft: "sold", weg: "gone" },
      fotoAufnehmen: "Take photo", fotoWaehlen: "Choose photos", titelbild: "Cover", fotoLoeschen: "Remove photo",
      loeschen: "Delete", gegenstandLoeschen: "Delete this item?", gespeichert: "saved ✓", fehler: "Not saved – please try again",
      leer: "Nothing here yet. Tap ＋ and take a photo.", nichtsGefunden: "Nothing found.", alle: "All", neu: "New",
      orte: "Places", ortNeu: "Add place", darunter: "inside", ortLoeschen: "Remove place? Items and sub-places move up one level.", liegtIn: "inside",
      teilen: "Share", privat: "Private", privatTxt: "Only you", link: "With link", linkTxt: "Anyone with the link", oeffentlich: "Public", oeffentlichTxt: "Everyone, incl. search engines",
      kopieren: "Copy link", kopiert: "Copied ✓", neuerLink: "Create new link (old one stops working)", adresse: "Address", ansehen: "View",
      teilenHinweis: "Values, prices, notes, serial numbers and exact places always stay private – unless you explicitly make a field public.",
      daten: "Import / Export", export: "Download as CSV", import: "Import file (CSV, Excel)", importStart: "Import",
      spalte: "Column", ziel: "becomes", ignorieren: "– skip –", neuesFeld: "＋ new field", zeilen: "rows", importiert: "imported",
      einstellungen: "Collection settings", vorlage: "Template", praefix: "Number prefix", felder: "Fields", feldNeu: "Add field",
      an: "on", oeff: "public", typ: { text: "Text", lang: "Long text", zahl: "Number", datum: "Date", janein: "Yes/No" },
      sammlungLoeschen: "Delete collection", loeschenFrage: "Type the collection's name to delete it:", ja: "yes", nein: "no",
      grenze: { sammlungen: "More collections with Inventory Plus.", gegenstaende: "More items with Inventory Plus.", fotos: "More photos per item with Inventory Plus." },
      zumStore: "See in store", qr: "QR code", qrOrt: "QR for this place – stick it on, scan, see contents", qrDing: "QR for this item",
      inOrt: "Contents of", ansicht: "Grid / list", wert: "Total estimate", laedt: "Loading …", foto: "Photo", fotoLaedt: "Uploading photo …",
    },
  }[L];

  var ICON = {
    liste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    kacheln: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var app = $("#app"), leiste = $("cleebration-leiste");
  var W = { suche: $("#w-suche"), neu: $("#w-neu"), orte: $("#w-orte"), teilen: $("#w-teilen"), sammlung: $("#w-sammlung") };
  var S = { start: null, akt: null, ansicht: "kacheln", filter: { k: "", o: "", s: "" } };
  try { S.ansicht = localStorage.getItem("inv-ansicht") || "kacheln"; } catch (e) {}
  // Titel der Werkzeuge in der Sprache der Seite
  W.suche.title = W.suche.placeholder = L === "en" ? "Search" : "Suchen"; W.neu.title = T.neu; W.orte.title = T.orte; W.teilen.title = T.teilen; W.sammlung.title = T.einstellungen;
  if (L === "en") $("cleebration-fuss").setAttribute("eigen", "Create your own inventory for free");

  /* ---------- Server ---------- */
  function api(pfad, opt) {
    opt = opt || {};
    var h = opt.body && !(opt.body instanceof Blob) ? { "Content-Type": "application/json" } : opt.typ ? { "Content-Type": opt.typ } : {};
    return fetch("/api" + pfad, { method: opt.method || "GET", headers: h, credentials: "same-origin",
      body: opt.body instanceof Blob ? opt.body : opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) {
        if (r.status === 401) { location.href = "/anmelden?zurueck=" + encodeURIComponent("/" + location.hash); throw new Error("401"); }
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 402) { grenzeZeigen(j.grenze); var e = new Error("grenze"); e.grenze = true; throw e; }
          if (!r.ok) throw new Error(j.fehler || r.status);
          return j;
        });
      });
  }
  var toastT;
  function toast(text, fehler) {
    var g = $("#gespeichert"); g.textContent = text; g.className = fehler ? "fehler" : ""; g.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { g.hidden = true; }, fehler ? 4000 : 1400);
  }
  function grenzeZeigen(art) {
    dialog(T.grenze[art] || T.grenze.gegenstaende, '<p>' + esc(T.grenze[art] || "") + '</p><p><cleebration-schloss produkt="inventar" set="plus"></cleebration-schloss> <a class="knopf" href="https://store.cleebration.com/p/inventar">' + esc(T.zumStore) + '</a></p>');
  }

  /* ---------- Leiste ---------- */
  function werkzeuge(liste, zurueck) {
    Object.keys(W).forEach(function (k) { W[k].hidden = liste.indexOf(k) < 0; });
    if (zurueck) { leiste.setAttribute("schliessen", zurueck); leiste.setAttribute("schliessen-art", "zurueck"); }
    else { leiste.removeAttribute("schliessen"); leiste.removeAttribute("schliessen-art"); }
    leiste.setAttribute("lang", L); // neu zeichnen (Kinder ein-/ausgeblendet)
  }

  /* ---------- Dialog ---------- */
  function dialog(titel, html, beimSchliessen) {
    var d = document.createElement("dialog");
    d.className = "fenster";
    d.innerHTML = '<header><h2>' + esc(titel) + '</h2><button type="button" class="x" aria-label="X">✕</button></header><div class="inhalt">' + html + "</div>";
    document.body.appendChild(d);
    function zu() { if (d.open) d.close(); }
    d.querySelector(".x").onclick = zu;
    d.addEventListener("click", function (e) { if (e.target === d) zu(); });
    d.addEventListener("close", function () { d.remove(); if (beimSchliessen) beimSchliessen(); });
    d.showModal();
    return d;
  }

  /* ---------- Fotos: im Browser verkleinern (lange Seite 2000 px) – entfernt dabei EXIF inkl. GPS ---------- */
  function verkleinern(datei) {
    var max = 2000;
    var bild = window.createImageBitmap ? createImageBitmap(datei, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(datei); })
      : new Promise(function (ok, nein) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = nein; i.src = URL.createObjectURL(datei); });
    return bild.then(function (b) {
      var f = Math.min(1, max / Math.max(b.width, b.height));
      var c = document.createElement("canvas"); c.width = Math.round(b.width * f); c.height = Math.round(b.height * f);
      c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(ok, "image/jpeg", 0.85); });
    });
  }
  function fotosHochladen(dateien, s, g) {
    var liste = [].slice.call(dateien || []);
    if (!liste.length) return Promise.resolve();
    toast(T.fotoLaedt);
    return liste.reduce(function (p, d) {
      return p.then(function () { return verkleinern(d); }).then(function (blob) {
        return api("/sammlungen/" + s.id + "/gegenstaende/" + g.id + "/fotos", { method: "POST", body: blob, typ: "image/jpeg" });
      }).then(function (j) { g.fotos = j.fotos; });
    }, Promise.resolve()).then(function () { toast(T.gespeichert); if (window.cleeb) cleeb.ereignis("foto"); }, function (e) { if (!e.grenze) toast(T.fehler, true); });
  }

  /* ---------- Orte ---------- */
  function ortPfad(oid) {
    var teile = [], orte = S.akt ? S.akt.orte : [];
    for (var i = 0; i < 20 && oid; i++) { var o = orte.find(function (x) { return x.id === oid; }); if (!o) break; teile.unshift(o.name); oid = o.eltern_id; }
    return teile.join(" › ");
  }
  function ortNachkommen(oid) {
    var aus = [oid], orte = S.akt.orte, neu = true;
    while (neu) { neu = false; orte.forEach(function (o) { if (aus.indexOf(o.eltern_id) >= 0 && aus.indexOf(o.id) < 0) { aus.push(o.id); neu = true; } }); }
    return aus;
  }
  function ortBaum(eltern, tiefe) {
    var aus = [];
    S.akt.orte.filter(function (o) { return (o.eltern_id || null) === (eltern || null); })
      .sort(function (a, b) { return a.pos - b.pos || a.name.localeCompare(b.name); })
      .forEach(function (o) { aus.push({ o: o, tiefe: tiefe }); aus = aus.concat(ortBaum(o.id, tiefe + 1)); });
    return aus;
  }
  function ortOptionen(gewaehlt, ohne) {
    return '<option value="">' + esc(T.ohneOrt) + "</option>" + ortBaum(null, 0).filter(function (x) { return !ohne || ohne.indexOf(x.o.id) < 0; }).map(function (x) {
      return '<option value="' + esc(x.o.id) + '"' + (x.o.id === gewaehlt ? " selected" : "") + ">" + "  ".repeat(x.tiefe) + esc(x.o.name) + "</option>";
    }).join("");
  }

  /* ---------- Ansichten ---------- */
  function start(direkt) {
    werkzeuge([]);
    document.title = "Inventar · cleebration";
    app.innerHTML = '<p class="laedt">' + esc(T.laedt) + "</p>";
    return api("/start").then(function (j) {
      S.start = j;
      if (direkt && j.sammlungen.length === 1) { location.replace("#/s/" + j.sammlungen[0].id); return; }
      app.innerHTML = '<h1 class="titel">' + esc(T.sammlungen) + '</h1><section class="raster sammlungen">' +
        j.sammlungen.map(function (s) {
          var v = j.vorlagen[s.vorlage] || j.vorlagen.frei;
          return '<a class="karte sammlung" href="#/s/' + esc(s.id) + '"><span class="gross">' + v.icon + "</span><h2>" + esc(s.name) + "</h2><p>" + (s.anzahl || 0) + " " + esc(T.gegenstaende) +
            (s.sicht !== "privat" ? " · " + esc(s.sicht === "link" ? T.link : T.oeffentlich) : "") + "</p></a>";
        }).join("") +
        '<button type="button" class="karte sammlung neu" id="neueSammlung"><span class="gross">＋</span><h2>' + esc(T.neueSammlung) + "</h2></button></section>";
      $("#neueSammlung").onclick = neueSammlung;
    });
  }

  function neueSammlung() {
    var v = S.start.vorlagen;
    var d = dialog(T.vorlageWaehlen, '<div class="vorlagen">' + Object.keys(v).map(function (k) {
      return '<button type="button" class="karte vorlage" data-v="' + k + '"><span class="gross">' + v[k].icon + "</span><b>" + esc(v[k][L]) + "</b><small>" + esc(v[k].beschreibung[L]) + "</small></button>";
    }).join("") + "</div>");
    [].forEach.call(d.querySelectorAll("[data-v]"), function (b) {
      b.onclick = function () {
        api("/sammlungen", { method: "POST", body: { vorlage: b.dataset.v, name: v[b.dataset.v][L] } }).then(function (s) { d.close(); location.hash = "#/s/" + s.id; }).catch(function () {});
      };
    });
  }

  function sammlungLaden(id) {
    if (S.akt && S.akt.sammlung.id === id) return Promise.resolve(S.akt);
    return api("/sammlungen/" + id).then(function (j) { S.akt = j; S.filter = { k: "", o: "", s: "" }; W.suche.value = ""; return j; });
  }

  function sammlung(id, ortFilter) {
    return sammlungLaden(id).then(function (j) {
      if (ortFilter != null) S.filter.o = ortFilter;
      werkzeuge(["suche", "neu", "orte", "teilen", "sammlung"], "#/");
      document.title = j.sammlung.name + " · Inventar";
      zeichneSammlung();
    });
  }

  function feldName(f) { return L === "en" ? f.en : f.de; }
  function nrText(g) { return (S.akt.sammlung.praefix || "INV") + "-" + String(g.nr).padStart(4, "0"); }

  function zeichneSammlung() {
    var j = S.akt, s = j.sammlung, q = (W.suche.value || "").toLowerCase().trim();
    var orte = S.filter.o ? ortNachkommen(S.filter.o) : null;
    var felder = s.felder.filter(function (f) { return !f.aus; });
    var liste = j.gegenstaende.filter(function (g) {
      if (S.filter.k && g.kategorie !== S.filter.k) return false;
      if (orte && orte.indexOf(g.ort_id) < 0) return false;
      if (S.filter.s && g.status !== S.filter.s) return false;
      if (!q) return true;
      var t = [nrText(g), g.name, g.kategorie, ortPfad(g.ort_id), g.notizen].concat(felder.map(function (f) { return g.werte[f.id]; })).join(" ").toLowerCase();
      return t.indexOf(q) >= 0;
    });
    var kats = [], sts = [];
    j.gegenstaende.forEach(function (g) { if (g.kategorie && kats.indexOf(g.kategorie) < 0) kats.push(g.kategorie); if (sts.indexOf(g.status) < 0) sts.push(g.status); });
    kats.sort(function (a, b) { return a.localeCompare(b); });
    var chip = function (art, wert, text) { return '<button type="button" class="chip" data-f="' + art + '" data-w="' + esc(wert) + '" aria-pressed="' + (S.filter[art] === wert) + '">' + esc(text) + "</button>"; };
    var wertSumme = 0, hatWert = false;
    liste.forEach(function (g) { var v = g.werte.wert_bis != null ? g.werte.wert_bis : g.werte.wert_von; if (typeof v === "number") { wertSumme += v * (g.menge || 1); hatWert = true; } });

    app.innerHTML =
      '<header class="kopf"><h1 class="titel">' + esc(S.filter.o ? T.inOrt + " " + ortPfad(S.filter.o) : s.name) + '</h1><p class="zahl">' + liste.length + " " + esc(T.gegenstaende) +
      (hatWert ? " · " + esc(T.wert) + " " + wertSumme.toLocaleString(L === "en" ? "en-GB" : "de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "") + "</p>" +
      '<nav class="chips">' +
        (S.filter.o ? '<button type="button" class="chip an" data-f="o" data-w="">📍 ' + esc(ortPfad(S.filter.o)) + " ✕</button>" : "") +
        (kats.length > 1 ? chip("k", "", T.alle) + kats.map(function (k) { return chip("k", k, k); }).join("") : "") +
        (sts.length > 1 ? sts.map(function (st) { return chip("s", st === S.filter.s ? "" : st, T.st[st]); }).join("") : "") +
        '<button type="button" class="chip ansicht" id="ansicht" title="' + esc(T.ansicht) + '" aria-label="' + esc(T.ansicht) + '">' + (S.ansicht === "liste" ? ICON.kacheln : ICON.liste) + "</button>" +
      "</nav></header>" +
      (liste.length ? '<section class="' + (S.ansicht === "liste" ? "liste" : "raster") + '">' + liste.map(function (g) {
        var bild = g.fotos[0] ? '<img loading="lazy" src="/f/' + s.id + "/" + g.id + "/" + g.fotos[0] + '" alt="">' : '<span class="ohne">' + ((S.start && S.start.vorlagen[s.vorlage] || {}).icon || "📦") + "</span>";
        return '<a class="karte ding' + (g.status === "verkauft" || g.status === "weg" ? " blass" : "") + '" href="#/s/' + s.id + "/g/" + g.id + '"><span class="bild">' + bild + '</span><span class="text"><small>' + esc(nrText(g)) +
          (g.status !== "vorhanden" ? " · " + esc(T.st[g.status]) : "") + "</small><b>" + esc(g.name || "—") + "</b><small>" + esc([g.kategorie, ortPfad(g.ort_id)].filter(Boolean).join(" · ")) + "</small></span></a>";
      }).join("") + "</section>"
      : '<p class="leer">' + esc(j.gegenstaende.length ? T.nichtsGefunden : T.leer) + "</p>");

    $("#ansicht").onclick = function () { S.ansicht = S.ansicht === "liste" ? "kacheln" : "liste"; try { localStorage.setItem("inv-ansicht", S.ansicht); } catch (e) {} zeichneSammlung(); };
    [].forEach.call(app.querySelectorAll(".chip[data-f]"), function (b) {
      b.onclick = function () { S.filter[b.dataset.f] = b.dataset.f === "s" ? b.dataset.w : (S.filter[b.dataset.f] === b.dataset.w ? "" : b.dataset.w); if (b.dataset.f === "o" && !b.dataset.w) history.replaceState(null, "", "#/s/" + s.id); zeichneSammlung(); };
    });
  }

  /* ---------- Gegenstand ---------- */
  function gegenstand(sid, gid) {
    return sammlungLaden(sid).then(function (j) {
      var g = j.gegenstaende.find(function (x) { return x.id === gid; });
      if (!g) { location.replace("#/s/" + sid); return; }
      werkzeuge([], "#/s/" + sid);
      var s = j.sammlung, v = (S.start && S.start.vorlagen[s.vorlage]) || { kategorien: [] };
      var kats = (v.kategorien || []).slice();
      j.gegenstaende.forEach(function (x) { if (x.kategorie && kats.indexOf(x.kategorie) < 0) kats.push(x.kategorie); });
      document.title = (g.name || nrText(g)) + " · Inventar";

      function feldHtml(f) {
        var w = g.werte[f.id], id = "f-" + f.id, lab = '<label for="' + id + '">' + esc(feldName(f)) + (f.oeffentlich && s.sicht !== "privat" ? ' <span class="sicht" title="' + esc(T.oeff) + '">👁</span>' : "") + "</label>";
        if (f.typ === "lang") return '<div class="feld breit">' + lab + '<textarea id="' + id + '" data-w="' + f.id + '" rows="3">' + esc(w) + "</textarea></div>";
        if (f.typ === "janein") return '<div class="feld">' + lab + '<select id="' + id + '" data-w="' + f.id + '"><option value=""></option><option value="ja"' + (w === true ? " selected" : "") + ">" + T.ja + '</option><option value="nein"' + (w === false ? " selected" : "") + ">" + T.nein + "</option></select></div>";
        var typ = f.typ === "zahl" ? 'inputmode="decimal"' : f.typ === "datum" ? 'type="date"' : "";
        return '<div class="feld">' + lab + '<input id="' + id + '" data-w="' + f.id + '" ' + typ + ' value="' + esc(w) + '"></div>';
      }

      app.innerHTML =
        '<article class="editor">' +
          '<section class="fotos" id="fotos"></section>' +
          '<div class="fotoknoepfe"><button type="button" class="knopf" id="fotoKamera">📷 ' + esc(T.fotoAufnehmen) + '</button><button type="button" class="knopf leise" id="fotoGalerie">🖼 ' + esc(T.fotoWaehlen) + "</button></div>" +
          '<div class="felder">' +
            '<div class="feld breit"><label for="g-name">' + esc(T.name) + ' <small class="nr">' + esc(nrText(g)) + '</small></label><input id="g-name" data-g="name" value="' + esc(g.name) + '" autocomplete="off"></div>' +
            '<div class="feld"><label for="g-kat">' + esc(T.kategorie) + '</label><input id="g-kat" data-g="kategorie" list="kats" value="' + esc(g.kategorie) + '"><datalist id="kats">' + kats.map(function (k) { return '<option value="' + esc(k) + '">'; }).join("") + "</datalist></div>" +
            '<div class="feld"><label for="g-ort">' + esc(T.ort) + '</label><select id="g-ort" data-g="ort_id">' + ortOptionen(g.ort_id) + "</select></div>" +
            '<div class="feld"><label for="g-menge">' + esc(T.menge) + '</label><input id="g-menge" data-g="menge" inputmode="decimal" value="' + esc(g.menge) + '"></div>' +
            '<div class="feld"><label for="g-status">' + esc(T.status) + '</label><select id="g-status" data-g="status">' + S.start.status.map(function (st) { return '<option value="' + st + '"' + (g.status === st ? " selected" : "") + ">" + esc(T.st[st]) + "</option>"; }).join("") + "</select></div>" +
            s.felder.filter(function (f) { return !f.aus; }).map(feldHtml).join("") +
            '<div class="feld breit"><label for="g-notizen">' + esc(T.notizen) + '</label><textarea id="g-notizen" data-g="notizen" rows="3">' + esc(g.notizen) + "</textarea></div>" +
          "</div>" +
          '<footer class="unten"><button type="button" class="knopf leise" id="qrDing">▣ ' + esc(T.qr) + '</button><button type="button" class="knopf gefahr" id="loeschen">' + esc(T.loeschen) + "</button></footer>" +
        "</article>";

      function fotosZeichnen() {
        $("#fotos").innerHTML = g.fotos.map(function (f, i) {
          return '<figure><img src="/f/' + s.id + "/" + g.id + "/" + f + '" alt="">' + '<figcaption>' + (i ? '<button type="button" data-titel="' + f + '">★ ' + esc(T.titelbild) + "</button>" : "<span>★</span>") +
            '<button type="button" data-weg="' + f + '" aria-label="' + esc(T.fotoLoeschen) + '">✕</button></figcaption></figure>';
        }).join("") || '<button type="button" class="leerfoto" id="leerfoto">📷</button>';
        var lf = $("#leerfoto"); if (lf) lf.onclick = function () { $("#w-foto").click(); };
        [].forEach.call(app.querySelectorAll("[data-weg]"), function (b) {
          b.onclick = function () { api("/sammlungen/" + s.id + "/gegenstaende/" + g.id + "/fotos/" + b.dataset.weg, { method: "DELETE" }).then(function (r) { g.fotos = r.fotos; fotosZeichnen(); toast(T.gespeichert); }); };
        });
        [].forEach.call(app.querySelectorAll("[data-titel]"), function (b) {
          b.onclick = function () { var neu = [b.dataset.titel].concat(g.fotos.filter(function (x) { return x !== b.dataset.titel; }));
            api("/sammlungen/" + s.id + "/gegenstaende/" + g.id + "/fotos", { method: "PUT", body: { fotos: neu } }).then(function (r) { g.fotos = r.fotos; fotosZeichnen(); toast(T.gespeichert); }); };
        });
      }
      fotosZeichnen();
      function fotoEingabe(inp) { inp.value = ""; inp.onchange = function () { fotosHochladen(inp.files, s, g).then(fotosZeichnen); }; inp.click(); }
      $("#fotoKamera").onclick = function () { fotoEingabe($("#w-foto")); };
      $("#fotoGalerie").onclick = function () { fotoEingabe($("#w-fotoGalerie")); };

      // automatisch speichern (Grundsatz 12)
      var offen = {}, t;
      function merken(feld, wert, sofort) {
        if (feld.indexOf("w:") === 0) { offen.werte = offen.werte || {}; offen.werte[feld.slice(2)] = wert; } else offen[feld] = wert;
        clearTimeout(t); t = setTimeout(senden, sofort ? 0 : 600);
      }
      function senden() {
        var b = offen; offen = {};
        if (!Object.keys(b).length) return;
        api("/sammlungen/" + s.id + "/gegenstaende/" + g.id, { method: "PATCH", body: b }).then(function (neu) {
          Object.assign(g, { name: neu.name, kategorie: neu.kategorie, ort_id: neu.ort_id, menge: neu.menge, status: neu.status, notizen: neu.notizen, werte: neu.werte });
          toast(T.gespeichert);
        }).catch(function () { toast(T.fehler, true); });
      }
      window.addEventListener("hashchange", senden, { once: true });
      [].forEach.call(app.querySelectorAll("[data-g],[data-w]"), function (el) {
        var feld = el.dataset.g || "w:" + el.dataset.w, sofort = el.tagName === "SELECT";
        el.addEventListener(sofort ? "change" : "input", function () { merken(feld, el.value, sofort); });
      });
      $("#loeschen").onclick = function () {
        if (!confirm(T.gegenstandLoeschen)) return;
        api("/sammlungen/" + s.id + "/gegenstaende/" + g.id, { method: "DELETE" }).then(function () {
          j.gegenstaende = j.gegenstaende.filter(function (x) { return x.id !== g.id; }); location.hash = "#/s/" + s.id;
        });
      };
      $("#qrDing").onclick = function () { qrZeigen(T.qrDing, location.origin + "/#/s/" + s.id + "/g/" + g.id, nrText(g)); };
      if (!g.name && !g.fotos.length) $("#g-name").focus();
    });
  }

  function qrZeigen(titel, text, name) {
    var l = window.cleeb && cleeb.qr ? cleeb.qr() : Promise.resolve();
    Promise.resolve(l).then(function () {
      dialog(titel, '<cleebration-qr text="' + esc(text) + '" name="' + esc(String(name).toLowerCase()) + '" lang="' + L + '"></cleebration-qr><p class="klein">' + esc(text) + "</p>");
    });
  }

  /* ---------- Werkzeuge der Sammlung ---------- */
  W.suche.addEventListener("input", function () { if (S.akt && /^#\/s\/[^/]+$/.test(location.hash.split("?")[0])) zeichneSammlung(); });
  W.neu.onclick = function () {
    var s = S.akt.sammlung, vorbelegt = {};
    if (S.filter.o) vorbelegt.ort_id = S.filter.o;
    if (S.filter.k) vorbelegt.kategorie = S.filter.k;
    api("/sammlungen/" + s.id + "/gegenstaende", { method: "POST", body: vorbelegt }).then(function (g) {
      S.akt.gegenstaende.push(g); location.hash = "#/s/" + s.id + "/g/" + g.id;
      if (window.cleeb) cleeb.ereignis("angelegt");
    }).catch(function () {});
  };

  W.orte.onclick = function () {
    var s = S.akt.sammlung, d;
    function zeichnen() {
      var baum = ortBaum(null, 0);
      d.querySelector(".inhalt").innerHTML = '<ul class="orte">' + baum.map(function (x) {
        var n = S.akt.gegenstaende.filter(function (g) { return ortNachkommen(x.o.id).indexOf(g.ort_id) >= 0; }).length;
        return '<li style="--tiefe:' + x.tiefe + '" data-o="' + esc(x.o.id) + '"><input value="' + esc(x.o.name) + '" aria-label="' + esc(T.name) + '">' +
          '<select title="' + esc(T.liegtIn) + '">' + ortOptionen(x.o.eltern_id, ortNachkommen(x.o.id)) + "</select>" +
          '<a class="zahl" href="#/s/' + s.id + "?ort=" + esc(x.o.id) + '">' + n + "</a>" +
          '<button type="button" data-a="dazu" title="' + esc(T.ortNeu + " " + T.darunter) + '">＋</button><button type="button" data-a="qr" title="' + esc(T.qr) + '">▣</button><button type="button" data-a="weg" title="' + esc(T.loeschen) + '">✕</button></li>';
      }).join("") + '</ul><button type="button" class="knopf" id="ortNeu">＋ ' + esc(T.ortNeu) + "</button>";
      [].forEach.call(d.querySelectorAll("li[data-o]"), function (li) {
        var oid = li.dataset.o, o = S.akt.orte.find(function (x) { return x.id === oid; }), t;
        li.querySelector("input").oninput = function (e) { clearTimeout(t); var name = e.target.value; t = setTimeout(function () {
          api("/sammlungen/" + s.id + "/orte/" + oid, { method: "PATCH", body: { name: name } }).then(function () { o.name = name; toast(T.gespeichert); }); }, 600); };
        li.querySelector("select").onchange = function (e) {
          api("/sammlungen/" + s.id + "/orte/" + oid, { method: "PATCH", body: { eltern_id: e.target.value || null } }).then(function () { o.eltern_id = e.target.value || null; toast(T.gespeichert); zeichnen(); });
        };
        li.querySelector('[data-a="dazu"]').onclick = function () { neu(oid); };
        li.querySelector('[data-a="qr"]').onclick = function () { qrZeigen(T.qrOrt, location.origin + "/#/s/" + s.id + "?ort=" + oid, "ort-" + o.name); };
        li.querySelector('[data-a="weg"]').onclick = function () {
          if (!confirm(T.ortLoeschen)) return;
          api("/sammlungen/" + s.id + "/orte/" + oid, { method: "DELETE" }).then(function () {
            S.akt.orte.forEach(function (x) { if (x.eltern_id === oid) x.eltern_id = o.eltern_id; });
            S.akt.gegenstaende.forEach(function (g) { if (g.ort_id === oid) g.ort_id = o.eltern_id; });
            S.akt.orte = S.akt.orte.filter(function (x) { return x.id !== oid; }); zeichnen();
          });
        };
      });
      d.querySelector("#ortNeu").onclick = function () { neu(null); };
    }
    function neu(eltern) {
      api("/sammlungen/" + s.id + "/orte", { method: "POST", body: { name: T.ort, eltern_id: eltern } }).then(function (o) {
        S.akt.orte.push(o); zeichnen(); var f = d.querySelector('li[data-o="' + o.id + '"] input'); if (f) { f.focus(); f.select(); }
      }).catch(function () {});
    }
    d = dialog(T.orte, "", function () { zeichneSammlung(); });
    zeichnen();
  };

  W.teilen.onclick = function () {
    var s = S.akt.sammlung, d;
    function adresse() { return location.origin + "/o/" + s.slug + (s.sicht === "link" ? "?t=" + s.link_token : ""); }
    function zeichnen() {
      var opt = function (w, t1, t2) { return '<label class="wahl"><input type="radio" name="sicht" value="' + w + '"' + (s.sicht === w ? " checked" : "") + "><b>" + esc(t1) + "</b><small>" + esc(t2) + "</small></label>"; };
      d.querySelector(".inhalt").innerHTML = '<div class="wahlen">' + opt("privat", T.privat, T.privatTxt) + opt("link", T.link, T.linkTxt) + opt("oeffentlich", T.oeffentlich, T.oeffentlichTxt) + "</div>" +
        (s.sicht === "privat" ? "" :
          '<div class="feld"><label for="t-slug">' + esc(T.adresse) + '</label><div class="reihe"><span class="klein">' + esc(location.host) + '/o/</span><input id="t-slug" value="' + esc(s.slug) + '"></div></div>' +
          '<div class="reihe"><input readonly id="t-link" value="' + esc(adresse()) + '"><button type="button" class="knopf" id="t-kopie">' + esc(T.kopieren) + '</button><a class="knopf leise" target="_blank" href="' + esc(adresse()) + '">' + esc(T.ansehen) + "</a></div>" +
          '<cleebration-qr text="' + esc(adresse()) + '" name="' + esc(s.slug) + '" lang="' + L + '"></cleebration-qr>' +
          (s.sicht === "link" ? '<button type="button" class="knopf leise" id="t-neu">' + esc(T.neuerLink) + "</button>" : "")) +
        '<p class="klein">ⓘ ' + esc(T.teilenHinweis) + "</p>";
      [].forEach.call(d.querySelectorAll('input[name="sicht"]'), function (r) { r.onchange = function () { speichern({ sicht: r.value }); }; });
      var sl = d.querySelector("#t-slug"), t;
      if (sl) sl.oninput = function () { clearTimeout(t); t = setTimeout(function () { speichern({ slug: sl.value }); }, 800); };
      var k = d.querySelector("#t-kopie");
      if (k) k.onclick = function () { navigator.clipboard.writeText(adresse()).then(function () { k.textContent = T.kopiert; if (window.cleeb) cleeb.ereignis("geteilt", { tipp: k }); }); };
      var nl = d.querySelector("#t-neu"); if (nl) nl.onclick = function () { speichern({ neuerLink: true }); };
    }
    function speichern(b) {
      api("/sammlungen/" + s.id, { method: "PATCH", body: b }).then(function (neu) { Object.assign(s, neu); toast(T.gespeichert); zeichnen(); })
        .catch(function (e) { toast(String(e.message) === "slug" ? (L === "en" ? "Address taken" : "Adresse schon vergeben") : T.fehler, true); });
    }
    if (window.cleeb && cleeb.qr) cleeb.qr();
    d = dialog(T.teilen, ""); zeichnen();
  };

  function importStarten(d) {
    d.querySelector("#i-datei").onclick = function () {
      var inp = $("#w-datei"); inp.value = "";
      inp.onchange = function () { if (inp.files[0]) dateiLesen(inp.files[0]).then(function (tab) { zuordnen(d, tab); }).catch(function (e) { toast(String(e.message || e), true); }); };
      inp.click();
    };
  }

  /* ---------- Import ---------- */
  function csvLesen(text) {
    text = text.replace(/^﻿/, "");
    var erste = text.split(/\r?\n/)[0] || "";
    var trenner = [";", "\t", ","].sort(function (a, b) { return erste.split(b).length - erste.split(a).length; })[0];
    var zeilen = [], z = [], f = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
      else if (c === '"') inQ = true;
      else if (c === trenner) { z.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; z.push(f); f = ""; if (z.some(function (x) { return x !== ""; })) zeilen.push(z); z = []; }
      else f += c;
    }
    z.push(f); if (z.some(function (x) { return x !== ""; })) zeilen.push(z);
    return zeilen;
  }
  function dateiLesen(datei) {
    if (/\.xlsx?$/i.test(datei.name)) {
      var laden = window.XLSX ? Promise.resolve() : new Promise(function (ok, nein) {
        var sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; sc.onload = ok; sc.onerror = function () { nein(new Error("Excel-Leser nicht ladbar")); }; document.head.appendChild(sc);
      });
      return laden.then(function () { return datei.arrayBuffer(); }).then(function (buf) {
        var wb = XLSX.read(buf, { type: "array", cellDates: true }), ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
      });
    }
    return datei.text().then(csvLesen);
  }
  var NORM = function (t) { return String(t || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, ""); };
  function zuordnen(d, tab) {
    if (tab.length < 2) { toast(L === "en" ? "No rows found" : "Keine Zeilen gefunden", true); return; }
    var s = S.akt.sammlung, kopf = tab[0], daten = tab.slice(1);
    var ziele = [["", T.ignorieren], ["name", T.name], ["kategorie", T.kategorie], ["ort", T.ort], ["menge", T.menge], ["status", T.status], ["notizen", T.notizen]]
      .concat(s.felder.map(function (f) { return ["w:" + f.id, feldName(f)]; })).concat([["+", T.neuesFeld]]);
    var synonyme = { name: ["name", "bezeichnung", "titel", "instrument", "gerät", "gegenstand", "item", "title"], kategorie: ["kategorie", "category", "art", "typ"],
      ort: ["ort", "raum", "raumstandort", "standort", "place", "location", "box", "regal"], menge: ["menge", "anzahl", "stück", "quantity", "qty"], status: ["status"], notizen: ["notizen", "notiz", "bemerkung", "notes"] };
    function raten(h) {
      var n = NORM(h); if (!n || n === "id" || n === "nr") return "";
      for (var k in synonyme) if (synonyme[k].some(function (x) { return NORM(x) === n; })) return k;
      var f = s.felder.find(function (f) { return NORM(f.de) === n || NORM(f.en) === n || NORM(f.id) === n; });
      return f ? "w:" + f.id : "+";
    }
    var wahl = kopf.map(raten), benutzt = {};
    wahl = wahl.map(function (w) { if (w && w !== "+" && benutzt[w]) return "+"; benutzt[w] = 1; return w; });
    var box = d.querySelector("#i-zuordnung");
    box.innerHTML = '<p class="klein">' + daten.length + " " + esc(T.zeilen) + '</p><table class="zuordnung"><thead><tr><th>' + esc(T.spalte) + "</th><th>" + esc(T.ziel) + "</th></tr></thead><tbody>" +
      kopf.map(function (h, i) {
        return "<tr><td><b>" + esc(h || "#" + (i + 1)) + '</b><br><small>' + esc(String(daten[0][i] == null ? "" : daten[0][i]).slice(0, 40)) + '</small></td><td><select data-i="' + i + '">' +
          ziele.map(function (z) { return '<option value="' + esc(z[0]) + '"' + (wahl[i] === z[0] ? " selected" : "") + ">" + esc(z[1]) + "</option>"; }).join("") + "</select></td></tr>";
      }).join("") + '</tbody></table><button type="button" class="knopf" id="i-los">' + esc(T.importStart) + "</button>";
    box.querySelector("#i-los").onclick = function () {
      var knopf = this; knopf.disabled = true;
      var sel = [].map.call(box.querySelectorAll("select"), function (x) { return x.value; });
      // neue Felder zuerst an der Sammlung anlegen
      var neueFelder = [], ids = s.felder.map(function (f) { return f.id; });
      sel = sel.map(function (w, i) {
        if (w !== "+") return w;
        var basis = NORM(kopf[i]).replace(/[äöüß]/g, function (c) { return { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" }[c]; }).slice(0, 24) || "feld" + (i + 1), fid = basis, n = 2;
        while (ids.indexOf(fid) >= 0) fid = basis + n++;
        ids.push(fid);
        neueFelder.push({ id: fid, de: kopf[i] || fid, en: kopf[i] || fid, typ: "text", oeffentlich: false, aus: false, eigen: true });
        return "w:" + fid;
      });
      var schritt = neueFelder.length ? api("/sammlungen/" + s.id, { method: "PATCH", body: { felder: s.felder.concat(neueFelder) } }).then(function (neu) { Object.assign(s, neu); }) : Promise.resolve();
      var zeilen = daten.map(function (r) {
        var z = { werte: {} };
        sel.forEach(function (w, i) { var v = r[i] == null ? "" : String(r[i]).trim(); if (!w || v === "") return; if (w.indexOf("w:") === 0) z.werte[w.slice(2)] = v; else z[w] = v; });
        if (z.status) { var st = Object.keys(T.st).find(function (k) { return NORM(T.st[k]) === NORM(z.status) || k === NORM(z.status); }); z.status = st || "vorhanden"; }
        return z;
      }).filter(function (z) { return z.name || Object.keys(z.werte).length; });
      var gesamt = 0;
      for (var i = 0; i < zeilen.length; i += 200) (function (teil) {
        schritt = schritt.then(function () { return api("/sammlungen/" + s.id + "/import", { method: "POST", body: { zeilen: teil } }); }).then(function (r) { gesamt += r.neu; });
      })(zeilen.slice(i, i + 200));
      schritt.then(function () {
        toast(gesamt + " " + T.importiert); S.akt = null; d.close(); sammlung(s.id);
      }, function (e) { knopf.disabled = false; if (!e.grenze) toast(T.fehler, true); S.akt = null; });
    };
  }

  /* ---------- Sammlung einstellen ---------- */
  W.sammlung.onclick = function () {
    var s = S.akt.sammlung, v = S.start.vorlagen, d, t;
    function speichern(b, neuZeichnen) {
      api("/sammlungen/" + s.id, { method: "PATCH", body: b }).then(function (neu) { Object.assign(s, neu); toast(T.gespeichert); if (neuZeichnen) zeichnen(); }).catch(function () { toast(T.fehler, true); });
    }
    function spaeter(b) { clearTimeout(t); t = setTimeout(function () { speichern(b); }, 700); }
    function zeichnen() {
      d.querySelector(".inhalt").innerHTML =
        '<div class="feld"><label for="e-name">' + esc(T.name) + '</label><input id="e-name" value="' + esc(s.name) + '"></div>' +
        '<div class="reihe"><div class="feld"><label for="e-vorlage">' + esc(T.vorlage) + '</label><select id="e-vorlage">' + Object.keys(v).map(function (k) { return '<option value="' + k + '"' + (s.vorlage === k ? " selected" : "") + ">" + v[k].icon + " " + esc(v[k][L]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="feld klein"><label for="e-praefix">' + esc(T.praefix) + '</label><input id="e-praefix" value="' + esc(s.praefix) + '" maxlength="6"></div></div>' +
        "<h3>" + esc(T.daten) + '</h3><div class="reihe knoepfe"><a class="knopf leise" href="/api/sammlungen/' + s.id + '/export.csv" download>⬇ ' + esc(T.export) + '</a><button type="button" class="knopf leise" id="i-datei">⬆ ' + esc(T.import) + '</button></div><div id="i-zuordnung"></div>' +
        "<h3>" + esc(T.felder) + '</h3><ul class="feldliste">' + s.felder.map(function (f, i) {
          return '<li data-i="' + i + '" draggable="true"><span class="griff" aria-hidden="true">⋮⋮</span><input value="' + esc(feldName(f)) + '" aria-label="' + esc(T.name) + '">' +
            '<select aria-label="Typ">' + Object.keys(T.typ).map(function (k) { return '<option value="' + k + '"' + (f.typ === k ? " selected" : "") + ">" + esc(T.typ[k]) + "</option>"; }).join("") + "</select>" +
            '<label class="schalter"><input type="checkbox" data-x="an"' + (f.aus ? "" : " checked") + "> " + esc(T.an) + '</label><label class="schalter"><input type="checkbox" data-x="oeff"' + (f.oeffentlich ? " checked" : "") + "> 👁 " + esc(T.oeff) + "</label></li>";
        }).join("") + '</ul><button type="button" class="knopf leise" id="e-feld">＋ ' + esc(T.feldNeu) + '</button><hr><button type="button" class="knopf gefahr" id="e-weg">' + esc(T.sammlungLoeschen) + "</button>";
      d.querySelector("#e-name").oninput = function (e) { spaeter({ name: e.target.value }); };
      d.querySelector("#e-praefix").oninput = function (e) { spaeter({ praefix: e.target.value }); };
      importStarten(d);
      d.querySelector("#e-vorlage").onchange = function (e) { speichern({ vorlage: e.target.value }, true); };
      [].forEach.call(d.querySelectorAll(".feldliste li"), function (li) {
        var f = s.felder[+li.dataset.i];
        li.querySelector("input").oninput = function (e) { f[L] = e.target.value; if (f.eigen) f[L === "en" ? "de" : "en"] = f[L === "en" ? "de" : "en"] || e.target.value; spaeter({ felder: s.felder }); };
        li.querySelector("select").onchange = function (e) { f.typ = e.target.value; speichern({ felder: s.felder }); };
        li.querySelector('[data-x="an"]').onchange = function (e) { f.aus = !e.target.checked; speichern({ felder: s.felder }); };
        li.querySelector('[data-x="oeff"]').onchange = function (e) { f.oeffentlich = e.target.checked; speichern({ felder: s.felder }); };
      });
      ziehbar(d.querySelector(".feldliste"), function (reihenfolge) { s.felder = reihenfolge.map(function (i) { return s.felder[i]; }); speichern({ felder: s.felder }, true); });
      d.querySelector("#e-feld").onclick = function () {
        var ids = s.felder.map(function (f) { return f.id; }), n = 1; while (ids.indexOf("feld" + n) >= 0) n++;
        s.felder.push({ id: "feld" + n, de: "Feld " + n, en: "Field " + n, typ: "text", oeffentlich: false, aus: false, eigen: true });
        speichern({ felder: s.felder }, true);
      };
      d.querySelector("#e-weg").onclick = function () {
        var antwort = prompt(T.loeschenFrage);
        if (antwort == null || antwort.trim() !== s.name.trim()) return;
        api("/sammlungen/" + s.id, { method: "DELETE" }).then(function () { S.akt = null; d.close(); location.hash = "#/"; });
      };
    }
    d = dialog(T.einstellungen, "", function () { if (S.akt) { document.title = s.name + " · Inventar"; zeichneSammlung(); } });
    zeichnen();
  };

  // Zeilen per Griff ziehen (Maus, Finger, Stift) – nie Pfeile (Grundsatz 10)
  function ziehbar(ul, fertig) {
    var drag = null;
    ul.addEventListener("pointerdown", function (e) {
      var g = e.target.closest(".griff"); if (!g) return;
      drag = g.closest("li"); drag.classList.add("zieht"); ul.setPointerCapture(e.pointerId); e.preventDefault();
    });
    ul.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var ueber = document.elementFromPoint(e.clientX, e.clientY); ueber = ueber && ueber.closest("li");
      if (!ueber || ueber === drag || ueber.parentNode !== ul) return;
      var r = ueber.getBoundingClientRect();
      ul.insertBefore(drag, e.clientY < r.top + r.height / 2 ? ueber : ueber.nextSibling);
    });
    function ende() {
      if (!drag) return; drag.classList.remove("zieht"); drag = null;
      fertig([].map.call(ul.children, function (li) { return +li.dataset.i; }));
    }
    ul.addEventListener("pointerup", ende); ul.addEventListener("pointercancel", ende);
    [].forEach.call(ul.querySelectorAll("li"), function (li) { li.removeAttribute("draggable"); });
  }

  /* ---------- Router ---------- */
  function route() {
    var h = location.hash || "#/", teile = h.split("?"), pfad = teile[0], q = new URLSearchParams(teile[1] || "");
    var m;
    var bereit = S.start ? Promise.resolve() : api("/start").then(function (j) { S.start = j; });
    bereit.then(function () {
      if ((m = pfad.match(/^#\/s\/([A-Za-z0-9_-]+)\/g\/([A-Za-z0-9_-]+)$/))) return gegenstand(m[1], m[2]);
      if ((m = pfad.match(/^#\/s\/([A-Za-z0-9_-]+)$/))) return sammlung(m[1], q.has("ort") ? q.get("ort") : null);
      // Erster Aufruf ohne Hash und nur eine Sammlung → direkt hinein (sofort bearbeiten); „#/“ zeigt immer die Übersicht
      var direkt = !location.hash && S.start.sammlungen.length === 1;
      S.start = null; S.akt = null; return start(direkt);
    }).catch(function (e) { if (String(e.message) !== "401") app.innerHTML = '<p class="leer">' + esc(T.fehler) + "</p>"; });
  }
  window.addEventListener("hashchange", route);
  route();
})();
