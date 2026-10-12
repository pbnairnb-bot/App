/*
 * Shopper state kept on the phone: onboarding, favourites, scan history, chosen area and
 * alert preferences. Nothing here needs an account. When a shopper signs in, favourites and
 * scan history are also synced to their account in Supabase (and deleted there when removed).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { ShopperLocation } from '@/design/components';
import type { ScanRecord } from '@/data/types';
import { supabase } from '@/lib/supabase';
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
}

const DEFAULTS: Persisted = {
  onboarded: false,
  scanGuideSeen: false,
  favourites: [],
  scans: [],
  keepScanHistory: true,
  alerts: { enabled: false, deals: true, drops: true, petrol: false, quietFrom: 21, quietTo: 8 },
  readAlerts: [],
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
        supabase.from('scan_history').select('*').order('scanned_at', { ascending: false }).limit(100),
      ]);
      const local = stateRef.current;
      const remoteFavs = (favs ?? []).map((f) => f.product_id as string);
      const pushFavs = local.favourites.filter((f) => !remoteFavs.includes(f) && !f.startsWith('off-'));
      if (pushFavs.length) await supabase.from('favourites').upsert(pushFavs.map((product_id) => ({ user_id: userId, product_id })));
      const remoteScans: ScanRecord[] = (scans ?? []).map((r) => ({
        id: r.id, barcode: r.barcode, productId: r.product_id ?? undefined, name: r.name, bestPrice: r.best_price != null ? Number(r.best_price) : undefined,
        bestStore: r.best_store ?? undefined, verdict: r.verdict ?? undefined, scannedAt: r.scanned_at,
      }));
      const pushScans = local.scans.filter((sc) => !remoteScans.some((r) => r.id === sc.id)).map((sc) => ({ ...sc, id: isUuid(sc.id) ? sc.id : uuid() }));
      if (pushScans.length) await supabase.from('scan_history').upsert(pushScans.map((sc) => toRow(sc, userId)));
      const merged = [...pushScans, ...remoteScans].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, 100);
      update({ favourites: Array.from(new Set([...local.favourites, ...remoteFavs])), scans: merged });
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

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
      const old = stateRef.current.scans.filter((x) => x.barcode === s.barcode);
      const rest = stateRef.current.scans.filter((x) => x.barcode !== s.barcode);
      const rec: ScanRecord = { ...s, id: uuid(), scannedAt: new Date().toISOString() };
      update({ scans: [rec, ...rest].slice(0, 100) });
      const u = uid.current;
      if (u) {
        if (old.length) supabase.from('scan_history').delete().in('id', old.map((o) => o.id).filter(isUuid)).then(() => {}, () => {});
        supabase.from('scan_history').insert(toRow(rec, u)).then(() => {}, () => {});
      }
    },
    removeScan: (id) => {
      const found = stateRef.current.scans.find((x) => x.id === id);
      update({ scans: stateRef.current.scans.filter((x) => x.id !== id) });
      if (uid.current && isUuid(id)) supabase.from('scan_history').delete().eq('id', id).then(() => {}, () => {});
      return found;
    },
    restoreScan: (s) => {
      const list = [...stateRef.current.scans.filter((x) => x.id !== s.id), s].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
      update({ scans: list });
      if (uid.current && isUuid(s.id)) supabase.from('scan_history').upsert(toRow(s, uid.current)).then(() => {}, () => {});
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
  return { id: s.id, user_id: userId, barcode: s.barcode, product_id: s.productId ?? null, name: s.name, best_price: s.bestPrice ?? null, best_store: s.bestStore ?? null, verdict: s.verdict ?? null, scanned_at: s.scannedAt };
}
