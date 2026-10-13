// Supermarket, pharmacy and pet-store prices from Baskt's public API (https://baskt.nz/developers).
// Baskt's terms allow querying /api/v1/* for "integration into consumer-facing tools", forbid bulk
// re-publishing, and ask that it isn't presented as authoritative checkout pricing. So this function:
//   - queries on demand (no bulk copy), caches each answer for 6 hours, and caps upstream calls per minute;
//   - returns prices as "last observed" with the observation time, never as live checkout prices;
//   - only groups products across stores when they're the same item (same barcode, or same brand,
//     name and pack size), so different sizes or variants are never compared.
// GET ?q=<text>&lat=&lng=   ->  { products: [...], source, chainsSearched, chainsFailed }
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60);
  const lat = Number(u.searchParams.get("lat")); const lng = Number(u.searchParams.get("lng"));
  const at = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : null;
  if (q.length < 2) return json({ error: "query too short" }, 400);

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

  try {
    // Chains Baskt covers (from its health endpoint) and its store locations, refreshed daily.
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

    // One offer per (item, chain): the cheapest observed price, or the nearest store's when we know where the shopper is.
    type Offer = Record<string, unknown>;
    const groups = new Map<string, { name: string; brand: string | null; size: string | null; gtin: string | null; offers: Offer[] }>();
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
        if (!g.offers.some((o: any) => o.chain === chain)) g.offers.push(offer);
        else { const i2 = g.offers.findIndex((o: any) => o.chain === chain); if ((g.offers[i2] as any).priceCents > p.priceCents) g.offers[i2] = offer; }
        if (!g.gtin && it.gtin) g.gtin = it.gtin;
        groups.set(key, g);
      }
    });

    // Photos: only the Open Food Facts photo we already hold for the same barcode (CC BY-SA).
    const gtins = [...groups.values()].map((g) => g.gtin).filter(Boolean) as string[];
    const images = new Map<string, string>();
    if (gtins.length) {
      const { data } = await db.from("products").select("barcode,image_url").in("barcode", gtins).not("image_url", "is", null);
      (data ?? []).forEach((r) => images.set(r.barcode, r.image_url));
    }
    const words = q.split(" ");
    const products = [...groups.values()]
      .map((g) => ({ ...g, image: g.gtin ? images.get(g.gtin) ?? null : null, offers: (g.offers as any[]).sort((a, b) => a.priceCents - b.priceCents) }))
      .sort((a, b) => {
        const hit = (x: typeof a) => words.filter((w) => `${x.brand ?? ""} ${x.name}`.toLowerCase().includes(w)).length;
        return hit(b) - hit(a) || b.offers.length - a.offers.length || a.name.localeCompare(b.name);
      })
      .slice(0, 30);
    const lastRun = Object.values(runs).map((r: any) => r.finishedAt).filter(Boolean).sort().pop() ?? null;
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
