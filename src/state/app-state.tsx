/*
 * Shopper state kept on the phone: onboarding, favourites, scan history, chosen area and
 * alert preferences. Nothing here needs an account. When a shopper signs in, favourites and
 * scan history are also synced to their account in Supabase (and deleted there when removed),
 * alert preferences and the push token go to `notification_settings`, and their alerts are
 * read live from the `alerts` table.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { ShopperLocation } from '@/design/components';
import type { AlertItem, FuelType, ScanRecord } from '@/data/types';
import { supabase } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { catalogStatus as repoStatus, fetchAlerts, loadCatalog, markAlertsRead } from '@/data/repo';
import { Platform } from 'react-native';
import { useAuth } from './auth';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => { const r = (Math.random() * 16) | 0; return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

export interface AlertPrefs {
  enabled: boolean;
  deals: boolean;
  drops: boolean;
  petrol: boolean;
  /** Quiet hours, 24h clock. */
  quietFrom: number;
  quietTo: number;
}

interface Persisted {
  onboarded: boolean;
  scanGuideSeen: boolean;
  favourites: string[];
  scans: ScanRecord[];
  keepScanHistory: boolean;
  location?: ShopperLocation;
  alerts: AlertPrefs;
  readAlerts: string[];
  preferredFuel: FuelType;
}

const DEFAULTS: Persisted = {
  onboarded: false,
  scanGuideSeen: false,
  favourites: [],
  scans: [],
  keepScanHistory: true,
  alerts: { enabled: false, deals: true, drops: true, petrol: false, quietFrom: 21, quietTo: 8 },
  readAlerts: [],
  preferredFuel: '91',
};

const KEY = 'pm.state.v1';

interface AppState extends Persisted {
  ready: boolean;
  update: (patch: Partial<Persisted>) => void;
  toggleFavourite: (productId: string) => void;
  addScan: (s: Omit<ScanRecord, 'id' | 'scannedAt'>) => void;
  removeScan: (id: string) => ScanRecord | undefined;
  restoreScan: (s: ScanRecord) => void;
  clearScans: () => void;
  /** Goes up whenever live prices change, so screens redraw. */
  catalogVersion: number;
  /** Reload prices now (pull to refresh). */
  refreshCatalog: () => Promise<void>;
  /** Whether live data is loaded, still loading, or couldn't be reached. */
  catalogStatus: 'loading' | 'live' | 'offline';
  /** The signed-in shopper's alerts, newest first (empty when signed out). */
  alertItems: AlertItem[];
  alertsStatus: 'signed-out' | 'loading' | 'ready' | 'error';
  unreadAlerts: number;
  reloadAlerts: () => Promise<void>;
  markAllAlertsRead: () => void;
  /** Turn alerts on: asks for notification permission and saves the push token. */
  enableAlerts: () => Promise<'ok' | 'denied' | 'no-device' | 'error' | 'signed-out'>;
  pushReady: boolean;
}

const Ctx = React.createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Persisted>(DEFAULTS);
  const [ready, setReady] = React.useState(false);
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const { userId } = useAuth();
  const uid = React.useRef<string | undefined>(undefined);
  uid.current = userId;

  React.useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setState({ ...DEFAULTS, ...JSON.parse(raw), alerts: { ...DEFAULTS.alerts, ...JSON.parse(raw).alerts } }); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // On sign-in: merge this phone's favourites and scans with the account's, both ways.
  React.useEffect(() => {
    if (!userId || !ready) return;
    (async () => {
      const [{ data: favs }, { data: scans }] = await Promise.all([
        supabase.from('favourites').select('product_id'),
        supabase.from('scan_history').select('*').order('scanned_at', { ascending: false }).limit(200),
      ]);
      const local = stateRef.current;
      const remoteFavs = (favs ?? []).map((f) => f.product_id as string);
      const pushFavs = local.favourites.filter((f) => !remoteFavs.includes(f) && !f.startsWith('off-'));
      if (pushFavs.length) await supabase.from('favourites').upsert(pushFavs.map((product_id) => ({ user_id: userId, product_id })));
      const remoteScans: ScanRecord[] = (scans ?? []).map(fromRow);
      // Scans made on this phone before signing in: add the ones the account doesn't have yet (one entry per barcode).
      const pushScans = local.scans.filter((sc) => !remoteScans.some((r) => r.barcode === sc.barcode));
      const pushed: ScanRecord[] = [];
      for (const sc of pushScans) {
        const { data } = await supabase.rpc('record_scan', rpcArgs(sc));
        pushed.push(data ? fromRow(data) : sc);
      }
      const merged = [...pushed, ...remoteScans].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, 200);
      update({ favourites: Array.from(new Set([...local.favourites, ...remoteFavs])), scans: merged });
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

  // Live prices: when any price changes in Supabase, reload the catalogue and redraw.
  const [catalogVersion, setCatalogVersion] = React.useState(0);
  const [catalogStatus, setCatalogStatus] = React.useState(repoStatus);
  const refreshCatalog = React.useCallback(async () => {
    const ok = await loadCatalog();
    setCatalogStatus(ok ? 'live' : 'offline');
    if (ok) setCatalogVersion((v) => v + 1);
  }, []);
  // When offline, try again every 30 seconds until live data comes back.
  React.useEffect(() => {
    if (catalogStatus !== 'offline') return;
    const t = setInterval(() => { refreshCatalog(); }, 30000);
    return () => clearInterval(t);
  }, [catalogStatus, refreshCatalog]);

  // Alerts from the backend, live while signed in.
  const [alertItems, setAlertItems] = React.useState<AlertItem[]>([]);
  const [alertsStatus, setAlertsStatus] = React.useState<AppState['alertsStatus']>('signed-out');
  const reloadAlerts = React.useCallback(async () => {
    if (!uid.current) { setAlertItems([]); setAlertsStatus('signed-out'); return; }
    try { setAlertItems(await fetchAlerts()); setAlertsStatus('ready'); } catch { setAlertsStatus('error'); }
  }, []);
  React.useEffect(() => {
    if (!userId) { setAlertItems([]); setAlertsStatus('signed-out'); return; }
    setAlertsStatus('loading');
    reloadAlerts();
    const channel = supabase.channel(`alerts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` }, () => { reloadAlerts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, reloadAlerts]);

  // Alert preferences and push token live in notification_settings for the signed-in shopper.
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const syncSettings = React.useCallback(async (prefs: AlertPrefs, token: string | null) => {
    const u = uid.current;
    if (!u) return;
    await supabase.from('notification_settings').upsert({
      user_id: u, push_token: prefs.enabled ? token : null, platform: Platform.OS,
      drops: prefs.drops, deals: prefs.deals, petrol: prefs.petrol, quiet_from: prefs.quietFrom, quiet_to: prefs.quietTo,
      preferred_fuel: stateRef.current.preferredFuel,
      updated_at: new Date().toISOString(),
    });
  }, []);
  // Re-register quietly on launch when alerts are already on and permission was given before.
  React.useEffect(() => {
    if (!ready || !userId || !state.alerts.enabled) return;
    registerForPush().then((r) => { const t = r.ok ? r.token : null; setPushToken(t); syncSettings(stateRef.current.alerts, t).catch(() => {}); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);
  React.useEffect(() => {
    if (!ready || !userId) return;
    syncSettings(state.alerts, pushToken).catch(() => {});
  }, [state.alerts, state.preferredFuel, pushToken, ready, userId, syncSettings]);
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase.channel('live-prices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prices' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { refreshCatalog(); }, 1500);
      })
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [refreshCatalog]);

  const update = React.useCallback((patch: Partial<Persisted>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value: AppState = {
    ...state,
    ready,
    update,
    catalogVersion,
    refreshCatalog,
    catalogStatus,
    alertItems,
    alertsStatus,
    unreadAlerts: alertItems.filter((a) => !a.read).length,
    reloadAlerts,
    markAllAlertsRead: () => {
      const ids = alertItems.filter((a) => !a.read).map((a) => a.id);
      if (!ids.length) return;
      setAlertItems((list) => list.map((a) => ({ ...a, read: true })));
      markAlertsRead(ids).catch(() => {});
    },
    pushReady: !!pushToken,
    enableAlerts: async () => {
      if (!uid.current) return 'signed-out';
      const r = await registerForPush();
      update({ alerts: { ...stateRef.current.alerts, enabled: true } });
      if (r.ok) { setPushToken(r.token); return 'ok'; }
      return r.reason === 'denied' ? 'denied' : r.reason === 'simulator' ? 'no-device' : 'error';
    },
    toggleFavourite: (id) => {
      const f = stateRef.current.favourites;
      const on = !f.includes(id);
      update({ favourites: on ? [id, ...f] : f.filter((x) => x !== id) });
      const u = uid.current;
      if (u && !id.startsWith('off-')) {
        (on ? supabase.from('favourites').upsert({ user_id: u, product_id: id }) : supabase.from('favourites').delete().eq('product_id', id)).then(() => {}, () => {});
      }
    },
    addScan: (s) => {
      if (!stateRef.current.keepScanHistory) return;
      // One entry per barcode: scanning again moves it to the top with the new time.
      const old = stateRef.current.scans.find((x) => x.barcode === s.barcode);
      const rest = stateRef.current.scans.filter((x) => x.barcode !== s.barcode);
      const rec: ScanRecord = { ...old, ...s, imageUrl: s.imageUrl ?? old?.imageUrl, id: old?.id ?? uuid(), scannedAt: new Date().toISOString(), scanCount: (old?.scanCount ?? 0) + 1 };
      update({ scans: [rec, ...rest].slice(0, 200) });
      if (uid.current) {
        supabase.rpc('record_scan', rpcArgs(rec)).then(({ data }) => {
          if (!data) return;
          const saved = fromRow(data);
          update({ scans: stateRef.current.scans.map((x) => (x.barcode === saved.barcode ? { ...x, id: saved.id, scanCount: saved.scanCount } : x)) });
        }, () => {});
      }
    },
    removeScan: (id) => {
      const found = stateRef.current.scans.find((x) => x.id === id);
      update({ scans: stateRef.current.scans.filter((x) => x.id !== id) });
      if (uid.current && found) supabase.from('scan_history').delete().eq('barcode', found.barcode).then(() => {}, () => {});
      return found;
    },
    restoreScan: (s) => {
      const list = [...stateRef.current.scans.filter((x) => x.barcode !== s.barcode), s].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
      update({ scans: list });
      if (uid.current) supabase.from('scan_history').upsert(toRow(s, uid.current), { onConflict: 'user_id,barcode' }).then(() => {}, () => {});
    },
    clearScans: () => {
      update({ scans: [] });
      if (uid.current) supabase.from('scan_history').delete().eq('user_id', uid.current).then(() => {}, () => {});
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useApp must be inside AppStateProvider');
  return v;
}

function toRow(s: ScanRecord, userId: string) {
  return { ...(isUuid(s.id) ? { id: s.id } : {}), user_id: userId, barcode: s.barcode, product_id: s.productId ?? null, name: s.name, image_url: s.imageUrl ?? null,
    best_price: s.bestPrice ?? null, best_store: s.bestStore ?? null, verdict: s.verdict ?? null, scanned_at: s.scannedAt, scan_count: s.scanCount ?? 1 };
}

function rpcArgs(s: ScanRecord) {
  return { p_barcode: s.barcode, p_product_id: s.productId ?? null, p_name: s.name,
    p_image_url: s.imageUrl ?? null, p_best_price: s.bestPrice ?? null, p_best_store: s.bestStore ?? null, p_scanned_at: s.scannedAt };
}

function fromRow(r: Record<string, any>): ScanRecord {
  return { id: r.id, barcode: r.barcode, productId: r.product_id ?? undefined, name: r.name, imageUrl: r.image_url ?? undefined,
    bestPrice: r.best_price != null ? Number(r.best_price) : undefined, bestStore: r.best_store ?? undefined, verdict: r.verdict ?? undefined,
    scannedAt: r.scanned_at, scanCount: r.scan_count ?? 1 };
}
