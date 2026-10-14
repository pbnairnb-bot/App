import { router, useLocalSearchParams } from 'expo-router';
import { ExternalLink, Heart, PackageSearch, Share2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, Share, Text, useWindowDimensions, View } from 'react-native';
import { Button, FadeInView, Notice, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { dollars, isOld, observedAgo } from '@/data/retail';
import { storeItem } from '@/data/store';
import { useApp } from '@/state/app-state';
import { Card, EmptyState, IconButton, Screen, SectionHeader, Sparkline, TopBar } from '@/ui/kit';
import { ProductPhoto } from '@/ui/store-cards';

type Data = NonNullable<Awaited<ReturnType<typeof storeItem>>>;

/** One product's saved store prices: every store's latest observed price, lowest first, with history and links. */
export default function StoreItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const { favourites, toggleFavourite } = useApp();
  const [s, setS] = React.useState<{ state: 'loading' | 'ready' | 'missing' | 'error'; data?: Data }>({ state: 'loading' });
  const load = React.useCallback(() => {
    setS({ state: 'loading' });
    storeItem(id).then((data) => setS(data ? { state: 'ready', data } : { state: 'missing' })).catch(() => setS({ state: 'error' }));
  }, [id]);
  React.useEffect(load, [load]);

  if (s.state === 'loading') return <Screen><TopBar /><ActivityIndicator color={c.brand} style={{ marginTop: space[12] }} /></Screen>;
  if (s.state === 'error') return <Screen><TopBar /><View style={{ padding: space[4] }}><Notice tone="warning" title="Can't load prices." action={{ label: 'Try again', onPress: load }}>Check your internet connection.</Notice></View></Screen>;
  if (s.state === 'missing' || !s.data) return <Screen><TopBar /><EmptyState icon={PackageSearch} title="Product not found" body="Its prices may have been removed. Try searching for it." action="Search" onAction={() => router.replace('/search')} /></Screen>;

  const { item, offers, history } = s.data;
  const fav = favourites.includes(item.id);
  const compared = offers.length > 1;
  const best = offers[0];
  const saving = compared ? offers[offers.length - 1].priceCents - best.priceCents : 0;
  // History of the lowest observed price per day across stores.
  const byDay = new Map<string, number>();
  history.forEach((h) => { const d = h.observedAt.slice(0, 10); byDay.set(d, Math.min(byDay.get(d) ?? Infinity, h.priceCents)); });
  const points = [...byDay.entries()].sort().map(([date, cents]) => ({ date, price: cents / 100 }));

  return (
    <Screen>
      <TopBar right={
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <IconButton icon={Share2} label="Share" onPress={() => Share.share({ message: `${item.name}${item.size ? ` ${item.size}` : ''}: ${dollars(best.priceCents)} at ${best.store} (last seen ${observedAgo(best.observedAt)}) — PriceMatch NZ` }).catch(() => {})} />
          <IconButton icon={Heart} label={fav ? 'Remove from favourites' : 'Save to favourites'} color={fav ? c.brandText : c.ink} onPress={() => toggleFavourite(item.id)} />
        </View>
      } />
      <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <View style={{ alignItems: 'center', padding: space[3], borderRadius: radius.lg, backgroundColor: '#fff' }}>
          <ProductPhoto uri={item.imageUrl} size={180} label={item.name} />
        </View>
        {item.imageSource && <Text style={[type.caption, { color: c.inkTertiary }]}>Photo: {item.imageSource}</Text>}
        <Text style={[type.caption, { color: c.inkSecondary }]}>{[CATEGORY_LABELS[item.category], item.gtin].filter(Boolean).join(' · ')}</Text>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>{item.name}</Text>
        {item.size && <Text style={[type.bodyLg, { color: c.inkSecondary }]}>{item.size}</Text>}
      </FadeInView>

      <FadeInView index={1} style={{ marginHorizontal: space[4], marginTop: space[4] }}>
        <Card style={{ padding: space[4], gap: space[2], borderWidth: 2, borderColor: isOld(best.observedAt) ? c.border : c.deal }}>
          <Text style={[type.badge, { color: c.dealText }]}>{compared ? `LOWEST OF ${offers.length} STORES` : 'ONLY SEEN AT 1 STORE'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
            <Text style={[type.priceMd, { color: c.ink, fontSize: 32 }]}>{dollars(best.priceCents)}</Text>
            {best.wasCents != null && <Text style={[type.bodyLg, { color: c.inkTertiary, textDecorationLine: 'line-through' }]}>{dollars(best.wasCents)}</Text>}
          </View>
          <Text style={[type.bodyStrong, { color: c.ink }]}>{best.store}{best.location ? ` · ${best.location}` : ''}</Text>
          {compared && saving > 0 && <Text style={[type.body, { color: c.dealText }]}>Save up to {dollars(saving)} compared with the dearest store.</Text>}
          <Text style={[type.caption, { color: isOld(best.observedAt) ? c.warning : c.inkSecondary }]}>
            Last seen {observedAgo(best.observedAt)}{isOld(best.observedAt) ? ' · may have changed, check in store' : ''} · Source: {best.source}
          </Text>
          {best.productUrl && <Button block variant="secondary" icon={ExternalLink} onPress={() => Linking.openURL(best.productUrl!)}>{`Check at ${best.store}`}</Button>}
        </Card>
      </FadeInView>

      <FadeInView index={2} style={{ marginTop: space[6] }}>
        <SectionHeader title="Price at each store" />
        <Card style={{ marginHorizontal: space[4] }}>
          {offers.map((o, i) => {
            const old = isOld(o.observedAt);
            return (
              <View key={o.chain} accessible accessibilityLabel={`${o.store}, ${dollars(o.priceCents)}, seen ${observedAgo(o.observedAt)}`}
                style={{ flexDirection: 'row', gap: space[3], padding: space[3], borderTopWidth: i ? 1 : 0, borderTopColor: c.border, opacity: old ? 0.8 : 1 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.bodyStrong, { color: c.ink }]}>{o.store}{compared && i === 0 ? <Text style={{ color: c.dealText }}>  · Lowest</Text> : null}</Text>
                  {o.location && <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{o.location}{o.storesObserved && o.storesObserved > 1 ? ` · lowest of ${o.storesObserved} branches` : ''}</Text>}
                  <Text style={[type.caption, { color: old ? c.warning : c.inkSecondary }]}>Seen {observedAgo(o.observedAt)}</Text>
                  {o.productUrl && (
                    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(o.productUrl!)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ExternalLink size={12} color={c.brandText} />
                      <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_600SemiBold' }]}>Open at {o.store}</Text>
                    </Pressable>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[type.priceMd, { color: compared && i === 0 ? c.dealText : c.ink }]}>{dollars(o.priceCents)}</Text>
                  {o.wasCents != null && <Text style={[type.caption, { color: c.inkTertiary, textDecorationLine: 'line-through' }]}>{dollars(o.wasCents)}</Text>}
                  {o.wasCents != null && <Text style={[type.caption, { color: c.dealText, fontFamily: 'Inter_600SemiBold' }]}>Promo price</Text>}
                  {o.unitPriceCents != null && o.unitMeasure && <Text style={[type.caption, { color: c.inkSecondary }]}>{dollars(o.unitPriceCents)}/{o.unitMeasure}</Text>}
                </View>
              </View>
            );
          })}
        </Card>
        <Text style={[type.caption, { color: c.inkTertiary, marginHorizontal: space[4], marginTop: space[2] }]}>
          Same product and pack size at every store. Prices are the latest the stores listed online (collected via Baskt), not live checkout prices, and may differ by branch.
        </Text>
      </FadeInView>

      {points.length >= 3 && (
        <FadeInView index={3} style={{ marginTop: space[6] }}>
          <SectionHeader title="Lowest price over time" />
          <Card style={{ marginHorizontal: space[4], padding: space[4], gap: space[2] }}>
            <Sparkline points={points} width={width - space[4] * 4} />
            <Text style={[type.caption, { color: c.inkSecondary }]}>{points.length} days of saved prices since {new Date(points[0].date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</Text>
          </Card>
        </FadeInView>
      )}
    </Screen>
  );
}
