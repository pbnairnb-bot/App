// Supermarket, pharmacy and pet-store prices from Baskt's public API (https://baskt.nz/developers).
// Baskt's terms allow querying /api/v1/* for "integration into consumer-facing tools", forbid bulk
// re-publishing, and ask that it isn't presented as authoritative checkout pricing. So this function:
//   - queries on demand (no bulk copy), caches each answer for 6 hours, and caps upstream calls per minute;
//   - returns prices as "last observed" with the observation time, never as live checkout prices;
//   - only groups products across stores when they're the same item (same barcode, or same brand,
//     name and pack size), so different sizes or variants are never compared.
// GET ?q=<text>&lat=&lng=   ->  { products: [...], source, chainsSearched, chainsFailed }
// GET ?collect=1 (server key) ->  stores the next due everyday-product term in retail_items / retail_offers / retail_observations
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://baskt.nz/api/v1";
const UA = { "User-Agent": "PriceMatchNZ/1.0 (+https://github.com/pbnairnb-bot/App)", Accept: "application/json" };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
const CHAIN_NAMES: Record<string, string> = {
  countdown: "Woolworths", paknsave: "PAK'nSAVE", "new-world": "New World", freshchoice: "FreshChoice", supervalue: "SuperValue",
  farro: "Farro", "the-warehouse": "The Warehouse", warehouse: "The Warehouse", "bargain-chemist": "Bargain Chemist",
  "life-pharmacy": "Life Pharmacy", unichem: "Unichem", "chemist-warehouse": "Chemist Warehouse", animates: "Animates",
  petstock: "Petstock", "pet-direct": "Pet Direct",
};
const chainName = (c: string) => CHAIN_NAMES[c] ?? c.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const retailerSearchUrl = (chain: string, name: string, sku: string | null) => {
  const q = encodeURIComponent(name);
  switch (chain) {
    case "countdown": return sku ? `https://www.woolworths.co.nz/shop/productdetails?stockcode=${encodeURIComponent(sku)}` : `https://www.woolworths.co.nz/shop/searchproducts?search=${q}`;
    case "paknsave": return `https://www.paknsave.co.nz/shop/search?q=${q}`;
    case "new-world": return `https://www.newworld.co.nz/shop/search?q=${q}`;
    default: return null;
  }
};

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const SIZE_RE = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pk|pack|ea)\b/i;
function normSize(s?: string | null) {
  const m = s?.match(SIZE_RE); if (!m) return null;
  let v = Number(m[1]); let u = m[2].toLowerCase();
  if (u === "kg") { v *= 1000; u = "g"; } if (u === "l") { v *= 1000; u = "ml"; } if (u === "pack") u = "pk";
  return `${v}${u}`;
}
// Generic words retailers add or drop ("Breakfast Cereal", "Original"); they never change which product it is.
const GENERIC = new Set(["breakfast", "cereal", "the", "original", "classic", "bottle", "pack", "each", "ea", "nz", "new"]);
function tokens(s: string) {
  return new Set(s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(SIZE_RE, " ").replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 1 && !GENERIC.has(t)));
}
const keyOf = (it: any) => {
  const size = normSize(it.packSize) ?? normSize(it.name);
  if (!size) return null;
  return [...tokens(`${it.brand ?? ""} ${it.name}`)].sort().join(" ") + "|" + size;
};
const titleCase = (s: string) => (s && s === s.toLowerCase() ? s.replace(/\b[a-z]/g, (m) => m.toUpperCase()) : s);
/** "Sanitarium Weet-Bix Breakfast Cereal" from brand "Sanitarium Weet-Bix" + name "Breakfast Cereal (375g)". */
function displayName(it: any) {
  const name = titleCase(String(it.name).replace(/\s*\([^)]*\)\s*$/, "").trim());
  const brand = it.brand ? titleCase(String(it.brand)) : "";
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name;
}

type Group = { name: string; brand: string | null; size: string | null; gtin: string | null; offers: Record<string, any>[] };

/** Looks a term up at every chain Baskt covers and groups results into exact same-item products. */
async function lookup(db: any, q: string, at: { lat: number; lng: number } | null) {
  const cached = async (key: string, maxAge: number, calls: number, load: () => Promise<unknown>) => {
    const { data } = await db.rpc("api_cache_get", { p_key: key, p_max_age_seconds: maxAge });
    if (data) return data as any;
    const { data: ok } = await db.rpc("api_budget_take", { p_source: "baskt", p_calls: calls, p_limit: 120 });
    if (!ok) throw new Error("busy");
    const body = await load();
    await db.rpc("api_cache_put", { p_key: key, p_body: body });
    return body as any;
  };
  const get = async (path: string) => { const r = await fetch(`${API}${path}`, { headers: UA }); if (!r.ok) throw new Error(`Baskt ${r.status}`); return (await r.json()).data; };

  const health = await cached("baskt:health", 86400, 1, () => get("/health"));
  const chains: string[] = Object.keys(health?.latestByChain ?? {});
  const runs: Record<string, any> = health?.latestByChain ?? {};
  const locations: any[] = await cached("baskt:locations", 86400, 4, async () => {
    const out: any[] = [];
    for (let off = 0; off < 2000; off += 100) {
      const d = await get(`/locations?limit=100&offset=${off}`);
      out.push(...(d.locations ?? []).map((l: any) => ({ id: l.id, chain: l.chain, name: l.name, address: l.address, lat: l.lat, lng: l.lng, mode: l.pricingMode })));
      if (!d.pagination?.nextOffset) break;
    }
    return out;
  });
  const locById = new Map(locations.map((l) => [String(l.id), l]));

  const failed: string[] = [];
  const perChain = await Promise.all(chains.map(async (chain) => {
    try { return await cached(`baskt:items:${chain}:${q}`, 6 * 3600, 1, () => get(`/items?q=${encodeURIComponent(q)}&limit=12&chain=${encodeURIComponent(chain)}`)); }
    catch { failed.push(chain); return null; }
  }));

  const groups = new Map<string, Group>();
  perChain.forEach((d, i) => {
    if (!d) return;
    const chain = chains[i];
    for (const it of d.items ?? []) {
      const prices = (d.latestPrices ?? []).filter((p: any) => p.itemId === it.id && p.priceCents > 0);
      if (!prices.length) continue;
      const withLoc = prices.map((p: any) => ({ p, loc: locById.get(String(p.locationId)) }));
      let pick = withLoc.reduce((a: any, b: any) => (b.p.priceCents < a.p.priceCents ? b : a));
      let dist: number | null = null;
      if (at) {
        const near = withLoc.filter((x: any) => x.loc?.lat != null).map((x: any) => ({ ...x, d: km(at, x.loc) })).sort((a: any, b: any) => a.d - b.d)[0];
        if (near && near.d <= 30) { pick = near; dist = near.d; }
      }
      const p = pick.p;
      const promo = !!p.promoFlag && p.regularPriceCents != null && p.regularPriceCents > p.priceCents;
      const offer = {
        chain, store: chainName(chain), priceCents: p.priceCents, wasCents: promo ? p.regularPriceCents : null, promo: !!p.promoFlag,
        unitPriceCents: p.unitPriceCents ?? null, unitMeasure: p.unitMeasure ?? null, observedAt: p.observedAt,
        location: pick.loc?.name ?? null, address: pick.loc?.address ?? null, km: dist, deliveryZone: pick.loc?.mode === "delivery-zone",
        storesObserved: prices.length, url: retailerSearchUrl(chain, it.name, it.externalSku ?? null), itemName: displayName(it),
      };
      const key = it.gtin ? `gtin:${it.gtin.replace(/^0+/, "")}` : keyOf(it) ? `k:${keyOf(it)}` : `item:${chain}:${it.id}`;
      const g = groups.get(key) ?? { name: displayName(it), brand: it.brand ? titleCase(it.brand) : null, size: normSize(it.packSize) ? it.packSize : normSize(it.name) ? it.name.match(SIZE_RE)![0] : null, gtin: it.gtin ?? null, offers: [] };
      const i2 = g.offers.findIndex((o: any) => o.chain === chain);
      if (i2 < 0) g.offers.push(offer); else if (g.offers[i2].priceCents > p.priceCents) g.offers[i2] = offer;
      if (!g.gtin && it.gtin) g.gtin = it.gtin;
      groups.set(key, g);
    }
  });

  // Photos: only the Open Food Facts photo we already hold for the same barcode (CC BY-SA).
  const gtins = [...groups.values()].map((g) => g.gtin).filter(Boolean) as string[];
  const images = new Map<string, string>();
  if (gtins.length) {
    const { data } = await db.from("products").select("barcode,image_url").in("barcode", gtins).not("image_url", "is", null);
    (data ?? []).forEach((r: any) => images.set(r.barcode, r.image_url));
  }
  const lastRun = Object.values(runs).map((r: any) => r.finishedAt).filter(Boolean).sort().pop() ?? null;
  return { groups, images, chains, failed, lastRun };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const u = new URL(req.url);

  // Scheduled collection (server only): ?collect=1 stores the next due term's results with history.
  if (u.searchParams.get("collect")) {
    const { data: settings } = await db.rpc("import_settings");
    if (!settings || req.headers.get("x-import-key") !== settings.key) return json({ error: "unauthorised" }, 401);
    const { data: due } = await db.rpc("next_collect_term");
    const row = Array.isArray(due) ? due[0] : due;
    if (!row?.term) return json({ idle: true });
    try {
      const { groups, images, chains, failed, lastRun } = await lookup(db, row.term, null);
      // Photos for barcodes we don't hold yet: ask Open Food Facts (a few per run, politely).
      const missing = [...groups.values()].filter((g) => g.gtin && !images.has(g.gtin)).slice(0, 8);
      for (const g of missing) {
        try {
          const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${g.gtin}.json?fields=image_front_small_url,image_front_url`, { headers: UA, signal: AbortSignal.timeout(8000) });
          if (r.ok) { const j = await r.json(); const url = j?.product?.image_front_small_url ?? j?.product?.image_front_url; if (j?.status === 1 && url) images.set(g.gtin!, url); }
        } catch { /* no photo is fine */ }
      }
      const now = new Date().toISOString();
      const items: any[] = []; const offers: any[] = []; const obs: any[] = [];
      for (const [id, g] of groups) {
        const img = g.gtin ? images.get(g.gtin) ?? null : null;
        items.push({ id, name: g.name, brand: g.brand, size: g.size, gtin: g.gtin, category: row.category, image_url: img, image_source: img ? "Open Food Facts (CC BY-SA)" : null, updated_at: now });
        for (const o of g.offers) {
          offers.push({ item_id: id, chain: o.chain, store: o.store, price_cents: o.priceCents, was_cents: o.wasCents, promo: o.promo, unit_price_cents: o.unitPriceCents,
            unit_measure: o.unitMeasure, observed_at: o.observedAt, fetched_at: now, location: o.location, product_url: o.url, stores_observed: o.storesObserved,
            source: "Baskt", source_url: "https://baskt.nz" });
          obs.push({ item_id: id, chain: o.chain, price_cents: o.priceCents, was_cents: o.wasCents, observed_at: o.observedAt });
        }
      }
      // Keep an item's existing category and photo if another term already set them.
      const { data: existing } = await db.from("retail_items").select("id,category,image_url").in("id", items.map((x) => x.id));
      const ex = new Map((existing ?? []).map((r: any) => [r.id, r]));
      items.forEach((x) => { const e: any = ex.get(x.id); if (e) { x.category = e.category; x.image_url = x.image_url ?? e.image_url; if (!x.image_url) x.image_source = null; } });
      const e1 = items.length ? (await db.from("retail_items").upsert(items, { onConflict: "id" })).error : null;
      const e2 = offers.length ? (await db.from("retail_offers").upsert(offers, { onConflict: "item_id,chain" })).error : null;
      const e3 = obs.length ? (await db.from("retail_observations").upsert(obs, { onConflict: "item_id,chain,observed_at", ignoreDuplicates: true })).error : null;
      const err = [e1, e2, e3].filter(Boolean).map((e: any) => e.message).join("; ") || (failed.length ? `chains failed: ${failed.join(",")}` : null);
      await db.from("collect_terms").update({ last_run_at: now, last_ok: !e1 && !e2 && !e3, last_error: err, items_found: items.length }).eq("term", row.term);
      await db.from("source_status").upsert({ source: "baskt", ok: !e1 && !e2, checked_at: now, rows: chains.length, message: `last Baskt run ${lastRun}` });
      return json({ term: row.term, items: items.length, offers: offers.length, error: err });
    } catch (e) {
      await db.from("collect_terms").update({ last_run_at: new Date().toISOString(), last_ok: false, last_error: String(e).slice(0, 300) }).eq("term", row.term);
      return json({ term: row.term, error: String(e) }, 502);
    }
  }

  const q = (u.searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60);
  const lat = Number(u.searchParams.get("lat")); const lng = Number(u.searchParams.get("lng"));
  const at = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : null;
  if (q.length < 2) return json({ error: "query too short" }, 400);
  try {
    const { groups, images, chains, failed, lastRun } = await lookup(db, q, at);
    const words = q.split(" ");
    const products = [...groups.entries()]
      .map(([id, g]) => ({ id, ...g, image: g.gtin ? images.get(g.gtin) ?? null : null, offers: g.offers.sort((a, b) => a.priceCents - b.priceCents) }))
      .sort((a, b) => {
        const hit = (x: typeof a) => words.filter((w) => `${x.brand ?? ""} ${x.name}`.toLowerCase().includes(w)).length;
        return hit(b) - hit(a) || b.offers.length - a.offers.length || a.name.localeCompare(b.name);
      })
      .slice(0, 30);
    await db.from("source_status").upsert({ source: "baskt", ok: true, checked_at: new Date().toISOString(), rows: chains.length, message: `last Baskt run ${lastRun}` });
    return json({
      query: q, products, chainsSearched: chains.map(chainName), chainsFailed: failed.map(chainName), lastObservedRun: lastRun,
      source: { name: "Baskt", url: "https://baskt.nz", note: "Latest observed prices, not live checkout prices. Not affiliated with the retailers." },
    });
  } catch (e) {
    const busy = String(e).includes("busy");
    await db.from("source_status").upsert({ source: "baskt", ok: false, checked_at: new Date().toISOString(), message: String(e).slice(0, 300) });
    return json({ error: busy ? "busy" : "unavailable", message: busy ? "Too many searches right now. Try again in a minute." : "Store prices can't be reached right now." }, busy ? 429 : 502);
  }
});
