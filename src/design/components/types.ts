import type { GeoPoint } from './filters';

export type BadgeTone = 'deal' | 'limited' | 'best' | 'save' | 'sample';
export type LoadState = 'ready' | 'loading' | 'empty' | 'error';

export interface Deal {
  id: string;
  product: string;
  retailer: string;
  price: number;
  /** Only when the original price is verified. */
  wasPrice?: number;
  label?: BadgeTone;
  /** Only when reliable, e.g. "Ends Sunday". */
  endsLabel?: string;
  imageUrl?: string;
  /** Development or demo data: always shows the Sample badge. */
  isSample?: boolean;
  /** Reliable end time (ISO 8601): live countdown; hidden once passed. */
  endsAt?: string;
  /** Our last recorded verified price: drives "Price drop" banners. */
  lastPrice?: number;
  /** Retailers compared: drives "Lowest of N stores" banners. */
  storesCompared?: number;
  category?: string;
  stores?: GeoPoint[];
  regions?: string[];
  /** Admin override for the banner headline. */
  headline?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  wasPrice?: number;
  where: string;
  imageUrl?: string;
  badge?: BadgeTone;
  isSample?: boolean;
  retailer?: string;
  category?: string;
  stores?: GeoPoint[];
  regions?: string[];
}

export const formatNZD = (n: number) => `$${n.toFixed(2)}`;
