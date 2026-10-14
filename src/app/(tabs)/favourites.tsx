import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { FadeInView, ProductCard, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { listings } from '@/data/repo';
import { supabase } from '@/lib/supabase';
import type { StoreItem } from '@/data/store';
import { useApp } from '@/state/app-state';
import { toCard } from '@/ui/format';
import { EmptyState, Screen, TAB_BAR_SPACE } from '@/ui/kit';
import { ItemCard } from '@/ui/store-cards';

export default function Favourites() {
  const c = useTheme();
  const { favourites, toggleFavourite, location, catalogVersion } = useApp();
  const items = React.useMemo(() => {
    const all = listings(location);
    return favourites.map((id) => all.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
  }, [favourites, location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Saved store-price items (ids like 'gtin:…').
  const storeIds = favourites.filter((f) => f.includes(':'));
  const [storeItems, setStoreItems] = React.useState<StoreItem[]>([]);
  React.useEffect(() => {
    if (!storeIds.length) { setStoreItems([]); return; }
    (async () => {
      const { data } = await supabase.from('retail_item_summary')
        .select('id,name,brand,size,gtin,category,image_url,image_source,store_count,best_cents,best_store,best_was_cents,best_observed_at,top_cents,last_observed_at').in('id', storeIds);
      setStoreItems((data ?? []).map((r: any) => ({ id: r.id, name: r.name, brand: r.brand, size: r.size, gtin: r.gtin, category: r.category, imageUrl: r.image_url, imageSource: r.image_source,
        storeCount: r.store_count, bestCents: r.best_cents, bestStore: r.best_store, bestWasCents: r.best_was_cents, bestObservedAt: r.best_observed_at, topCents: r.top_cents, lastObservedAt: r.last_observed_at })));
    })().catch(() => {});
  }, [storeIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = items.length === 0 && storeItems.length === 0;
  return (
    <Screen bottomSpace={TAB_BAR_SPACE}>
      <Text accessibilityRole="header" style={[type.h1, { color: c.ink, padding: space[4] }]}>Favourites</Text>
      {empty ? (
        <EmptyState icon={Heart} title="No favourites yet" body="Tap the heart on any product to keep an eye on its price. We'll alert you when a saved product's price drops." action="Browse products" onAction={() => router.push('/categories')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[4] }}>
          {storeItems.map((it, i) => <FadeInView key={it.id} index={i}><ItemCard it={it} /></FadeInView>)}
          {items.map((l, i) => (
            <FadeInView key={l.id} index={i} style={{ width: '48%' }}>
              <ProductCard width="100%" product={toCard(l)} isFavourite onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.id } })} onToggleFavourite={() => toggleFavourite(l.id)} />
            </FadeInView>
          ))}
        </View>
      )}
    </Screen>
  );
}
