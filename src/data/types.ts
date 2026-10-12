import type { GeoPoint } from '@/design/components';

/** Where a price came from. Only 'feed' and 'shopper' are real; 'sample' is demo data and always labelled. */
export type PriceSource = 'feed' | 'shopper' | 'sample';

export interface Store {
  id: string;
  name: string;
  /** Two-letter mark used until the store's own logo is licensed. */
  short: string;
  /** Badge colour for the mark. */
  color: string;
  logoUrl?: string;
  /** Physical branches; empty = online only. */
  branches: GeoPoint[];
  online: boolean;
  /** Delivery or click-and-collect fee for online orders, when known. */
  deliveryFee?: number;
  /** Name in the price-match policy list, when the store has a policy. */
  policyRetailer?: string;
  isSample?: boolean;
}

export type Unit = 'L' | 'kg' | 'each';

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  /** Pack size as printed, e.g. "2L", "500g". */
  size?: string;
  /** Quantity in `unit`, for unit pricing: 2 (L), 0.5 (kg), 12 (each). */
  unitQty?: number;
  unit?: Unit;
  category: string;
  imageUrl?: string;
  isSample?: boolean;
}

export interface StorePrice {
  productId: string;
  storeId: string;
  price: number;
  /** Only when the earlier price is verified. */
  wasPrice?: number;
  /** Loyalty-card price, never mixed with the shelf price. */
  memberPrice?: number;
  memberLabel?: string;
  /** ISO time the price was last checked. */
  checkedAt: string;
  source: PriceSource;
  /** Reliable end time for a promotion. */
  endsAt?: string;
  onlineOnly?: boolean;
}

/** One day's lowest price, for the 90-day history. */
export interface PricePoint { date: string; price: number }

export interface ScanRecord {
  id: string;
  barcode: string;
  productId?: string;
  name: string;
  bestPrice?: number;
  bestStore?: string;
  verdict?: string;
  scannedAt: string;
}

export interface AlertItem {
  id: string;
  kind: 'deal' | 'drop' | 'petrol';
  title: string;
  body: string;
  productId?: string;
  at: string;
  read?: boolean;
}
