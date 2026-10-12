/*
 * PriceMatch NZ — filtering, sorting and relevance for deals and products.
 * Pure TypeScript with no UI: the same file is used by the web components
 * (components/src) and the app (native/components/filters.ts — keep them identical).
 */

export interface GeoPoint { lat: number; lng: number }

/** Where the shopper is: from the phone's location (with permission) or picked by hand. */
export interface ShopperLocation extends GeoPoint {
  label: string;               // "Ponsonby, Auckland"
  region?: string;             // "Auckland"
  source: 'device' | 'manual';
}

/** Anything that can be filtered: a deal or a product offer. */
export interface Filterable {
  id: string;
  price: number;
  wasPrice?: number;
  retailer?: string;
  category?: string;
  /** Physical stores where the price applies. Empty or missing = online or nationwide. */
  stores?: GeoPoint[];
  /** Regions the price applies in, e.g. ["Auckland", "Waikato"]. Missing = nationwide. */
  regions?: string[];
  /** ISO 8601 end time, when reliable. */
  endsAt?: string;
}

export type SortKey = 'relevance' | 'biggest-saving' | 'lowest-price' | 'nearest' | 'ending-soon';

export interface Filters {
  categories?: string[];
  retailers?: string[];
  /** Only offers with a store within this many km of the shopper (online/nationwide always pass). */
  maxDistanceKm?: number;
  /** Only offers saving at least this many percent (needs a verified was-price). */
  minSavingPct?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Hide offers only valid in physical stores (keep online/nationwide only). */
  onlineOnly?: boolean;
  sort?: SortKey;
}

export interface Preferences {
  favouriteCategories?: string[];
  favouriteRetailers?: string[];
}

export const DISTANCE_OPTIONS_KM = [2, 5, 10, 25, 50] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Best for you',
  'biggest-saving': 'Biggest saving',
  'lowest-price': 'Lowest price',
  nearest: 'Nearest',
  'ending-soon': 'Ending soon',
};

/** Great-circle distance in km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance to the nearest store, or null when the offer has no physical stores (online/nationwide). */
export function nearestStoreKm(item: Filterable, at?: GeoPoint): number | null {
  if (!at || !item.stores || item.stores.length === 0) return null;
  return Math.min(...item.stores.map((s) => distanceKm(at, s)));
}

/** Verified saving in percent, or 0 when there is no verified was-price. */
export function savingPct(item: Filterable): number {
  return item.wasPrice != null && item.wasPrice > item.price ? Math.round((1 - item.price / item.wasPrice) * 100) : 0;
}

/** Number of filters in use (for the "Filters (3)" button). Sort is not counted. */
export function activeFilterCount(f: Filters): number {
  return (f.categories?.length ? 1 : 0) + (f.retailers?.length ? 1 : 0) + (f.maxDistanceKm != null ? 1 : 0)
    + (f.minSavingPct ? 1 : 0) + (f.minPrice != null || f.maxPrice != null ? 1 : 0) + (f.onlineOnly ? 1 : 0);
}

function passes(item: Filterable, f: Filters, loc: ShopperLocation | undefined, now: number): boolean {
  if (item.endsAt && Date.parse(item.endsAt) <= now) return false;                       // expired
  if (f.categories?.length && (!item.category || !f.categories.includes(item.category))) return false;
  if (f.retailers?.length && (!item.retailer || !f.retailers.includes(item.retailer))) return false;
  if (f.minSavingPct && savingPct(item) < f.minSavingPct) return false;
  if (f.minPrice != null && item.price < f.minPrice) return false;
  if (f.maxPrice != null && item.price > f.maxPrice) return false;
  const physical = !!item.stores?.length;
  if (f.onlineOnly && physical) return false;
  if (loc?.region && item.regions?.length && !item.regions.includes(loc.region)) return false; // not sold in the shopper's region
  if (f.maxDistanceKm != null && physical) {
    const d = nearestStoreKm(item, loc);
    if (d == null || d > f.maxDistanceKm) return false;
  }
  return true;
}

/** Relevance: savings first, then nearness, then the shopper's favourite categories and retailers. */
function relevance(item: Filterable, loc: ShopperLocation | undefined, prefs: Preferences): number {
  let score = savingPct(item);                                                           // 0–100
  const d = nearestStoreKm(item, loc);
  if (d != null) score += Math.max(0, 30 - d);                                          // up to +30 for very close stores
  if (item.category && prefs.favouriteCategories?.includes(item.category)) score += 25;
  if (item.retailer && prefs.favouriteRetailers?.includes(item.retailer)) score += 15;
  return score;
}

/**
 * Applies filters, then sorts. Works for deals, products and petrol prices alike.
 * Never changes prices: it only hides and orders verified data.
 */
export function applyFilters<T extends Filterable>(
  items: T[], f: Filters = {}, loc?: ShopperLocation, prefs: Preferences = {}, now: number = Date.now(),
): T[] {
  const out = items.filter((i) => passes(i, f, loc, now));
  const far = Number.POSITIVE_INFINITY;
  const by: Record<SortKey, (a: T, b: T) => number> = {
    relevance: (a, b) => relevance(b, loc, prefs) - relevance(a, loc, prefs),
    'biggest-saving': (a, b) => savingPct(b) - savingPct(a),
    'lowest-price': (a, b) => a.price - b.price,
    nearest: (a, b) => (nearestStoreKm(a, loc) ?? far) - (nearestStoreKm(b, loc) ?? far),
    'ending-soon': (a, b) => (a.endsAt ? Date.parse(a.endsAt) : far) - (b.endsAt ? Date.parse(b.endsAt) : far),
  };
  return out.sort(by[f.sort ?? 'relevance']);
}

/** Facets for the filter sheet: which categories and retailers exist in the current data, with counts. */
export function facets(items: Filterable[]): { categories: Array<[string, number]>; retailers: Array<[string, number]> } {
  const count = (key: (i: Filterable) => string | undefined) => {
    const m = new Map<string, number>();
    for (const i of items) { const k = key(i); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  return { categories: count((i) => i.category), retailers: count((i) => i.retailer) };
}

/** A few NZ places for manual location choice before a real suburb search is connected. */
export const NZ_PLACES: ShopperLocation[] = [
  { label: 'Auckland CBD', region: 'Auckland', lat: -36.8485, lng: 174.7633, source: 'manual' },
  { label: 'Ponsonby, Auckland', region: 'Auckland', lat: -36.8566, lng: 174.7436, source: 'manual' },
  { label: 'Manukau, Auckland', region: 'Auckland', lat: -36.9928, lng: 174.8799, source: 'manual' },
  { label: 'Hamilton', region: 'Waikato', lat: -37.787, lng: 175.2793, source: 'manual' },
  { label: 'Tauranga', region: 'Bay of Plenty', lat: -37.6878, lng: 176.1651, source: 'manual' },
  { label: 'Wellington CBD', region: 'Wellington', lat: -41.2865, lng: 174.7762, source: 'manual' },
  { label: 'Christchurch', region: 'Canterbury', lat: -43.5321, lng: 172.6362, source: 'manual' },
  { label: 'Dunedin', region: 'Otago', lat: -45.8788, lng: 170.5028, source: 'manual' },
];
