import { distanceKm, type GeoPoint, type PriceMatchPolicy } from '@/design/components';
import type { PricePoint, Product, Store, StorePrice } from './types';

export const nzd = (n: number) => (n >= 1000 ? `$${Math.round(n).toLocaleString('en-NZ')}` : `$${n.toFixed(2)}`);

/** "$2.40/L", "$12.61/kg", "$0.82 each". Null when the pack size is unknown. */
export function unitPrice(price: number, p: Pick<Product, 'unitQty' | 'unit'>): string | null {
  if (!p.unitQty || !p.unit) return null;
  const v = price / p.unitQty;
  return p.unit === 'each' ? `${nzd(v)} each` : `${nzd(v)}/${p.unit}`;
}

/**
 * Prices older than this are shown faded, marked "may be out of date" and never called the
 * best price. Store feeds refresh daily; shopper and community reports are kept longer.
 */
export const STALE_HOURS = 72;
export const STALE_HOURS_REPORTED = 24 * 14;
export const staleAfter = (source: string) => (source === 'feed' ? STALE_HOURS : STALE_HOURS_REPORTED);

export function ageHours(iso: string, now = Date.now()) { return (now - Date.parse(iso)) / 3600e3; }

export function freshness(iso: string, now = Date.now()): string {
  const h = ageHours(iso, now);
  if (h < 1) return 'Checked just now';
  if (h < 24) return `Checked ${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Checked yesterday';
  if (d < 14) return `Checked ${d} days ago`;
  return `Seen ${new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Where a price came from, in words: "Open Prices", "Shopper report", "Store feed". */
export function sourceLabel(p: { source: string; sourceName?: string }): string {
  if (p.sourceName) return p.sourceName;
  return p.source === 'feed' ? 'Store feed' : p.source === 'shopper' ? 'Shopper report' : p.source === 'admin' ? 'Checked by PriceMatch' : 'Community report';
}

export interface Offer extends StorePrice {
  store: Store;
  /** Distance to the nearest branch, when the shopper's location is known. */
  km?: number;
  /** Price plus delivery for online-only offers, when the fee is known. */
  total: number;
  stale: boolean;
}

export function buildOffers(prices: StorePrice[], stores: Store[], at?: GeoPoint, now = Date.now()): Offer[] {
  return prices
    .map((p) => {
      const store = stores.find((s) => s.id === p.storeId)!;
      const km = at && store.branches.length ? Math.min(...store.branches.map((b) => distanceKm(at, b))) : undefined;
      const total = p.onlineOnly && store.deliveryFee ? p.price + store.deliveryFee : p.price;
      return { ...p, store, km, total, stale: ageHours(p.checkedAt, now) > staleAfter(p.source) };
    })
    .filter((o) => o.store)
    .sort((a, b) => Number(a.stale) - Number(b.stale) || a.total - b.total || (a.km ?? 1e9) - (b.km ?? 1e9));
}

/** The single answer at the top of a product: cheapest fresh offer, counting delivery. */
export function bestOffer(offers: Offer[]): Offer | undefined {
  return offers.find((o) => !o.stale) ?? offers[0];
}

export type VerdictTone = 'good' | 'normal' | 'high';
export interface Verdict { label: string; tone: VerdictTone; detail: string }

/** "Is this a good price?" against the last 90 days of verified prices. */
export function verdict(history: PricePoint[], current: number): Verdict | null {
  const past = history.slice(0, -1).map((p) => p.price);
  if (past.length < 14) return null;
  const sorted = [...past].sort((a, b) => a - b);
  const min = sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)];
  if (current <= min + 0.005) return { label: 'Lowest in 90 days', tone: 'good', detail: `The usual price is about ${nzd(median)}.` };
  if (current > median * 1.04) return { label: 'Higher than usual', tone: 'high', detail: `It's been as low as ${nzd(min)} in the last 90 days.` };
  return { label: 'Normal price', tone: 'normal', detail: `Usually about ${nzd(median)}; lowest ${nzd(min)} in 90 days.` };
}

/** Which price-match stores sell this kind of product, so shoppers know where they could ask. */
const POLICY_CATEGORIES: Record<string, string[]> = {
  groceries: ['The Warehouse', 'Kmart'],
  beauty: ['Chemist Warehouse', 'The Warehouse', 'Kmart'],
  electronics: ['JB Hi-Fi', 'Noel Leeming', 'PB Tech', 'Harvey Norman', 'The Warehouse', 'Mighty Ape'],
  appliances: ['Noel Leeming', 'Harvey Norman', 'Briscoes', 'The Warehouse', 'Kmart', 'JB Hi-Fi'],
  pets: ['The Warehouse', 'Kmart', 'Mitre 10', 'Bunnings'],
  home: ['Briscoes', 'Bunnings', 'Mitre 10', 'The Warehouse', 'Kmart'],
  fashion: ['Rebel Sport', 'Torpedo7', 'Kmart', 'The Warehouse'],
};

export function policiesForCategory(category: string, all: PriceMatchPolicy[]): PriceMatchPolicy[] {
  const names = POLICY_CATEGORIES[category] ?? [];
  return names.map((n) => all.find((p) => p.retailer === n)).filter((p): p is PriceMatchPolicy => !!p);
}

/** "300 m", "2.4 km". */
export const formatKm = (km: number) => (km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(1)} km`);
