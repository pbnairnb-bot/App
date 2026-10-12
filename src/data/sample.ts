/*
 * SAMPLE DATA ONLY. Every store, product and price in this file is invented for demos and
 * development, and is always shown with the Sample badge. Real prices replace this file once
 * licensed feeds and shopper reports are connected (see the Data plan doc).
 * Store names are deliberately generic ("Example …") so no real retailer offer is ever implied.
 */
import type { AlertItem, PricePoint, Product, Store, StorePrice } from './types';

const AKL_PONSONBY = { lat: -36.8566, lng: 174.7436 };
const AKL_NEWMARKET = { lat: -36.8698, lng: 174.7772 };
const AKL_ALBANY = { lat: -36.7275, lng: 174.6996 };
const WGTN = { lat: -41.2865, lng: 174.7762 };
const CHCH = { lat: -43.531, lng: 172.6366 };
const HAM = { lat: -37.787, lng: 175.279 };

export const SAMPLE_STORES: Store[] = [
  { id: 'eg-grocer', name: 'Example Grocer', short: 'EG', color: '#0e7c66', branches: [AKL_PONSONBY, WGTN, CHCH, HAM], online: true, deliveryFee: 9, isSample: true },
  { id: 'eg-fresh', name: 'Example Fresh Mart', short: 'FM', color: '#b45309', branches: [AKL_NEWMARKET, AKL_ALBANY, WGTN], online: false, isSample: true },
  { id: 'eg-pharm', name: 'Example Pharmacy', short: 'EP', color: '#be123c', branches: [AKL_NEWMARKET, CHCH, HAM], online: true, deliveryFee: 6.5, isSample: true },
  { id: 'eg-tech', name: 'Example Electronics', short: 'EE', color: '#1d4ed8', branches: [AKL_NEWMARKET, AKL_ALBANY, WGTN, CHCH], online: true, deliveryFee: 0, isSample: true },
  { id: 'eg-home', name: 'Example Home & Living', short: 'EH', color: '#7c3aed', branches: [AKL_ALBANY, HAM, CHCH], online: true, deliveryFee: 12, isSample: true },
  { id: 'eg-pets', name: 'Example Pet Store', short: 'PS', color: '#0f766e', branches: [AKL_PONSONBY, WGTN], online: true, deliveryFee: 8, isSample: true },
  { id: 'eg-online', name: 'Example Online', short: 'EO', color: '#334155', branches: [], online: true, deliveryFee: 7.99, isSample: true },
];

type Trend = 'low' | 'normal' | 'high';
interface Spec {
  id: string; name: string; size?: string; unitQty?: number; unit?: Product['unit']; category: string;
  base: number; stores: string[]; trend: Trend; deal?: { store: string; pct: number; endsInH?: number };
  member?: { store: string; price: number };
}

const G = ['eg-grocer', 'eg-fresh', 'eg-online'];
const B = ['eg-pharm', 'eg-grocer', 'eg-online'];
const E = ['eg-tech', 'eg-home', 'eg-online'];
const A = ['eg-home', 'eg-tech', 'eg-online'];

const SPECS: Spec[] = [
  { id: 'milk-2l', name: 'Blue milk', size: '2L', unitQty: 2, unit: 'L', category: 'groceries', base: 4.99, stores: G, trend: 'low', deal: { store: 'eg-fresh', pct: 12 } },
  { id: 'eggs-12', name: 'Free-range eggs', size: '12 pack', unitQty: 12, unit: 'each', category: 'groceries', base: 9.79, stores: G, trend: 'normal', member: { store: 'eg-grocer', price: 8.99 } },
  { id: 'pb-380', name: 'Smooth peanut butter', size: '380g', unitQty: 0.38, unit: 'kg', category: 'groceries', base: 4.79, stores: G, trend: 'low' },
  { id: 'oat-1l', name: 'Oat milk', size: '1L', unitQty: 1, unit: 'L', category: 'groceries', base: 3.79, stores: G, trend: 'normal' },
  { id: 'coffee-1kg', name: 'Coffee beans, medium roast', size: '1kg', unitQty: 1, unit: 'kg', category: 'groceries', base: 27.99, stores: G, trend: 'low', deal: { store: 'eg-grocer', pct: 18, endsInH: 30 } },
  { id: 'bread-750', name: 'Sourdough loaf', size: '750g', unitQty: 0.75, unit: 'kg', category: 'groceries', base: 6.49, stores: G, trend: 'high' },
  { id: 'butter-500', name: 'Salted butter', size: '500g', unitQty: 0.5, unit: 'kg', category: 'groceries', base: 7.99, stores: G, trend: 'normal', member: { store: 'eg-grocer', price: 7.29 } },
  { id: 'dish-60', name: 'Dishwasher tablets', size: '60 pack', unitQty: 60, unit: 'each', category: 'groceries', base: 22.99, stores: G, trend: 'normal' },
  { id: 'shampoo-400', name: 'Everyday shampoo', size: '400ml', unitQty: 0.4, unit: 'L', category: 'beauty', base: 9.99, stores: B, trend: 'normal' },
  { id: 'vitc-120', name: 'Vitamin C 1000mg', size: '120 tablets', unitQty: 120, unit: 'each', category: 'beauty', base: 24.99, stores: B, trend: 'low', deal: { store: 'eg-pharm', pct: 40 } },
  { id: 'spf-200', name: 'SPF 50 sunscreen', size: '200ml', unitQty: 0.2, unit: 'L', category: 'beauty', base: 16.99, stores: B, trend: 'normal' },
  { id: 'moist-100', name: 'Daily moisturiser', size: '100ml', unitQty: 0.1, unit: 'L', category: 'beauty', base: 23.99, stores: B, trend: 'low', deal: { store: 'eg-pharm', pct: 25, endsInH: 5 } },
  { id: 'buds', name: 'Wireless noise-cancelling earbuds', category: 'electronics', base: 109, stores: E, trend: 'low', deal: { store: 'eg-tech', pct: 28 } },
  { id: 'tv-55', name: '55" 4K smart TV', category: 'electronics', base: 899, stores: E, trend: 'normal' },
  { id: 'aa-8', name: 'AA alkaline batteries', size: '8 pack', unitQty: 8, unit: 'each', category: 'electronics', base: 13.99, stores: [...E, 'eg-grocer'], trend: 'low' },
  { id: 'airfryer', name: 'Air fryer 5L', category: 'appliances', base: 199, stores: A, trend: 'low', deal: { store: 'eg-home', pct: 35 } },
  { id: 'vacuum', name: 'Cordless stick vacuum', category: 'appliances', base: 349, stores: A, trend: 'high' },
  { id: 'dog-3kg', name: 'Adult dog food, chicken', size: '3kg', unitQty: 3, unit: 'kg', category: 'pets', base: 33.99, stores: ['eg-pets', 'eg-grocer', 'eg-online'], trend: 'low', deal: { store: 'eg-pets', pct: 18 } },
];

/** Small deterministic random so sample prices stay the same on every launch. */
function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
/** Shelf-style prices: $4.79, $129, $899. */
const shelf = (n: number) => (n >= 100 ? Math.round(n) - (Math.round(n) % 10 === 0 ? 1 : 0) : Math.floor(n) + (n % 1 < 0.5 ? 0.49 : 0.99) - (n < 10 ? 0.2 : 0));
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();

export const SAMPLE_PRODUCTS: Product[] = SPECS.map((s, i) => ({
  id: s.id, name: s.name, size: s.size, unitQty: s.unitQty, unit: s.unit, category: s.category,
  barcode: `20000000${String(100 + i).padStart(5, '0')}`, isSample: true,
}));

export const SAMPLE_PRICES: StorePrice[] = SPECS.flatMap((s) => {
  const r = rand(s.id);
  return s.stores.map((storeId, k) => {
    const factor = k === 0 ? 1 : 1 + (r() * 0.16 - 0.03);
    let price = shelf(s.base * factor);
    let wasPrice: number | undefined;
    let endsAt: string | undefined;
    if (s.deal?.store === storeId) {
      wasPrice = price;
      price = shelf(price * (1 - s.deal.pct / 100));
      if (s.deal.endsInH) endsAt = new Date(Date.now() + s.deal.endsInH * 3600e3).toISOString();
    }
    const member = s.member?.store === storeId ? { memberPrice: s.member.price, memberLabel: 'Member price' } : {};
    const checked = storeId === 'eg-online' ? 75 : Math.round(r() * 20) + 1;
    return { productId: s.id, storeId, price, wasPrice, endsAt, ...member, checkedAt: hoursAgo(checked), source: 'sample' as const, onlineOnly: storeId === 'eg-online' };
  });
});

/** 90 days of daily lowest prices, shaped so each product's verdict matches its spec. */
export function sampleHistory(productId: string): PricePoint[] {
  const spec = SPECS.find((s) => s.id === productId);
  if (!spec) return [];
  const best = Math.min(...SAMPLE_PRICES.filter((p) => p.productId === productId).map((p) => p.price));
  const r = rand(productId + ':h');
  const typical = spec.trend === 'high' ? best * 0.9 : spec.trend === 'low' ? best * 1.12 : best * 1.02;
  const out: PricePoint[] = [];
  for (let d = 89; d >= 1; d--) {
    const wave = Math.sin(d / 9) * 0.03 + (r() - 0.5) * 0.02;
    const promo = d % 29 < 4 && spec.trend !== 'low' ? -0.06 : 0;
    out.push({ date: new Date(Date.now() - d * 86400e3).toISOString().slice(0, 10), price: +(typical * (1 + wave + promo)).toFixed(2) });
  }
  out.push({ date: new Date().toISOString().slice(0, 10), price: best });
  return out;
}

export const SAMPLE_ALERTS: AlertItem[] = [
  { id: 'a1', kind: 'drop', title: 'Price drop', body: 'Air fryer 5L is now cheaper at Example Home & Living.', productId: 'airfryer', at: hoursAgo(2) },
  { id: 'a2', kind: 'deal', title: "Today's deal", body: 'Save 40% on Vitamin C 1000mg at Example Pharmacy.', productId: 'vitc-120', at: hoursAgo(6) },
  { id: 'a3', kind: 'petrol', title: 'Petrol update', body: 'Petrol prices near you appear once a reliable fuel data source is connected.', at: hoursAgo(30), read: true },
];
