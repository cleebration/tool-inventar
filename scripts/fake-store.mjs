// Nachgebauter cleebration store – nur für lokale Tests (npm run test). Antwortet wie die Store-API, die das Kit nutzt.
// Konto wählen: GET /test/als?konto=chris|chrisnate  ·  Mitschnitt: GET /test/log
import http from "node:http";

const KONTEN = {
  chris: { konto_id: "k_chris", email: "chris@cleebration.com", name: "chris", rollen: [{ bereich: "alle", rolle: "inhaber" }], freischaltungen: {} },
  chrisnate: { konto_id: "k_chrisnate", email: "chris@renateleeb.photos", name: "chrisnate", rollen: [], freischaltungen: {} },
};
let als = "chrisnate";
const codes = new Map();
const log = [];
let werte = { sammlungen_frei: 3, gegenstaende_frei: 250, fotos_frei: 5, fotos_plus: 20 };
const gesperrt = new Set();

const port = +(process.env.PORT || 8788);
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  for await (const c of req) body += c;
  const j = body ? (() => { try { return JSON.parse(body); } catch { return body; } })() : null;
  const send = (s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  if (url.pathname.startsWith("/api/") && req.headers.authorization !== "Bearer test-schluessel") return send(401, { fehler: "schluessel" });
  log.push({ m: req.method, p: url.pathname + url.search, b: j });

  if (url.pathname === "/test/als") { als = url.searchParams.get("konto"); return send(200, { als }); }
  if (url.pathname === "/test/log") return send(200, log);
  if (url.pathname === "/test/werte") { werte = { ...werte, ...j }; return send(200, werte); }
  if (url.pathname === "/test/sperren") { gesperrt.add(url.searchParams.get("s")); return send(200, {}); }
  if (url.pathname === "/anmelden-fuer") {
    const code = "c" + Math.random().toString(36).slice(2);
    codes.set(code, als);
    res.writeHead(302, { Location: `${url.searchParams.get("zurueck")}?code=${code}&state=${encodeURIComponent(url.searchParams.get("state"))}` });
    return res.end();
  }
  if (url.pathname === "/api/v1/anmeldung/einloesen") {
    const k = KONTEN[codes.get(j.code)];
    if (!k) return send(400, { fehler: "code" });
    codes.delete(j.code);
    return send(200, { ...k, werte });
  }
  let m = url.pathname.match(/^\/api\/v1\/konto\/([^/]+)\/freischaltungen$/);
  if (m) { const k = Object.values(KONTEN).find(x => x.konto_id === m[1]); return send(200, { name: k.name, freischaltungen: k.freischaltungen, werte }); }
  if (url.pathname === "/api/v1/produkt/werte") return send(200, { werte });
  if (/^\/api\/v1\/konto\/[^/]+\/inhalte$/.test(url.pathname)) return send(200, { ok: true });
  if (url.pathname === "/api/v1/ereignis") return send(200, { ok: true });
  if (url.pathname === "/api/v1/meldung") return send(200, { ok: true });
  if (url.pathname === "/api/v1/gesperrt") return send(200, { schluessel: [...gesperrt] });
  if (url.pathname === "/api/v1/geloeschte-konten") return send(200, { konten: [], bis: 0 });
  send(404, { fehler: "unbekannt " + url.pathname });
}).listen(port, () => console.log("fake-store auf " + port));
