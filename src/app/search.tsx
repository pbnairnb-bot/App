import { router, useLocalSearchParams } from 'expo-router';
import { ImageIcon, SearchX } from 'lucide-react-native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { applyFilters, FadeInView, FilterBar, FilterSheet, type Filters, SearchBar, type SortKey, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { formatKm, nzd, unitPrice } from '@/data/compare';
import { search, type Listing } from '@/data/repo';
import { useApp } from '@/state/app-state';
import { Card, EmptyState, SampleBanner, Screen, TopBar, VerdictPill } from '@/ui/kit';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: SortKey }>();
  const c = useTheme();
  const { location } = useApp();
  const [q, setQ] = React.useState(params.q ?? '');
  const [filters, setFilters] = React.useState<Filters>({ sort: params.sort ?? 'relevance', categories: params.category ? [params.category] : undefined });
  const [sheet, setSheet] = React.useState(false);
  const base = React.useMemo(() => search(q, location), [q, location]);
  const results = React.useMemo(() => applyFilters(base, filters, location), [base, filters, location]);
  const title = params.category ? CATEGORY_LABELS[params.category] ?? 'Search' : 'Search';

  return (
    <Screen scroll={false}>
      <TopBar title={title} />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search milk, nappies, TVs…" />
      </View>
      <View style={{ marginTop: space[3] }}>
        <FilterBar filters={filters} onChange={setFilters} onOpenAll={() => setSheet(true)} location={location} onNeedLocation={() => router.push('/location')} resultCount={results.length} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: space[4], gap: space[3], paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View style={{ marginHorizontal: -space[4], marginTop: -space[3] }}><SampleBanner /></View>}
        ListEmptyComponent={<EmptyState icon={SearchX} title="No matches" body={q ? `Nothing found for “${q}”. Try fewer words or clear some filters.` : 'Try clearing some filters.'} action="Clear filters" onAction={() => setFilters({ sort: 'relevance' })} />}
        renderItem={({ item, index }) => <FadeInView index={Math.min(index, 8)}><ResultRow l={item} /></FadeInView>}
      />
      <FilterSheet visible={sheet} items={base} filters={filters} onApply={(f) => { setFilters(f); setSheet(false); }} onClose={() => setSheet(false)} location={location} categoryLabels={CATEGORY_LABELS} />
    </Screen>
  );
}

function ResultRow({ l }: { l: Listing }) {
  const c = useTheme();
  const up = unitPrice(l.price, l.product);
  return (
    <Card onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.id } })} accessibilityLabel={`${l.product.name}, best ${nzd(l.price)} at ${l.best.store.name}`}
      style={{ flexDirection: 'row', gap: space[3], padding: space[3], alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        <ImageIcon size={24} color={c.inkTertiary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{l.product.name}{l.product.size ? ` ${l.product.size}` : ''}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>
          {l.best.store.name}{l.best.km != null ? ` · ${formatKm(l.best.km)}` : ''}{l.storeCount > 1 ? ` · lowest of ${l.storeCount}` : ''}{l.isSample ? ' · Sample' : ''}
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
