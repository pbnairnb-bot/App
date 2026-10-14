import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, ExternalLink, PackageSearch } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { Notice, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { dollars, isOld, observedAgo } from '@/data/retail';
import { categoryItems, retailers, type Retailer, type StoreItem } from '@/data/store';
import { Card, EmptyState, Screen, TopBar } from '@/ui/kit';
import { ProductPhoto } from '@/ui/store-cards';

/** A category: products with saved store prices, then the NZ stores for it and whether their prices are connected. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const [items, setItems] = React.useState<{ state: 'loading' | 'ready' | 'error'; data: StoreItem[] }>({ state: 'loading', data: [] });
  const [stores, setStores] = React.useState<Retailer[]>([]);
  const load = React.useCallback(() => {
    setItems((s) => ({ ...s, state: 'loading' }));
    categoryItems(id).then((data) => setItems({ state: 'ready', data })).catch(() => setItems({ state: 'error', data: [] }));
    retailers().then((all) => setStores(all.filter((r) => r.category === id))).catch(() => {});
  }, [id]);
  React.useEffect(load, [load]);
  const title = CATEGORY_LABELS[id] ?? 'Category';

  return (
    <Screen scroll={false}>
      <TopBar title={title} />
      <FlatList
        data={items.data}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: space[4], gap: space[3], paddingBottom: 48 }}
        ListHeaderComponent={items.state === 'error'
          ? <Notice tone="warning" title="Can't load prices." action={{ label: 'Try again', onPress: load }}>Check your internet connection.</Notice>
          : items.state === 'loading' ? <ActivityIndicator color={c.brand} style={{ marginVertical: space[6] }} /> : null}
        ListEmptyComponent={items.state === 'ready'
          ? <EmptyState icon={PackageSearch} title="No saved prices yet" body={`We haven't collected verified prices for ${title.toLowerCase()} yet. Check the stores below, or search for a product.`} action="Search" onAction={() => router.push('/search')} />
          : null}
        renderItem={({ item }) => <ItemRow it={item} />}
        ListFooterComponent={stores.length ? (
          <View style={{ gap: space[2], marginTop: space[4] }}>
            <Text style={[type.h2, { color: c.ink }]}>Stores for {title.toLowerCase()}</Text>
            {stores.map((r) => (
              <Card key={r.id} style={{ padding: space[3], gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{r.name}</Text>
                  <Text style={[type.caption, { color: r.integration === 'connected' ? c.dealText : c.inkSecondary, fontFamily: 'Inter_600SemiBold' }]}>
                    {r.integration === 'connected' ? 'Prices connected' : 'Prices not connected yet'}
                  </Text>
                </View>
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(r.website)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} color={c.brandText} />
                  <Text style={[type.caption, { color: c.brandText }]}>{r.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        ) : null}
      />
    </Screen>
  );
}

function ItemRow({ it }: { it: StoreItem }) {
  const c = useTheme();
  const old = isOld(it.bestObservedAt);
  return (
    <Card onPress={() => router.push({ pathname: '/item/[id]', params: { id: it.id } })} accessibilityLabel={`${it.name}, ${dollars(it.bestCents)} at ${it.bestStore}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] }}>
      <ProductPhoto uri={it.imageUrl} size={60} label={it.name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{it.name}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{[it.size, it.storeCount > 1 ? `lowest of ${it.storeCount} stores` : it.bestStore].filter(Boolean).join(' · ')}</Text>
        <Text style={[type.caption, { color: old ? c.warning : c.inkTertiary }]}>Seen {observedAgo(it.bestObservedAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[type.priceMd, { color: c.ink }]}>{dollars(it.bestCents)}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{it.bestStore}</Text>
      </View>
      <ChevronRight size={18} color={c.inkTertiary} style={{ marginLeft: -4 }} />
    </Card>
  );
}
