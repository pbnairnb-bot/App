// Imports real New Zealand map data from OpenStreetMap through the Overpass API.
//   ?kind=stations (default): every fuel station — name, brand, location, address, fuels sold where mapped. NO prices.
//   ?kind=places: suburbs, towns and cities, so shoppers can choose their area by name.
// Data © OpenStreetMap contributors, licensed under the ODbL (attribution shown in the app).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
// NZ split into regional boxes (south,west,north,east): small queries finish reliably and never come back partial.
const TILES: [number, number, number, number][] = [
  [-36.0, 172.5, -34.3, 174.95], [-37.4, 174.0, -36.0, 175.6], [-39.0, 174.4, -37.4, 178.6], [-41.7, 173.9, -39.0, 178.6],
  [-43.0, 170.8, -40.4, 174.5], [-44.8, 168.0, -43.0, 173.4], [-47.4, 166.3, -44.8, 171.6], [-44.5, -177.0, -43.5, -176.0],
];
const tileQuery = (kind: string, [s, w, n, e]: number[]) => kind === "stations"
  ? `[out:json][timeout:90];(node[amenity=fuel](${s},${w},${n},${e});way[amenity=fuel](${s},${w},${n},${e}););out center tags;`
  : `[out:json][timeout:90];node[place~"^(city|town|suburb|village|quarter)$"][name](${s},${w},${n},${e});out tags;`;
const SERVERS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const yes = (v?: string) => !!v && v !== "no";

async function overpass(q: string) {
  const errors: string[] = [];
  for (const url of SERVERS) {
    try {
      const r = await fetch(url, {
        method: "POST", body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "PriceMatchNZ/1.0 (+https://github.com/pbnairnb-bot/App)" },
      });
      if (!r.ok) { errors.push(`${url} ${r.status}`); continue; }
      const body = await r.json();
      // Overpass reports timeouts and memory limits in "remark" while still returning 200 with partial data.
      if (body.remark && /error|timed out|out of memory/i.test(body.remark)) { errors.push(`${url} partial: ${body.remark}`); continue; }
      return { elements: body.elements as any[], server: url, errors };
    } catch (e) { errors.push(`${url} ${e}`); }
  }
  return { elements: null, server: null, errors };
}

Deno.serve(async (req: Request) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: settings } = await db.rpc("import_settings");
  if (!settings || req.headers.get("x-import-key") !== settings.key) return json({ error: "unauthorised" }, 401);
  const params = new URL(req.url).searchParams;
  const kind = params.get("kind") === "places" ? "places" : "stations";
  // One region per call (?tile=0..7) keeps each request well inside the edge runtime's time limit.
  const tileIdx = Number(params.get("tile") ?? "-1");
  if (!(tileIdx >= 0 && tileIdx < TILES.length)) return json({ error: "pass ?tile=0..7", tiles: TILES.length }, 400);
  // Optional ?part=0..3 splits the region into quarters for busy areas (Auckland, Waikato).
  const part = params.get("part");
  let box = TILES[tileIdx];
  if (part != null) {
    const p = Number(part); const [s0, w0, n0, e0] = box; const mLat = (s0 + n0) / 2, mLng = (w0 + e0) / 2;
    box = [[s0, w0, mLat, mLng], [s0, mLng, mLat, e0], [mLat, w0, n0, mLng], [mLat, mLng, n0, e0]][p] as [number, number, number, number];
    if (!box) return json({ error: "part must be 0..3" }, 400);
  }
  const source = `osm-${kind}-${tileIdx}${part != null ? `-${part}` : ""}`;

  const elements: any[] = []; const errors: string[] = []; let server: string | null = null;
  for (const t of [box]) {
    const res = await overpass(tileQuery(kind, t));
    errors.push(...res.errors);
    if (!res.elements) {
      await db.from("source_status").upsert({ source, ok: false, checked_at: new Date().toISOString(), message: `tile ${t.join(",")} failed: ${res.errors.join("; ")}`.slice(0, 500) });
      return json({ error: "Overpass unavailable", tile: t, errors }, 502);
    }
    elements.push(...res.elements); server = res.server;
  }
  const seenIds = new Set<string>();
  for (let i = elements.length - 1; i >= 0; i--) { const k = `${elements[i].type}-${elements[i].id}`; if (seenIds.has(k)) elements.splice(i, 1); else seenIds.add(k); }
  const now = new Date().toISOString();
  let rows: any[];
  if (kind === "stations") {
    rows = elements.map((e) => {
      const t = e.tags ?? {}; const lat = e.lat ?? e.center?.lat; const lng = e.lon ?? e.center?.lon;
      if (lat == null || lng == null) return null;
      const fuels = [yes(t["fuel:octane_91"]) && "91", yes(t["fuel:octane_95"]) && "95", yes(t["fuel:octane_98"]) && "98", (yes(t["fuel:diesel"]) || yes(t["fuel:GTL_diesel"])) && "diesel"].filter(Boolean);
      return {
        id: `osm-${e.type}-${e.id}`, name: t.name ?? null, brand: t.brand ?? null, operator: t.operator ?? null, lat, lng,
        street: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null, suburb: t["addr:suburb"] ?? null,
        city: t["addr:city"] ?? null, postcode: t["addr:postcode"] ?? null, fuels, opening_hours: t.opening_hours ?? null,
        source: "OpenStreetMap contributors (ODbL)", source_ref: `https://www.openstreetmap.org/${e.type}/${e.id}`, updated_at: now,
      };
    }).filter(Boolean);
  } else {
    rows = elements.filter((e) => e.tags?.name && e.lat != null).map((e) => ({
      id: `osm-node-${e.id}`, name: e.tags.name, kind: e.tags.place, lat: e.lat, lng: e.lon,
      region: e.tags["is_in:region"] ?? e.tags["is_in"] ?? null, population: Number(e.tags.population) || null, updated_at: now,
    }));
  }
  const table = kind === "stations" ? "fuel_stations" : "places";
  let saved = 0; const upErr: string[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict: "id" });
    if (error) upErr.push(error.message); else saved += Math.min(500, rows.length - i);
  }
  await db.from("source_status").upsert({ source, ok: !upErr.length, checked_at: now, rows: saved, message: upErr.join("; ").slice(0, 500) || `via ${server}` });
  const brands: Record<string, number> = {};
  if (kind === "stations") rows.forEach((r: any) => { const b = r.brand ?? "(no brand)"; brands[b] = (brands[b] ?? 0) + 1; });
  return json({ kind, tile: tileIdx, found: elements.length, saved, errors: upErr, server, brands });
});
