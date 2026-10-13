/*
 * Fuel: real NZ stations (OpenStreetMap, ODbL) and station pump prices from a licensed feed.
 * No station price feed is connected yet, so `station_prices` is empty and the app says
 * "Price unavailable" rather than guessing. National averages come from MBIE (see repo.latestFuel).
 */
import { distanceKm, type GeoPoint } from '@/design/components';
import { supabase } from '@/lib/supabase';
import type { FuelAlertRule, FuelStation, FuelType, SourceStatus, StationPrice } from './types';

export const FUEL_LABEL: Record<FuelType, string> = { '91': '91', '95': '95', '98': '98', diesel: 'Diesel' };
/** MBIE's names for the national averages. MBIE publishes no 98 average. */
export const MBIE_FUEL: Record<FuelType, string | null> = { '91': 'Regular Petrol', '95': 'Premium Petrol 95R', '98': null, diesel: 'Diesel' };
/** A pump price counts as "live" only if the feed observed it this recently. */
export const LIVE_MINUTES = 60;
export const STALE_FUEL_HOURS = 48;

let stations: FuelStation[] = [];
let stationPrices: StationPrice[] = [];
let loadedAt = 0;

async function pageAll<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Loads all stations and station prices (cached for 10 minutes unless forced). Throws when offline. */
export async function loadFuel(force = false): Promise<void> {
  if (!force && stations.length && Date.now() - loadedAt < 10 * 60e3) return;
  type Row = Record<string, any>;
  const [s, p] = await Promise.all([
    pageAll<Row>('fuel_stations', 'id,name,brand,lat,lng,street,suburb,city,fuels,opening_hours,source_ref'),
    pageAll<Row>('station_prices', '*'),
  ]);
  stations = s.map((r) => ({
    id: r.id, name: r.name ?? undefined, brand: r.brand ?? undefined, lat: r.lat, lng: r.lng,
    address: [r.street, r.suburb, r.city].filter(Boolean).join(', ') || undefined, fuels: r.fuels ?? [],
    openingHours: r.opening_hours ?? undefined, sourceRef: r.source_ref ?? undefined,
  }));
  stationPrices = p.map((r) => ({ stationId: r.station_id, fuel: r.fuel, centsPerLitre: Number(r.cents_per_litre), observedAt: r.observed_at, sourceName: r.source_name }));
  loadedAt = Date.now();
}

export const stationCount = () => stations.length;
export const priceCount = () => stationPrices.length;

export interface NearbyStation {
  station: FuelStation; km: number;
  /** Price for the chosen fuel, only from a licensed feed and not older than STALE_FUEL_HOURS. */
  price?: StationPrice;
  /** Whether the station is mapped as selling this fuel: true, false, or undefined when unknown. */
  sells?: boolean;
}

export function nearbyStations(at: GeoPoint, fuel: FuelType, radiusKm = 15, limit = 40): NearbyStation[] {
  const now = Date.now();
  return stations
    .map((station) => {
      const km = distanceKm(at, station);
      const sells = station.fuels.length ? station.fuels.includes(fuel) : undefined;
      const p = stationPrices.find((x) => x.stationId === station.id && x.fuel === fuel);
      const price = p && now - Date.parse(p.observedAt) < STALE_FUEL_HOURS * 3600e3 ? p : undefined;
      return { station, km, price, sells };
    })
    .filter((s) => s.km <= radiusKm && s.sells !== false)
    .sort((a, b) => (a.price && b.price ? a.price.centsPerLitre - b.price.centsPerLitre : a.price ? -1 : b.price ? 1 : a.km - b.km))
    .slice(0, limit);
}

export const isLive = (p: StationPrice) => Date.now() - Date.parse(p.observedAt) < LIVE_MINUTES * 60e3;

export function stationTitle(s: FuelStation) {
  if (s.brand && s.name && !s.name.toLowerCase().includes(s.brand.toLowerCase())) return `${s.brand} ${s.name}`;
  return s.name ?? s.brand ?? 'Fuel station';
}

/** Search NZ suburbs, towns and cities by name (OpenStreetMap places). */
export async function searchPlaces(q: string): Promise<{ id: string; label: string; lat: number; lng: number }[]> {
  const term = q.trim().replace(/[%,()]/g, '');
  if (term.length < 2) return [];
  const { data, error } = await supabase.from('places').select('id,name,kind,lat,lng,region,population').ilike('name', `${term}%`).limit(40);
  if (error) throw error;
  const rank: Record<string, number> = { city: 0, town: 1, suburb: 2, quarter: 3, village: 4 };
  return (data ?? [])
    .sort((a, b) => (a.name.length - b.name.length) || (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || (b.population ?? 0) - (a.population ?? 0))
    .slice(0, 12)
    .map((r) => ({ id: r.id, label: r.region ? `${r.name}, ${r.region}` : r.name, lat: r.lat, lng: r.lng }));
}

// ---- Fuel price alert rules (signed-in shoppers) ----
export async function listFuelRules(): Promise<FuelAlertRule[]> {
  const { data, error } = await supabase.from('fuel_alert_rules').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, fuel: r.fuel, maxCents: Number(r.max_cents), lat: r.lat, lng: r.lng, radiusKm: Number(r.radius_km), label: r.label ?? undefined, lastAlertedAt: r.last_alerted_at ?? undefined }));
}
export async function addFuelRule(r: Omit<FuelAlertRule, 'id'>) {
  const { error } = await supabase.from('fuel_alert_rules').insert({ fuel: r.fuel, max_cents: r.maxCents, lat: r.lat, lng: r.lng, radius_km: r.radiusKm, label: r.label ?? null });
  if (error) throw error;
}
export async function removeFuelRule(id: string) {
  const { error } = await supabase.from('fuel_alert_rules').delete().eq('id', id);
  if (error) throw error;
}

export async function sourceStatuses(): Promise<SourceStatus[]> {
  const { data, error } = await supabase.from('source_status').select('*');
  if (error) throw error;
  return (data ?? []).map((r) => ({ source: r.source, ok: r.ok, checkedAt: r.checked_at, rows: r.rows ?? undefined, message: r.message ?? undefined, lastSuccessAt: r.last_success_at ?? undefined }));
}
