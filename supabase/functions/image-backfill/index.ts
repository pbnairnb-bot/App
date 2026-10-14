// Finds genuine product photos for saved store items that don't have one yet.
// 1. Items with a barcode: the Open Food Facts photo for that exact barcode.
// 2. Items without a barcode: an Open Food Facts NZ product only when brand, name words and pack size all match
//    exactly (so a photo is never shown for a different product, size or variant).
// Photos are Open Food Facts images (CC BY-SA), credited in the app. Runs on a schedule; server key required.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = { "User-Agent": "PriceMatchNZ/1.0 (+https://github.com/pbnairnb-bot/App)" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const SIZE_RE = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pk|pack|ea)\b/i;
function normSize(s?: string | null) {
  const m = s?.match(SIZE_RE); if (!m) return null;
  let v = Number(m[1]); let u = m[2].toLowerCase();
  if (u === "kg") { v *= 1000; u = "g"; } if (u === "l") { v *= 1000; u = "ml"; } if (u === "pack") u = "pk";
  return `${v}${u}`;
}
const GENERIC = new Set(["breakfast", "cereal", "the", "original", "classic", "bottle", "pack", "each", "ea", "nz", "new", "and", "with"]);
const tokens = (s: string) => new Set(s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(SIZE_RE, " ").replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 1 && !GENERIC.has(t)));
const same = (a: Set<string>, b: Set<string>) => a.size > 1 && a.size === b.size && [...a].every((t) => b.has(t));

Deno.serve(async (req: Request) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: settings } = await db.rpc("import_settings");
  if (!settings || req.headers.get("x-import-key") !== settings.key) return json({ error: "unauthorised" }, 401);
  const { data: items } = await db.rpc("items_needing_images", { p_limit: 30 });
  let byBarcode = 0, byName = 0; const now = new Date().toISOString();
  for (const it of (items ?? []) as any[]) {
    let url: string | null = null;
    if (it.gtin) {
      // Our imported NZ products first, then Open Food Facts directly.
      const { data: p } = await db.from("products").select("image_url").eq("barcode", it.gtin).not("image_url", "is", null).limit(1);
      url = p?.[0]?.image_url ?? null;
      if (!url) {
        try {
          const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${it.gtin}.json?fields=image_front_small_url,image_front_url`, { headers: UA, signal: AbortSignal.timeout(8000) });
          if (r.ok) { const j = await r.json(); if (j?.status === 1) url = j.product?.image_front_small_url ?? j.product?.image_front_url ?? null; }
        } catch { /* try again next week */ }
      }
      if (url) byBarcode++;
    } else if (it.brand && normSize(it.size)) {
      const first = String(it.brand).split(/\s+/)[0].replace(/[%,()]/g, "");
      const { data: cands } = await db.from("products").select("name,brand,size,image_url").ilike("brand", `${first}%`).not("image_url", "is", null).limit(200);
      const want = tokens(`${it.brand} ${it.name}`); const size = normSize(it.size);
      const hit = (cands ?? []).find((c: any) => normSize(c.size ?? c.name) === size && same(tokens(`${c.brand ?? ""} ${c.name}`), want));
      if (hit) { url = hit.image_url; byName++; }
    }
    await db.from("retail_items").update(url
      ? { image_url: url, image_source: "Open Food Facts (CC BY-SA)", image_checked_at: now }
      : { image_checked_at: now }).eq("id", it.id);
  }
  return json({ checked: (items ?? []).length, byBarcode, byName });
});
