import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { sourceStatuses } from '@/data/fuel';
import { latestFuel, pricedCount } from '@/data/repo';
import type { SourceStatus } from '@/data/types';
import { timeAgo } from '@/ui/format';
import { Card, Screen, TopBar } from '@/ui/kit';

/** Where every piece of data in the app comes from, how fresh it is, and what isn't connected yet. */
const SOURCES: { id?: string; title: string; what: string; licence: string; connected: boolean }[] = [
  { id: 'osm-stations', title: 'Fuel stations', what: 'Names, brands, locations and addresses of NZ fuel stations. No prices.', licence: 'OpenStreetMap contributors, ODbL', connected: true },
  { title: 'National fuel averages', what: 'Weekly average pump prices for 91, 95 and diesel across NZ.', licence: 'MBIE weekly fuel price monitoring, CC BY 4.0', connected: true },
  { id: 'open-food-facts', title: 'Product details and photos', what: 'Names, brands, pack sizes, barcodes and photos of products sold in NZ. No prices.', licence: 'Open Food Facts, ODbL / photos CC BY-SA', connected: true },
  { title: 'Shopper price reports', what: 'Prices shoppers report, shown only after we check them.', licence: 'PriceMatch NZ users', connected: true },
  { title: 'Open Prices', what: 'Prices from receipts and price tags shared publicly.', licence: 'Open Food Facts Open Prices, ODbL', connected: true },
  { id: 'osm-places', title: 'Suburbs and towns', what: 'Place names for choosing your area.', licence: 'OpenStreetMap contributors, ODbL', connected: true },
  { id: 'baskt', title: 'Supermarket, pharmacy and pet store prices', what: 'Latest prices seen at Woolworths, PAK\'nSAVE, New World, FreshChoice, SuperValue, Farro, The Warehouse, Bargain Chemist, Life Pharmacy, Unichem, Animates, Petstock and Pet Direct. Observed prices, not live checkout prices.', licence: 'Baskt public API (baskt.nz), used under its terms for consumer tools', connected: true },
  { title: 'Station pump prices', what: 'Prices at individual fuel stations (e.g. Gaspy data via Datamine, or CardLink/PriceWatch).', licence: 'Not connected: needs a paid data licence', connected: false },
  { title: 'Retailers\' own feeds', what: 'Prices, stock and promotions direct from retailers.', licence: 'Not connected: needs retailer or affiliate-network agreements', connected: false },
];

export default function Sources() {
  const c = useTheme();
  const [status, setStatus] = React.useState<SourceStatus[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { sourceStatuses().then(setStatus).catch(() => setFailed(true)); }, []);
  const fuel = latestFuel()[0];

  return (
    <Screen>
      <TopBar title="Where our data comes from" />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <Text style={[type.body, { color: c.inkSecondary }]}>We only show real data from these sources. When a source has nothing for a product or station, we say “Price unavailable” instead of guessing.</Text>
        {!status && !failed && <ActivityIndicator color={c.brand} />}
        {SOURCES.map((s) => {
          const parts = s.id ? (status ?? []).filter((x) => x.source === s.id || x.source.startsWith(`${s.id}-`)) : [];
          // Regional imports report separately; show the oldest successful update and total records.
          const st = parts.length ? { ok: parts.every((x) => x.ok), lastSuccessAt: parts.map((x) => x.lastSuccessAt).filter(Boolean).sort()[0],
            rows: parts.some((x) => x.source !== s.id) ? parts.filter((x) => x.source !== s.id).reduce((n, x) => n + (x.rows ?? 0), 0) : parts[0].rows } : undefined;
          const extra = s.title === 'National fuel averages' && fuel ? `Latest week: ${new Date(fuel.now.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}`
            : s.title === 'Shopper price reports' || s.title === 'Open Prices' ? `${pricedCount()} products with a verified price right now` : null;
          return (
            <Card key={s.title} style={{ padding: space[4], gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: !s.connected ? c.inkTertiary : st && !st.ok ? c.warning : c.deal }} />
                <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{s.title}</Text>
                <Text style={[type.caption, { color: c.inkSecondary }]}>{s.connected ? (st && !st.ok ? 'Problem' : 'Connected') : 'Not connected'}</Text>
              </View>
              <Text style={[type.body, { color: c.inkSecondary }]}>{s.what}</Text>
              <Text style={[type.caption, { color: c.inkTertiary }]}>{s.licence}</Text>
              {st?.lastSuccessAt && <Text style={[type.caption, { color: c.inkSecondary }]}>Updated {timeAgo(st.lastSuccessAt).toLowerCase()}{st.rows && s.id !== 'baskt' ? ` · ${st.rows.toLocaleString('en-NZ')} records` : ''}</Text>}
              {extra && <Text style={[type.caption, { color: c.inkSecondary }]}>{extra}</Text>}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
