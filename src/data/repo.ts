/*
 * The one place screens get data from. Everything comes from the live Supabase backend:
 * stores, products, prices (store feeds, approved shopper reports, Open Prices), price
 * history, price-match policies, MBIE fuel prices and the shopper's alerts. Nothing is
 * bundled with the app. When the backend can't be reached, `catalogStatus` is 'offline'
 * and screens say so instead of showing made-up prices.
 */
import { type Deal, type Filterable, type PriceMatchPolicy } from '@/design/components';
import { supabase } from '@/lib/supabase';
import { bestOffer, buildOffers, type Offer, verdict } from './compare';
import type { AlertItem, FuelPrice, PricePoint, Product, Store, StorePrice } from './types';
import type { GeoPoint } from '@/design/components';

// Live catalogue, filled by loadCatalog(). Empty until live data arrives.
export let stores: Store[] = [];
let products: Product[] = [];
let prices: StorePrice[] = [];
let history = new Map<string, PricePoint[]>();
export let policies: PriceMatchPolicy[] = [];
let fuel: FuelPrice[] = [];
/** 'loading' before the first answer, 'live' once loaded, 'offline' when the last load failed. */
export let catalogStatus: 'loading' | 'live' | 'offline' = 'loading';
export let catalogLoadedAt: string | null = null;

async function all<T>(table: string, select = '*', order?: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (order) q = q.order(order);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Reads the live catalogue from Supabase. Returns false when it can't be reached (the last good copy stays). */
export async function loadCatalog(): Promise<boolean> {
  try {
    type Row = Record<string, any>;
    const [s, b, p, pr, h, pol, f] = await Promise.all([
      all<Row>('stores'), all<Row>('store_branches'), all<Row>('catalog_products'), all<Row>('prices'),
      all<Row>('price_history', 'product_id,day,price', 'day'), all<Row>('price_match_policies'),
      all<Row>('fuel_prices', '*', 'date'),
    ]);
    stores = s.map((r) => ({
      id: r.id, name: r.name, short: r.short, color: r.color, logoUrl: r.logo_url ?? undefined, online: r.online,
      deliveryFee: r.delivery_fee != null ? Number(r.delivery_fee) : undefined, policyRetailer: r.policy_retailer ?? undefined,
      branches: b.filter((x) => x.store_id === r.id).map((x) => ({ lat: x.lat, lng: x.lng })),
    }));
    products = p.map((r) => ({
      id: r.id, barcode: r.barcode ?? undefined, name: r.name, brand: r.brand ?? undefined, size: r.size ?? undefined,
      unitQty: r.unit_qty != null ? Number(r.unit_qty) : undefined, unit: r.unit ?? undefined, category: r.category,
      imageUrl: r.image_url ?? undefined,
    }));
    prices = pr.map((r) => ({
      productId: r.product_id, storeId: r.store_id, price: Number(r.price), wasPrice: r.was_price != null ? Number(r.was_price) : undefined,
      memberPrice: r.member_price != null ? Number(r.member_price) : undefined, memberLabel: r.member_label ?? undefined,
      checkedAt: r.checked_at, source: r.source, sourceName: r.source_name ?? undefined, endsAt: r.ends_at ?? undefined, onlineOnly: r.online_only,
    }));
    history = new Map();
    h.forEach((r) => { const k = r.product_id as string; if (!history.has(k)) history.set(k, []); history.get(k)!.push({ date: r.day, price: Number(r.price) }); });
    fuel = f.map((r) => ({ fuel: r.fuel, date: r.date, centsPerLitre: Number(r.cents_per_litre), source: r.source }));
    {
      policies = pol.map((r) => ({
        retailer: r.retailer, kind: r.kind, percent: r.percent != null ? Number(r.percent) : undefined, fixed: r.fixed ?? undefined,
        conditions: r.conditions ?? [], priceDropRefundDays: r.price_drop_refund_days ?? undefined, sourceUrl: r.source_url,
        checkedAt: r.checked_at, verified: r.verified, note: r.note ?? undefined,
      }));
    }
    catalogStatus = 'live';
    catalogLoadedAt = new Date().toISOString();
    return true;
  } catch {
    catalogStatus = 'offline';
    return false;
  }
}

/** Products found through barcode lookups this session. */
const looked = new Map<string, Product>();

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id) ?? looked.get(id);
}

export function getOffers(productId: string, at?: GeoPoint): Offer[] {
  return buildOffers(prices.filter((p) => p.productId === productId), stores, at);
}

export function getHistory(productId: string): PricePoint[] {
  return history.get(productId) ?? [];
}

/** A product with its best offer, shaped for cards, lists and the shared filters. */
export interface Listing extends Filterable {
  product: Product;
  best: Offer;
  storeCount: number;
  verdictLabel?: string;
}

export function listings(at?: GeoPoint): Listing[] {
  return products.flatMap((product) => {
    const offers = getOffers(product.id, at);
    const best = bestOffer(offers);
    if (!best) return [];
    const v = verdict(getHistory(product.id), best.price);
    return [{
      id: product.id, product, best, storeCount: offers.length,
      price: best.price, wasPrice: best.wasPrice, retailer: best.store.name, category: product.category,
      stores: best.store.branches.length ? best.store.branches : undefined, endsAt: best.endsAt,
      verdictLabel: v?.label,
    }];
  });
}

export function search(query: string, at?: GeoPoint): Listing[] {
  const q = query.trim().toLowerCase();
  const all = listings(at);
  if (!q) return all;
  const words = q.split(/\s+/);
  return all.filter((l) => {
    const hay = `${l.product.name} ${l.product.brand ?? ''} ${l.product.size ?? ''} ${l.category}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Today's deals: only current (not stale) offers whose earlier price came from the same verified source. */
export function deals(at?: GeoPoint): Deal[] {
  return listings(at)
    .filter((l) => !l.best.stale && l.best.wasPrice && l.best.wasPrice > l.best.price)
    .sort((a, b) => (b.wasPrice! - b.price) / b.wasPrice! - (a.wasPrice! - a.price) / a.wasPrice!)
    .slice(0, 5)
    .map((l, i) => ({
      id: l.product.id, product: `${l.product.name}${l.product.size ? ` ${l.product.size}` : ''}`, retailer: l.best.store.name,
      price: l.best.price, wasPrice: l.best.wasPrice, endsAt: l.best.endsAt, storesCompared: l.storeCount,
      category: l.category, stores: l.stores, label: i === 0 ? 'deal' : undefined,
    }));
}

export function findByBarcode(code: string): Product | undefined {
  return products.find((p) => p.barcode === code);
}

const toProduct = (r: Record<string, any>): Product => ({
  id: r.id, barcode: r.barcode ?? undefined, name: r.name, brand: r.brand ?? undefined, size: r.size ?? undefined,
  unitQty: r.unit_qty != null ? Number(r.unit_qty) : undefined, unit: r.unit ?? undefined, category: r.category,
  imageUrl: r.image_url ?? undefined,
});

/** Look up any NZ product by barcode in the full database (including products with no prices yet). */
export async function findByBarcodeRemote(code: string): Promise<Product | null> {
  try {
    const { data } = await supabase.from('products').select('*').eq('barcode', code).limit(1);
    if (!data?.length) return null;
    const p = toProduct(data[0]);
    looked.set(p.id, p);
    return p;
  } catch { return null; }
}

/** Search every NZ product in the database by name or brand (for products without prices yet). */
export async function searchAllProducts(query: string, limit = 25): Promise<Product[]> {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
  if (!words.length) return [];
  try {
    let q = supabase.from('products').select('id,barcode,name,brand,size,unit_qty,unit,category,image_url').limit(limit);
    for (const w of words) q = q.or(`name.ilike.%${w.replace(/[%,()]/g, '')}%,brand.ilike.%${w.replace(/[%,()]/g, '')}%`);
    const { data } = await q;
    const priced = new Set(products.map((p) => p.id));
    return (data ?? []).map(toProduct).filter((p) => !priced.has(p.id)).map((p) => { looked.set(p.id, p); return p; });
  } catch { return []; }
}

/** How many NZ products the app can find (for the Home screen). */
export async function productCount(): Promise<number | null> {
  try { const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }); return count ?? null; } catch { return null; }
}

/** Latest national average pump price for each fuel, plus the week before (MBIE). */
export function latestFuel(): { fuel: string; now: FuelPrice; before?: FuelPrice }[] {
  const byFuel = new Map<string, FuelPrice[]>();
  fuel.forEach((f) => { if (!byFuel.has(f.fuel)) byFuel.set(f.fuel, []); byFuel.get(f.fuel)!.push(f); });
  return Array.from(byFuel.entries()).map(([name, list]) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return { fuel: name, now: sorted[0], before: sorted[1] };
  }).sort((a, b) => a.fuel.localeCompare(b.fuel));
}

/** How many products have at least one real price right now. */
export const pricedCount = () => new Set(prices.map((p) => p.productId)).size;

/**
 * Live lookup on Open Food Facts (free, open data; images CC BY-SA). Gives the product's
 * name, brand, size and photo for real barcodes. It has no prices.
 */
export async function lookupOpenFoodFacts(code: string): Promise<Product | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity,image_front_url,categories_tags`,
      { headers: { 'User-Agent': 'PriceMatchNZ/1.0 (app in development)' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.product;
    if (json?.status !== 1 || !p?.product_name) return null;
    const tags: string[] = p.categories_tags ?? [];
    const category = tags.some((t) => /beauty|hygiene|cosmetic|supplement/.test(t)) ? 'beauty' : tags.some((t) => /pet/.test(t)) ? 'pets' : 'groceries';
    const product: Product = {
      id: `off-${code}`, barcode: code, name: p.product_name, brand: p.brands?.split(',')[0]?.trim(),
      size: p.quantity || undefined, category, imageUrl: p.image_front_url || undefined,
    };
    looked.set(product.id, product);
    return product;
  } catch {
    return null;
  }
}

/** The signed-in shopper's alerts (price drops on favourites, deals, petrol). Empty when signed out. */
export async function fetchAlerts(): Promise<AlertItem[]> {
  const { data, error } = await supabase.from('alerts').select('id,kind,title,body,product_id,created_at,read_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, productId: r.product_id ?? undefined, at: r.created_at, read: !!r.read_at }));
}

export async function markAlertsRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('alerts').update({ read_at: new Date().toISOString() }).in('id', ids);
}

/** Shopper price report; an admin approves it before it shows to others. Needs sign-in. */
export async function reportPrice(r: { barcode?: string; productId?: string; productName: string; storeName: string; price: number; note?: string }) {
  const { error } = await supabase.from('price_reports').insert({
    barcode: r.barcode ?? null, product_id: r.productId && !r.productId.startsWith('off-') ? r.productId : null,
    product_name: r.productName, store_name: r.storeName, price: r.price, note: r.note ?? null,
  });
  if (error) throw error;
}
