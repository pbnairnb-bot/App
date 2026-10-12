/*
 * The one place screens get data from. On launch `loadCatalog()` reads stores, products,
 * prices, price history and price-match policies from Supabase; if the phone is offline it
 * falls back to the copy bundled with the app. Barcodes not in the catalogue are looked up on
 * Open Food Facts.
 */
import { type Deal, type Filterable, PRICE_MATCH_POLICIES, type PriceMatchPolicy } from '@/design/components';
import { supabase } from '@/lib/supabase';
import { bestOffer, buildOffers, type Offer, verdict } from './compare';
import { SAMPLE_ALERTS, SAMPLE_PRICES, SAMPLE_PRODUCTS, SAMPLE_STORES, sampleHistory } from './sample';
import type { AlertItem, PricePoint, Product, Store, StorePrice } from './types';
import type { GeoPoint } from '@/design/components';

// Live catalogue (replaced by loadCatalog), starting from the bundled copy.
export let stores: Store[] = SAMPLE_STORES;
let products: Product[] = SAMPLE_PRODUCTS;
let prices: StorePrice[] = SAMPLE_PRICES;
let history: Map<string, PricePoint[]> | null = null;
export let policies: PriceMatchPolicy[] = PRICE_MATCH_POLICIES;
export let catalogSource: 'live' | 'bundled' = 'bundled';

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

/** Reads the whole catalogue from Supabase. Returns false (and keeps the bundled copy) when offline. */
export async function loadCatalog(): Promise<boolean> {
  try {
    type Row = Record<string, any>;
    const [s, b, p, pr, h, pol] = await Promise.all([
      all<Row>('stores'), all<Row>('store_branches'), all<Row>('products'), all<Row>('prices'),
      all<Row>('price_history', 'product_id,day,price', 'day'), all<Row>('price_match_policies'),
    ]);
    stores = s.map((r) => ({
      id: r.id, name: r.name, short: r.short, color: r.color, logoUrl: r.logo_url ?? undefined, online: r.online,
      deliveryFee: r.delivery_fee != null ? Number(r.delivery_fee) : undefined, policyRetailer: r.policy_retailer ?? undefined, isSample: r.is_sample,
      branches: b.filter((x) => x.store_id === r.id).map((x) => ({ lat: x.lat, lng: x.lng })),
    }));
    products = p.map((r) => ({
      id: r.id, barcode: r.barcode ?? undefined, name: r.name, brand: r.brand ?? undefined, size: r.size ?? undefined,
      unitQty: r.unit_qty != null ? Number(r.unit_qty) : undefined, unit: r.unit ?? undefined, category: r.category,
      imageUrl: r.image_url ?? undefined, isSample: r.is_sample,
    }));
    prices = pr.map((r) => ({
      productId: r.product_id, storeId: r.store_id, price: Number(r.price), wasPrice: r.was_price != null ? Number(r.was_price) : undefined,
      memberPrice: r.member_price != null ? Number(r.member_price) : undefined, memberLabel: r.member_label ?? undefined,
      checkedAt: r.checked_at, source: r.source, endsAt: r.ends_at ?? undefined, onlineOnly: r.online_only,
    }));
    history = new Map();
    h.forEach((r) => { const k = r.product_id as string; if (!history!.has(k)) history!.set(k, []); history!.get(k)!.push({ date: r.day, price: Number(r.price) }); });
    if (pol.length) {
      policies = pol.map((r) => ({
        retailer: r.retailer, kind: r.kind, percent: r.percent != null ? Number(r.percent) : undefined, fixed: r.fixed ?? undefined,
        conditions: r.conditions ?? [], priceDropRefundDays: r.price_drop_refund_days ?? undefined, sourceUrl: r.source_url,
        checkedAt: r.checked_at, verified: r.verified, note: r.note ?? undefined,
      }));
    }
    catalogSource = 'live';
    return true;
  } catch {
    catalogSource = 'bundled';
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
  return history ? history.get(productId) ?? [] : sampleHistory(productId);
}

/** A product with its best offer, shaped for cards, lists and the shared filters. */
export interface Listing extends Filterable {
  product: Product;
  best: Offer;
  storeCount: number;
  verdictLabel?: string;
  isSample?: boolean;
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
      verdictLabel: v?.label, isSample: product.isSample,
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

/** Today's deals for the banner carousel: only offers with a verified earlier price. */
export function deals(at?: GeoPoint): Deal[] {
  return listings(at)
    .filter((l) => l.best.wasPrice && l.best.wasPrice > l.best.price)
    .sort((a, b) => (b.wasPrice! - b.price) / b.wasPrice! - (a.wasPrice! - a.price) / a.wasPrice!)
    .slice(0, 5)
    .map((l, i) => ({
      id: l.product.id, product: `${l.product.name}${l.product.size ? ` ${l.product.size}` : ''}`, retailer: l.best.store.name,
      price: l.best.price, wasPrice: l.best.wasPrice, endsAt: l.best.endsAt, storesCompared: l.storeCount,
      category: l.category, stores: l.stores, label: i === 0 ? 'deal' : undefined, isSample: l.isSample,
    }));
}

export function findByBarcode(code: string): Product | undefined {
  return products.find((p) => p.barcode === code);
}

/** A few catalogue barcodes to try the scanner without a real product. */
export const sampleBarcodes = () => products.filter((p) => p.barcode && p.isSample).slice(0, 6).map((p) => ({ code: p.barcode!, name: p.name }));

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

export function getAlerts(): AlertItem[] {
  return SAMPLE_ALERTS;
}

/** Shopper price report; an admin approves it before it shows to others. Needs sign-in. */
export async function reportPrice(r: { barcode?: string; productId?: string; productName: string; storeName: string; price: number; note?: string }) {
  const { error } = await supabase.from('price_reports').insert({
    barcode: r.barcode ?? null, product_id: r.productId && !r.productId.startsWith('off-') ? r.productId : null,
    product_name: r.productName, store_name: r.storeName, price: r.price, note: r.note ?? null,
  });
  if (error) throw error;
}
