// cleebration-kit · Server-Teil für jedes Tool im cleebration store (Tool-Grundsätze 6–12)
// Eine Datei, keine Abhängigkeiten. Wird in jedes Tool-Repo kopiert (src/cleebration-kit.js) –
// nie im Tool ändern, sondern hier ändern und mit kit-verteilen.command in alle Tools bringen.
// Der Kachel-Check im Store prüft KIT_VERSION über GET /kit/version.
//
// Einbau (Worker, ohne Framework):
//   import { kit } from "./cleebration-kit.js";
//   const k = kit({ tool: "einladung", env });          // env.DB (D1) oder env.KIT_KV (KV), Secret env.STORE_SCHLUESSEL
//   const antwort = await k.route(request);             // /anmelden, /anmelden/zurueck, /abmelden, /kit/version, /kit/ich
//   if (antwort) return antwort;
//   const se = await k.sitzung(request);                // null = nicht angemeldet; frisch aus dem Store (≤ 5 Min.)
//   if (!se) return k.zurAnmeldung(request);            // Grundsatz 6: erst anmelden + Name, dann nutzen
//   if (!se.name) return k.zurNamenswahl(request);
//   k.darf(se, "plus"); (await k.werte()).gaeste_frei;  // Sets und Grenzwerte aus dem Store (/admin/sets)
//   await k.inhalt(se, { schluessel, titel, url, bearbeiten, oeffentlich });   // „Meine Sachen“
//   await k.ereignis(se, "geteilt");                    // Nutzung + Analytics (Store wählt danach evtl. einen Tipp)
//   await k.melden({ schluessel, url, grund, text });   // Besucher meldet Inhalt → Meldungen-Inbox im Store
//   scheduled: ctx.waitUntil(k.aufraeumen(async kontoId => { /* Inhalte dieses Kontos löschen */ }));
//
// Sitzungen (D1, Migration kit_sitzungen.sql) oder KV (Schlüssel kit:s:<hash>).

export const KIT_VERSION = 1;
const STORE = "https://store.cleebration.com";
const RANG = { inhaber: 4, admin: 3, moderation: 2, support: 1 };
const TTL = 30 * 24 * 3600;
const FRISCH = 300; // Sekunden, wie oft Name/Sets/Sperre neu aus dem Store kommen

export const SICHERHEIT = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/* ---------- kleine Helfer (auch für das Tool nutzbar) ---------- */

export const jetzt = () => Math.floor(Date.now() / 1000);
export const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export async function sha256Hex(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
export function zufall(n = 32) {
  const a = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function cookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
export const setCookie = (n, v, age) => `${n}=${encodeURIComponent(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SICHERHEIT, ...extra } });
}
// Nur Pfade im eigenen Tool als Rücksprung (inkl. Query), nie //fremd
export const nurIntern = z => (typeof z === "string" && /^\/(?!\/)[A-Za-z0-9\-/?=&_.%~+#:,]*$/.test(z) ? z : "/");
export function sprache(request) {
  const c = cookie(request, "cleeb_lang");
  if (c === "de" || c === "en") return c;
  return /^en\b/i.test(request.headers.get("Accept-Language") || "") ? "en" : "de";
}

const T = {
  de: {
    abgebrochen: ["Anmeldung abgebrochen", "Die Anmeldung ist abgelaufen oder wurde in einem anderen Fenster gestartet. Bitte nochmal versuchen."],
    fehlgeschlagen: ["Anmeldung fehlgeschlagen", "Der cleebration store hat die Anmeldung nicht bestätigt"],
    gesperrt: ["Konto gesperrt", "Dieses cleebration-Konto ist gesperrt."],
    nochmal: "Nochmal anmelden", zumStore: "Zum Store",
    gruende: { schluessel: "Tool-Schlüssel fehlt", abgelehnt: "Tool-Schlüssel wird nicht angenommen", status: "Store antwortet", weg: "Store nicht erreichbar" },
  },
  en: {
    abgebrochen: ["Sign-in cancelled", "The sign-in expired or was started in another window. Please try again."],
    fehlgeschlagen: ["Sign-in failed", "The cleebration store did not confirm the sign-in"],
    gesperrt: ["Account blocked", "This cleebration account is blocked."],
    nochmal: "Sign in again", zumStore: "To the store",
    gruende: { schluessel: "tool key missing", abgelehnt: "tool key not accepted", status: "store answered", weg: "store unreachable" },
  },
};

// Einheitliche Hinweisseite – folgt hell/dunkel, nutzt die Leiste (Aussehen gilt überall)
export function hinweisSeite({ tool, titel, text, link = "/", linktext = "OK", status = 400, lang = "de" }) {
  return new Response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title>
<script src="${STORE}/leiste.js" defer></script>
<style>:root{--bg:#f3f4f7;--fg:#15171c;--karte:rgba(255,255,255,.72);--akzent:#d0473a}@media(prefers-color-scheme:dark){:root{--bg:#101217;--fg:#eef0f4;--karte:rgba(30,33,40,.72)}}
html[data-cleeb-ton=hell]{--bg:#f3f4f7;--fg:#15171c;--karte:rgba(255,255,255,.72)}html[data-cleeb-ton=dunkel]{--bg:#101217;--fg:#eef0f4;--karte:rgba(30,33,40,.72)}
body{margin:0;font:16px/1.5 system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg);min-height:100vh}
main{display:grid;place-items:center;min-height:calc(100vh - 48px);padding:16px}.k{max-width:440px;padding:24px 28px;border-radius:22px;background:var(--cleeb-glas,var(--karte));backdrop-filter:blur(18px);box-shadow:0 8px 32px rgba(0,0,0,.12)}
h1{font-size:1.3rem;margin:0 0 8px}a.b{display:inline-block;margin-top:14px;padding:10px 18px;border-radius:999px;background:var(--akzent);color:#fff;text-decoration:none;font-weight:700}</style>
<body><cleebration-leiste tool="${esc(tool)}" lang="${lang}"></cleebration-leiste><main><div class="k"><h1>${esc(titel)}</h1><p>${esc(text)}</p><a class="b" href="${esc(link)}">${esc(linktext)}</a></div></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...SICHERHEIT } });
}

/* ---------- Sitzungs-Speicher: D1 oder KV ---------- */

function speicher(env) {
  if (env.DB) {
    const db = env.DB;
    return {
      async lesen(h) {
        const r = await db.prepare("SELECT * FROM kit_sitzungen WHERE id_hash = ?1 AND ablauf > ?2").bind(h, jetzt()).first();
        return r ? { ...r, frei: JSON.parse(r.frei || "{}"), werte: JSON.parse(r.werte || "{}"), rollen: JSON.parse(r.rollen || "[]"), teams: JSON.parse(r.teams || "[]") } : null;
      },
      async schreiben(h, s) {
        await db.prepare(`INSERT OR REPLACE INTO kit_sitzungen (id_hash, konto_id, email, name, frei, werte, rollen, teams, erstellt, ablauf, geprueft)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
          .bind(h, s.konto_id, s.email, s.name || null, JSON.stringify(s.frei || {}), JSON.stringify(s.werte || {}), JSON.stringify(s.rollen || []), JSON.stringify(s.teams || []), s.erstellt, s.ablauf, s.geprueft).run();
      },
      async loeschen(h) { await db.prepare("DELETE FROM kit_sitzungen WHERE id_hash = ?1").bind(h).run(); },
      async kontoLoeschen(k) { await db.prepare("DELETE FROM kit_sitzungen WHERE konto_id = ?1").bind(k).run(); },
      async aufraeumen() { await db.prepare("DELETE FROM kit_sitzungen WHERE ablauf < ?1").bind(jetzt()).run(); },
      async merken(k, v) { await db.prepare("INSERT OR REPLACE INTO kit_merker (schluessel, wert) VALUES (?1, ?2)").bind(k, String(v)).run(); },
      async merker(k) { const r = await db.prepare("SELECT wert FROM kit_merker WHERE schluessel = ?1").bind(k).first(); return r ? r.wert : null; },
    };
  }
  if (env.KIT_KV) {
    const kv = env.KIT_KV;
    return {
      async lesen(h) { const s = await kv.get("kit:s:" + h, "json"); return s && s.ablauf > jetzt() ? s : null; },
      async schreiben(h, s) { await kv.put("kit:s:" + h, JSON.stringify(s), { expirationTtl: Math.max(60, s.ablauf - jetzt()) }); },
      async loeschen(h) { await kv.delete("kit:s:" + h); },
      async kontoLoeschen() { /* KV läuft von selbst ab; Sperre greift beim nächsten Auffrischen */ },
      async aufraeumen() {},
      async merken(k, v) { await kv.put("kit:m:" + k, String(v)); },
      async merker(k) { return kv.get("kit:m:" + k); },
    };
  }
  throw new Error("cleebration-kit: env.DB (D1) oder env.KIT_KV (KV) fehlt");
}

/* ---------- das Kit ---------- */

export function kit({ tool, env, produkt = tool, cookieName = "cleeb_" + tool.replace(/[^a-z0-9]/g, "") }) {
  if (!tool) throw new Error("cleebration-kit: tool fehlt");
  const storeUrl = env.STORE_URL || STORE;
  const sp = speicher(env);
  const stateName = cookieName + "_state";
  let werteCache = null, werteZeit = 0;

  async function store(pfad, opts = {}) {
    if (!env.STORE_SCHLUESSEL) { const e = new Error("STORE_SCHLUESSEL fehlt"); e.status = 0; throw e; }
    const r = await (env.STORE_FETCH || fetch)(storeUrl + pfad, {
      method: opts.method || "GET",
      headers: { Authorization: "Bearer " + env.STORE_SCHLUESSEL, "Content-Type": "application/json", "X-Kit-Version": String(KIT_VERSION) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.fehler || "Store " + r.status); e.status = r.status; throw e; }
    return j;
  }

  async function sitzung(request) {
    const sid = cookie(request, cookieName);
    if (!sid) return null;
    const h = await sha256Hex(sid);
    let se = await sp.lesen(h);
    if (!se) return null;
    if (se.geprueft > jetzt() - FRISCH && se.name) return se;
    try {
      const j = await store(`/api/v1/konto/${encodeURIComponent(se.konto_id)}/freischaltungen?produkt=${encodeURIComponent(produkt)}`);
      if (j.gesperrt) { await sp.loeschen(h); return null; }
      se = { ...se, name: j.name || se.name || null, frei: j.freischaltungen || {}, werte: j.werte || se.werte || {}, geprueft: jetzt() };
      await sp.schreiben(h, se);
    } catch (e) { console.error("kit auffrischen", e.status, e.message); }
    return se;
  }

  function anmelden(request, url) {
    const state = zufall(24);
    const ziel = nurIntern(url.searchParams.get("zurueck"));
    const to = `${storeUrl}/anmelden-fuer?tool=${encodeURIComponent(tool)}&zurueck=${encodeURIComponent(url.origin + "/anmelden/zurueck")}&state=${encodeURIComponent(state)}`;
    const h = new Headers({ Location: to, "Cache-Control": "no-store" });
    h.append("Set-Cookie", setCookie(stateName, state + "|" + ziel, 900));
    return new Response(null, { status: 302, headers: h });
  }

  async function zurueck(request, url) {
    const lang = sprache(request), t = T[lang];
    const code = url.searchParams.get("code") || "", state = url.searchParams.get("state") || "";
    const roh = cookie(request, stateName), i = roh.indexOf("|");
    const soll = i > 0 ? roh.slice(0, i) : "", ziel = i > 0 ? roh.slice(i + 1) : "/";
    if (!code || !state || !soll || state !== soll)
      return hinweisSeite({ tool, titel: t.abgebrochen[0], text: t.abgebrochen[1], link: "/anmelden", linktext: t.nochmal, lang });
    let k;
    try { k = await store("/api/v1/anmeldung/einloesen", { method: "POST", body: { code } }); }
    catch (e) {
      const g = !env.STORE_SCHLUESSEL ? t.gruende.schluessel : e.status === 401 ? t.gruende.abgelehnt : e.status ? `${t.gruende.status} ${e.status}` : t.gruende.weg;
      return hinweisSeite({ tool, titel: t.fehlgeschlagen[0], text: `${t.fehlgeschlagen[1]} (${g}).`, link: "/anmelden", linktext: t.nochmal, status: 502, lang });
    }
    if (k.gesperrt) return hinweisSeite({ tool, titel: t.gesperrt[0], text: t.gesperrt[1], link: storeUrl, linktext: t.zumStore, status: 403, lang });
    const sid = zufall(32);
    await sp.schreiben(await sha256Hex(sid), {
      konto_id: k.konto_id, email: k.email, name: k.name || null, frei: k.freischaltungen || {}, werte: k.werte || {},
      rollen: k.rollen || [], teams: k.teams || [], erstellt: jetzt(), ablauf: jetzt() + TTL, geprueft: jetzt(),
    });
    // Den Namen erzwingt schon der Store (/anmelden-fuer → /name), bevor er den Code ausgibt
    const h = new Headers({ Location: url.origin + nurIntern(ziel), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    h.append("Set-Cookie", setCookie(cookieName, sid, TTL));
    h.append("Set-Cookie", setCookie(stateName, "", 0));
    return new Response(null, { status: 302, headers: h });
  }

  async function abmelden(request, url) {
    const sid = cookie(request, cookieName);
    if (sid) await sp.loeschen(await sha256Hex(sid));
    const h = new Headers({ Location: `${storeUrl}/abmelden?zurueck=${encodeURIComponent(url.origin + "/")}`, "Cache-Control": "no-store", "Clear-Site-Data": '"storage"' });
    h.append("Set-Cookie", setCookie(cookieName, "", 0));
    return new Response(null, { status: 302, headers: h });
  }

  const k = {
    tool, produkt, version: KIT_VERSION, store, sitzung,

    // Übernimmt die Standard-Routen; gibt null zurück, wenn die Anfrage dem Tool gehört
    async route(request) {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/anmelden": return anmelden(request, url);
        case "/anmelden/zurueck": return zurueck(request, url);
        case "/abmelden": return abmelden(request, url);
        case "/kit/version": return json(200, { tool, produkt, kit: KIT_VERSION });
        case "/kit/ich": {
          const se = await sitzung(request);
          if (!se) return json(200, { angemeldet: false, anmelden: "/anmelden" });
          return json(200, { angemeldet: true, konto_id: se.konto_id, name: se.name, frei: se.frei, werte: se.werte, rollen: se.rollen, teams: se.teams });
        }
      }
      return null;
    },

    zurAnmeldung(request) {
      const url = new URL(request.url);
      return Response.redirect(url.origin + "/anmelden?zurueck=" + encodeURIComponent(url.pathname + url.search), 302);
    },
    // Alte Sitzung ohne Namen: neu über den Store anmelden – der verlangt den Namen und kommt zurück
    zurNamenswahl(request) { return k.zurAnmeldung(request); },

    // Prüft Herkunft für schreibende API-Aufrufe aus dem Browser (gegen fremde Seiten)
    herkunftOk(request) {
      if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
      const o = request.headers.get("Origin");
      return !o || o === new URL(request.url).origin;
    },

    darf: (se, set) => !!se && !!(se.frei && (se.frei[set] || se.frei.alle)),
    hatRolle: (se, mind) => !!se && (se.rollen || []).some(r => (r.bereich === "alle" || r.bereich === "tool:" + tool) && (RANG[r.rolle] || 0) >= RANG[mind]),

    // Grenzwerte je Produkt (Admin → Gratis oder bezahlt). rueckfall = Werte, wenn der Store schweigt
    async werte(rueckfall = {}) {
      if (werteCache && Date.now() - werteZeit < 300000) return { ...rueckfall, ...werteCache };
      try { const j = await store("/api/v1/produkt/werte"); werteCache = j.werte || {}; werteZeit = Date.now(); }
      catch (e) { console.error("kit werte", e.status, e.message); werteZeit = Date.now() - 240000; werteCache = werteCache || {}; }
      return { ...rueckfall, ...werteCache };
    },

    // „Meine Sachen“: Fehler blockieren nie das Tool
    async inhalt(se, { schluessel, titel, url, bearbeiten, oeffentlich = false }) {
      if (!se) return;
      try { await store(`/api/v1/konto/${encodeURIComponent(se.konto_id)}/inhalte`, { method: "PUT", body: { schluessel: String(schluessel), titel: String(titel || "").slice(0, 160), url, bearbeiten, oeffentlich } }); }
      catch (e) { console.error("kit inhalt", schluessel, e.status, e.message); }
    },
    async inhaltWeg(se, schluessel) {
      if (!se) return;
      try { await store(`/api/v1/konto/${encodeURIComponent(se.konto_id)}/inhalte?schluessel=${encodeURIComponent(schluessel)}`, { method: "DELETE" }); }
      catch (e) { console.error("kit inhalt weg", schluessel, e.status, e.message); }
    },

    // Ereignis: zählt Nutzung (Konto) + Analytics (anonym). se = null für Besucher
    async ereignis(se, name, { anzahl = 1 } = {}) {
      try { await store("/api/v1/ereignis", { method: "POST", body: { ereignis: String(name).slice(0, 40), konto_id: se ? se.konto_id : null, anzahl } }); }
      catch (e) { console.error("kit ereignis", name, e.status, e.message); }
    },

    // Besucher meldet einen Inhalt → Meldungen-Inbox im Store (Moderation zentral)
    async melden({ schluessel, url, grund = "sonstiges", text = "", von = null }) {
      return store("/api/v1/meldung", { method: "POST", body: { schluessel: String(schluessel), url, grund: String(grund).slice(0, 40), text: String(text).slice(0, 1000), von } });
    },

    // Moderation aus dem Store: welche Inhalte dieses Tools sind gesperrt?
    async gesperrteInhalte() {
      try { const j = await store("/api/v1/gesperrt"); return new Set(j.schluessel || []); }
      catch (e) { console.error("kit gesperrt", e.status, e.message); return new Set(); }
    },

    // Nachts: abgelaufene Sitzungen weg + gelöschte Konten im Tool löschen (DSGVO)
    async aufraeumen(kontoGeloescht) {
      await sp.aufraeumen();
      if (typeof kontoGeloescht !== "function") return 0;
      const seit = +(await sp.merker("geloescht_seit")) || 0;
      let n = 0;
      try {
        const j = await store(`/api/v1/geloeschte-konten?seit=${seit}`);
        for (const x of j.konten || []) { await kontoGeloescht(x.konto_id); await sp.kontoLoeschen(x.konto_id); n++; }
        if (j.bis) await sp.merken("geloescht_seit", j.bis);
      } catch (e) { console.error("kit geloeschte konten", e.status, e.message); }
      return n;
    },

    // Antworten mit Sicherheits-Headern versehen (z. B. für ASSETS)
    sicher(response, { html = false } = {}) {
      const h = new Headers(response.headers);
      for (const [a, b] of Object.entries(SICHERHEIT)) h.set(a, b);
      if (html) h.set("Cache-Control", "no-store");
      return new Response(response.body, { status: response.status, headers: h });
    },
  };
  return k;
}
