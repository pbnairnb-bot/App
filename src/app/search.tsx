import { router, useLocalSearchParams } from 'expo-router';
import { Barcode, ChevronRight, ImageIcon, SearchX } from 'lucide-react-native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { applyFilters, FadeInView, FilterBar, FilterSheet, type Filters, SearchBar, type SortKey, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { formatKm, freshness, nzd, unitPrice } from '@/data/compare';
import { search, searchAllProducts, type Listing } from '@/data/repo';
import type { Product } from '@/data/types';
import { Image } from 'expo-image';
import { useApp } from '@/state/app-state';
import { Card, EmptyState, LiveDataNotice, Screen, TopBar, VerdictPill } from '@/ui/kit';
import { ListeningSheet, MicButton, useVoice } from '@/ui/voice';
import { RetailCard } from '@/ui/retail';
import { RetailError, searchRetail, type RetailResult } from '@/data/retail';
import { ActivityIndicator } from 'react-native';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: SortKey; voice?: string }>();
  const c = useTheme();
  const { location, catalogVersion, refreshCatalog, catalogStatus } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const [q, setQ] = React.useState(params.q ?? '');
  const [filters, setFilters] = React.useState<Filters>({ sort: params.sort ?? 'relevance', categories: params.category ? [params.category] : undefined });
  const [sheet, setSheet] = React.useState(false);
  const base = React.useMemo(() => search(q, location), [q, location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const results = React.useMemo(() => applyFilters(base, filters, location), [base, filters, location]);
  // Every other NZ product matching the words, even without prices yet.
  const [more, setMore] = React.useState<Product[]>([]);
  React.useEffect(() => {
    if (q.trim().length < 2) { setMore([]); return; }
    let alive = true;
    const t = setTimeout(() => searchAllProducts(q).then((r) => { if (alive) setMore(r); }), 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  // Supermarket, pharmacy and pet-store prices (observed, via our server).
  const [retail, setRetail] = React.useState<{ state: 'idle' | 'loading' | 'ready' | 'error'; data?: RetailResult; error?: string }>({ state: 'idle' });
  const [retailTry, setRetailTry] = React.useState(0);
  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || /^\d{8,14}$/.test(term)) { setRetail({ state: 'idle' }); return; }
    const ctl = new AbortController();
    setRetail((r) => ({ state: 'loading', data: r.data }));
    const t = setTimeout(() => {
      searchRetail(term, location, ctl.signal)
        .then((data) => setRetail({ state: 'ready', data }))
        .catch((e) => { if ((e as Error).name !== 'AbortError') setRetail({ state: 'error', error: e instanceof RetailError ? e.message : 'Store prices can’t be reached right now.' }); });
    }, 450);
    return () => { ctl.abort(); clearTimeout(t); };
  }, [q, location, retailTry]);
  const hints = React.useMemo(() => base.map((l) => l.product.name), [base]);
  const voice = useVoice((t) => setQ(t), hints);
  React.useEffect(() => { if (params.voice) voice.start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const title = params.category ? CATEGORY_LABELS[params.category] ?? 'Search' : 'Search';

  return (
    <Screen scroll={false}>
      <TopBar title={title} />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <View style={{ flex: 1 }}><SearchBar value={q} onChangeText={setQ} placeholder="Product name or barcode number" /></View>
          <MicButton size={48} listening={voice.listening} onPress={voice.listening ? voice.stop : voice.start} />
        </View>
      </View>
      <View style={{ marginTop: space[3] }}>
        <FilterBar filters={filters} onChange={setFilters} onOpenAll={() => setSheet(true)} location={location} onNeedLocation={() => router.push('/location')} resultCount={results.length} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: space[4], gap: space[3], paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refreshCatalog(); setRefreshing(false); }}
        ListHeaderComponent={
          <>
            {catalogStatus !== 'live' && <View style={{ marginHorizontal: -space[4], marginTop: -space[3] }}><LiveDataNotice status={catalogStatus} onRetry={refreshCatalog} /></View>}
            {/^\d{8,14}$/.test(q.trim()) && (
              <Card onPress={() => router.push({ pathname: '/barcode/[code]', params: { code: q.trim() } })} accessibilityLabel={`Look up barcode ${q.trim()}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] }}>
                <Barcode size={24} color={c.brandText} />
                <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>Look up barcode {q.trim()}</Text>
                <ChevronRight size={18} color={c.inkTertiary} />
              </Card>
            )}
          </>
        }
        ListFooterComponent={
          <View style={{ gap: space[3] }}>
            {retail.state !== 'idle' && (
              <View style={{ gap: space[2], marginTop: results.length ? space[4] : 0 }}>
                <Text style={[type.h2, { color: c.ink }]}>Supermarket, pharmacy and pet store prices</Text>
                {retail.state === 'loading' && <ActivityIndicator color={c.brand} style={{ marginVertical: space[4] }} />}
                {retail.state === 'error' && (
                  <Card style={{ padding: space[4], gap: space[2] }}>
                    <Text style={[type.bodyStrong, { color: c.ink }]}>Price unavailable</Text>
                    <Text style={[type.body, { color: c.inkSecondary }]}>{retail.error} We don't show prices we can't check.</Text>
                    <Text onPress={() => setRetailTry((n) => n + 1)} style={[type.bodyStrong, { color: c.brandText }]}>Try again</Text>
                  </Card>
                )}
                {retail.state === 'ready' && retail.data && (
                  <>
                    {retail.data.products.length === 0
                      ? <Text style={[type.body, { color: c.inkSecondary }]}>No observed prices for “{q.trim()}” at {retail.data.chainsSearched.length} NZ chains. Try a brand or a simpler name.</Text>
                      : retail.data.products.map((p, i) => <RetailCard key={`${p.name}-${p.size}-${i}`} p={p} />)}
                    <Text style={[type.caption, { color: c.inkTertiary }]}>
                      Prices from Baskt (baskt.nz): the latest prices seen at {retail.data.chainsSearched.join(', ')}. These are not live checkout prices and may have changed; check with the store. Woolworths prices are its online delivery-zone prices.
                      {retail.data.chainsFailed.length ? ` Couldn't reach: ${retail.data.chainsFailed.join(', ')}.` : ''}
                    </Text>
                  </>
                )}
              </View>
            )}
            {more.length > 0 && (
              <View style={{ gap: space[2], marginTop: space[4] }}>
                <Text style={[type.h2, { color: c.ink }]}>More NZ products</Text>
                <Text style={[type.body, { color: c.inkSecondary, marginBottom: space[1] }]}>Product details only. Tap one to see it or share a price you've seen.</Text>
                {more.map((p) => <MoreRow key={p.id} p={p} />)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={more.length || retail.state !== 'idle' ? null : <EmptyState icon={SearchX} title="No matches" body={q ? `Nothing found for “${q}”. Try fewer words or clear some filters.` : 'Try clearing some filters.'} action="Clear filters" onAction={() => setFilters({ sort: 'relevance' })} />}
        renderItem={({ item, index }) => <FadeInView index={Math.min(index, 8)}><ResultRow l={item} /></FadeInView>}
      />
      <ListeningSheet visible={voice.listening || !!voice.error} partial={voice.partial} error={voice.error}
        onStop={() => { voice.stop(); voice.clearError(); }} onRetry={voice.start} />
      <FilterSheet visible={sheet} items={base} filters={filters} onApply={(f) => { setFilters(f); setSheet(false); }} onClose={() => setSheet(false)} location={location} categoryLabels={CATEGORY_LABELS} />
    </Screen>
  );
}

function MoreRow({ p }: { p: Product }) {
  const c = useTheme();
  return (
    <Card onPress={() => router.push({ pathname: '/barcode/[code]', params: { code: p.barcode ?? '' } })} accessibilityLabel={`${p.name}, no prices yet`}
      style={{ flexDirection: 'row', gap: space[3], padding: space[3], alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <ImageIcon size={22} color={c.inkTertiary} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{p.name}{p.size ? ` ${p.size}` : ''}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{[p.brand, 'No prices yet'].filter(Boolean).join(' · ')}</Text>
      </View>
    </Card>
  );
}

function ResultRow({ l }: { l: Listing }) {
  const c = useTheme();
  const up = unitPrice(l.price, l.product);
  return (
    <Card onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.id } })} accessibilityLabel={`${l.product.name}, best ${nzd(l.price)} at ${l.best.store.name}`}
      style={{ flexDirection: 'row', gap: space[3], padding: space[3], alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {l.product.imageUrl ? <Image source={{ uri: l.product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <ImageIcon size={24} color={c.inkTertiary} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{l.product.name}{l.product.size ? ` ${l.product.size}` : ''}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>
          {l.best.store.name}{l.best.km != null ? ` · ${formatKm(l.best.km)}` : ''}{l.storeCount > 1 ? ` · lowest of ${l.storeCount}` : ''}{l.best.stale ? ` · ${freshness(l.best.checkedAt)}` : ''}
        </Text>
        {l.verdictLabel && <VerdictPill label={l.verdictLabel} tone={l.verdictLabel.startsWith('Lowest') ? 'good' : l.verdictLabel.startsWith('Higher') ? 'high' : 'normal'} />}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.priceMd, { color: c.ink }]}>{nzd(l.price)}</Text>
        {l.wasPrice != null && <Text style={[type.caption, { color: c.inkTertiary, textDecorationLine: 'line-through' }]}>{nzd(l.wasPrice)}</Text>}
        {up && <Text style={[type.caption, { color: c.inkSecondary }]}>{up}</Text>}
      </View>
    </Card>
  );
}
