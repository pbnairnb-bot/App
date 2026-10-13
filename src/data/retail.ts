/*
 * Supermarket, pharmacy and pet-store prices, through our `retail-prices` server function
 * (which uses Baskt's public API and keeps any keys and rate limits on the server).
 * These are the latest observed shelf/online prices with their observation time, not live
 * checkout prices. Products are only compared across stores when they're the same item.
 */
import type { GeoPoint } from '@/design/components';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';

export interface RetailOffer {
  chain: string; store: string; priceCents: number; wasCents: number | null; promo: boolean;
  unitPriceCents: number | null; unitMeasure: string | null; observedAt: string;
  location: string | null; address: string | null; km: number | null; deliveryZone: boolean;
  storesObserved: number; url: string | null; itemName: string;
}
export interface RetailProduct { name: string; brand: string | null; size: string | null; gtin: string | null; image: string | null; offers: RetailOffer[] }
export interface RetailResult {
  query: string; products: RetailProduct[]; chainsSearched: string[]; chainsFailed: string[]; lastObservedRun: string | null;
  source: { name: string; url: string; note: string };
}

export class RetailError extends Error { constructor(public kind: 'busy' | 'unavailable' | 'offline', message: string) { super(message); } }

export async function searchRetail(q: string, at?: GeoPoint, signal?: AbortSignal): Promise<RetailResult> {
  const params = new URLSearchParams({ q: q.trim() });
  if (at) { params.set('lat', String(at.lat)); params.set('lng', String(at.lng)); }
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}/functions/v1/retail-prices?${params}`, { headers: { apikey: SUPABASE_KEY }, signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new RetailError('offline', 'No internet connection.');
  }
  const body = await r.json().catch(() => null);
  if (!r.ok || !body) throw new RetailError(r.status === 429 ? 'busy' : 'unavailable', body?.message ?? 'Store prices can’t be reached right now.');
  return body as RetailResult;
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Age of an observation in words, e.g. "22 days ago". */
export function observedAgo(iso: string) {
  const h = (Date.now() - Date.parse(iso)) / 3600e3;
  if (h < 1) return 'within the last hour';
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
/** Observed more than 7 days ago: say so clearly. */
export const isOld = (iso: string) => Date.now() - Date.parse(iso) > 7 * 864e5;
