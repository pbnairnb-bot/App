import React from 'react';
import * as Location from 'expo-location';
import { distanceKm, NZ_PLACES, type GeoPoint, type ShopperLocation } from './filters';

export type LocationStatus = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';

/** Nearest known place, used for the region when reverse geocoding gives none. */
export function nearestPlace(p: GeoPoint): ShopperLocation {
  return NZ_PLACES.reduce((best, x) => (distanceKm(p, x) < distanceKm(p, best) ? x : best), NZ_PLACES[0]);
}

/**
 * The shopper's location. Asks the OS only when `requestDevice` is called from a button
 * the shopper taps (never on launch), and always allows a manual choice instead.
 * Persist the returned `location` yourself (e.g. AsyncStorage) — never store a history.
 */
export function useShopperLocation(initial?: ShopperLocation) {
  const [location, setLocation] = React.useState<ShopperLocation | undefined>(initial);
  const [status, setStatus] = React.useState<LocationStatus>('unknown');

  React.useEffect(() => {
    // Read the current permission without prompting, so a returning shopper is not asked again.
    Location.getForegroundPermissionsAsync().then((p) => {
      if (p.status === 'granted') setStatus('granted');
      else if (p.status === 'denied' && !p.canAskAgain) setStatus('denied');
    }).catch(() => setStatus('unavailable'));
  }, []);

  const requestDevice = React.useCallback(async () => {
    try {
      setStatus('requesting');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setStatus('denied'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const [geo] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng }).catch(() => []);
      const near = nearestPlace(p);
      const label = geo ? [geo.district ?? geo.subregion, geo.city].filter(Boolean).join(', ') || near.label : `Near ${near.label}`;
      setLocation({ ...p, label, region: geo?.region ?? near.region, source: 'device' });
      setStatus('granted');
    } catch {
      setStatus('unavailable');
    }
  }, []);

  const setManual = React.useCallback((place: ShopperLocation) => setLocation({ ...place, source: 'manual' }), []);
  return { location, status, requestDevice, setManual };
}
