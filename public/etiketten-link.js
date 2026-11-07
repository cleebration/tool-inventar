/* Tool Inventar · Übergabe an Tool Etiketten (Leitstand-Auftrag 44, „ok Kartons über Inventar“ 2026-11-07)
 * Karton-Daten bleiben NUR hier im Inventar. Etiketten druckt nur die Aufkleber.
 * Übergabe im Browser, ohne Tool-zu-Tool-Server: Liste als base64url-JSON im #-Teil der Adresse
 *   https://etiketten.cleebration.com/#inventar=<…>   (der #-Teil wird nie an einen Server geschickt)
 * Inhalt Version 1: { v:1, quelle:"inventar", titel, eintraege:[{ nr, name, ort, link }] } – link = QR-Adresse ins Inventar.
 * Gegenstück: tool-etiketten public/kern/karton.mjs (kartonLesen). Höchstens 500 Einträge (Etiketten nimmt nicht mehr). */
(function (g) {
  "use strict";
  var ETIKETTEN = "https://etiketten.cleebration.com/", MAX = 500;
  function b64url(text) {
    var bytes = new TextEncoder().encode(text), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function etikettenLink(titel, eintraege, basis) {
    var liste = (eintraege || []).slice(0, MAX).map(function (e) {
      return { nr: String(e.nr || ""), name: String(e.name || ""), ort: String(e.ort || ""), link: String(e.link || "") };
    });
    return (basis || ETIKETTEN) + "#inventar=" + b64url(JSON.stringify({ v: 1, quelle: "inventar", titel: String(titel || ""), eintraege: liste }));
  }
  g.etikettenLink = etikettenLink;
  g.etikettenLink.MAX = MAX;
})(typeof window !== "undefined" ? window : globalThis);
