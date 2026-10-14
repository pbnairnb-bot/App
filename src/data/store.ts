/*
 * Store prices saved on our server (collected from permitted sources on a schedule, with history).
 * Every price here is a real stored observation: the store, the price, when the source saw it and
 * when we collected it. Nothing is estimated.
 */
import { supabase } from '@/lib/supabase';

export interface StoreItem {
  id: string; name: string; brand: string | null; size: string | null; gtin: string | null; category: string;
  imageUrl: string | null; imageSource: string | null;
  storeCount: number; bestCents: number; bestStore: string; bestWasCents: number | null; bestObservedAt: string;
  topCents: number; lastObservedAt: string;
}
export interface StoreOffer {
  chain: string; store: string; priceCents: number; wasCents: number | null; promo: boolean;
  unitPriceCents: number | null; unitMeasure: string | null; observedAt: string; fetchedAt: string;
  location: string | null; productUrl: string | null; storesObserved: number | null; source: string;
}
export interface StoreDeal { item: StoreItem; offer: StoreOffer }
export interface PricePointStore { chain: string; priceCents: number; observedAt: string }

const SUMMARY = 'id,name,brand,size,gtin,category,image_url,image_source,store_count,best_cents,best_store,best_was_cents,best_observed_at,top_cents,last_observed_at';
const toItem = (r: Record<string, any>): StoreItem => ({
  id: r.id, name: r.name, brand: r.brand, size: r.size, gtin: r.gtin, category: r.category, imageUrl: r.image_url, imageSource: r.image_source,
  storeCount: r.store_count, bestCents: r.best_cents, bestStore: r.best_store, bestWasCents: r.best_was_cents, bestObservedAt: r.best_observed_at,
  topCents: r.top_cents, lastObservedAt: r.last_observed_at,
});
const toOffer = (r: Record<string, any>): StoreOffer => ({
  chain: r.chain, store: r.store, priceCents: r.price_cents, wasCents: r.was_cents, promo: r.promo, unitPriceCents: r.unit_price_cents,
  unitMeasure: r.unit_measure, observedAt: r.observed_at, fetchedAt: r.fetched_at, location: r.location, productUrl: r.product_url,
  storesObserved: r.stores_observed, source: r.source,
});

/** Verified deals: a promotion where the source also gave the regular price, biggest saving first. */
export async function storeDeals(limit = 10): Promise<StoreDeal[]> {
  const { data, error } = await supabase.from('retail_offers').select('*, retail_items!inner(id,name,brand,size,gtin,category,image_url,image_source)')
    .not('was_cents', 'is', null).order('observed_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => ({
      offer: toOffer(r),
      item: { ...toItem({ ...r.retail_items, store_count: 1, best_cents: r.price_cents, best_store: r.store, best_was_cents: r.was_cents, best_observed_at: r.observed_at, top_cents: r.price_cents, last_observed_at: r.observed_at }) },
    }))
    .sort((a, b) => (b.offer.wasCents! - b.offer.priceCents) / b.offer.wasCents! - (a.offer.wasCents! - a.offer.priceCents) / a.offer.wasCents!)
    .filter((d, i, all) => all.findIndex((x) => x.item.id === d.item.id) === i)
    .slice(0, limit);
}

/** Products compared across the most stores (best for price comparison). */
export async function popularItems(limit = 12, category?: string): Promise<StoreItem[]> {
  let q = supabase.from('retail_item_summary').select(SUMMARY).order('store_count', { ascending: false }).order('best_cents').limit(limit);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toItem);
}

export async function recentItems(limit = 10): Promise<StoreItem[]> {
  const { data, error } = await supabase.from('retail_item_summary').select(SUMMARY).order('last_observed_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toItem);
}

export async function categoryItems(category: string, limit = 60): Promise<StoreItem[]> {
  const { data, error } = await supabase.from('retail_item_summary').select(SUMMARY).eq('category', category)
    .order('store_count', { ascending: false }).order('best_cents').limit(limit);
  if (error) throw error;
  return (data ?? []).map(toItem);
}

export async function categoryCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const { data, error } = await supabase.from('retail_items').select('category').limit(10000);
  if (error) throw error;
  (data ?? []).forEach((r: any) => { out[r.category] = (out[r.category] ?? 0) + 1; });
  return out;
}

/** Price drops: the latest observation is lower than the previous one at the same store. */
export async function priceDrops(limit = 10): Promise<(StoreItem & { previousCents: number; dropStore: string })[]> {
  const { data, error } = await supabase.from('retail_price_drops').select('*').order('observed_at', { ascending: false }).limit(limit);
  if (error) throw error;
  if (!data?.length) return [];
  const { data: items } = await supabase.from('retail_item_summary').select(SUMMARY).in('id', data.map((d: any) => d.item_id));
  const byId = new Map((items ?? []).map((r: any) => [r.id, toItem(r)]));
  return data.flatMap((d: any) => {
    const it = byId.get(d.item_id);
    return it ? [{ ...it, bestCents: d.price_cents, bestStore: d.store, previousCents: d.previous_cents, dropStore: d.store }] : [];
  });
}

export async function searchStoreItems(q: string, limit = 30): Promise<StoreItem[]> {
  const words = q.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
  if (!words.length) return [];
  let query = supabase.from('retail_item_summary').select(SUMMARY).limit(limit);
  for (const w of words) { const s = w.replace(/[%,()]/g, ''); query = query.or(`name.ilike.%${s}%,brand.ilike.%${s}%`); }
  const { data, error } = await query.order('store_count', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toItem);
}

export async function itemByGtin(code: string): Promise<StoreItem | null> {
  const { data } = await supabase.from('retail_item_summary').select(SUMMARY).eq('gtin', code).limit(1);
  return data?.[0] ? toItem(data[0]) : null;
}

export async function storeItem(id: string): Promise<{ item: StoreItem; offers: StoreOffer[]; history: PricePointStore[] } | null> {
  const [{ data: it, error }, { data: offers }, { data: hist }] = await Promise.all([
    supabase.from('retail_item_summary').select(SUMMARY).eq('id', id).limit(1),
    supabase.from('retail_offers').select('*').eq('item_id', id).order('price_cents'),
    supabase.from('retail_observations').select('chain,price_cents,observed_at').eq('item_id', id).order('observed_at').limit(500),
  ]);
  if (error) throw error;
  if (!it?.[0]) return null;
  return { item: toItem(it[0]), offers: (offers ?? []).map(toOffer), history: (hist ?? []).map((h: any) => ({ chain: h.chain, priceCents: h.price_cents, observedAt: h.observed_at })) };
}

/** NZ retailer directory with each store's data status. */
export interface Retailer { id: string; name: string; category: string; website: string; websiteStatus: number | null; websiteCheckedAt: string | null;
  dataMethod: string; coverage: string | null; permission: string; integration: 'connected' | 'possible' | 'not_connected'; lastDataAt: string | null; notes: string | null }
export async function retailers(): Promise<Retailer[]> {
  const { data, error } = await supabase.from('retailers').select('*').order('category').order('name');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, category: r.category, website: r.website, websiteStatus: r.website_status, websiteCheckedAt: r.website_checked_at,
    dataMethod: r.data_method, coverage: r.coverage, permission: r.permission, integration: r.integration, lastDataAt: r.last_data_at, notes: r.notes }));
}
