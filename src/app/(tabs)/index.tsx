import { router } from 'expo-router';
import { Bell, ChevronRight, MapPinned, Mic, Search, ShieldCheck, Sparkles, Tag } from 'lucide-react-native';
import React from 'react';
import { FlatList, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { FadeInView, LocationPill, PressableScale, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { policies } from '@/data/repo';
import { popularItems, priceDrops, recentItems, storeDeals, type StoreDeal, type StoreItem } from '@/data/store';
import { dollars } from '@/data/retail';
import { useApp } from '@/state/app-state';
import { IconButton, InfoNote, LiveDataNotice, Logo, Screen, SectionHeader, TAB_BAR_SPACE } from '@/ui/kit';
import { CategoryTile, DealBannerCard, ItemCard } from '@/ui/store-cards';

type Load<T> = { state: 'loading' | 'ready' | 'error'; data: T };

/** Loads one Home section from the server; each section loads, fails and retries on its own. */
function useSection<T>(load: () => Promise<T>, empty: T, version: number): [Load<T>, () => void] {
  const [s, setS] = React.useState<Load<T>>({ state: 'loading', data: empty });
  const run = React.useCallback(() => {
    setS((p) => ({ ...p, state: p.state === 'ready' ? 'ready' : 'loading' }));
    load().then((data) => setS({ state: 'ready', data })).catch(() => setS((p) => ({ state: p.state === 'ready' ? 'ready' : 'error', data: p.data })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(run, [run, version]);
  return [s, run];
}

export default function Home() {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const { location, unreadAlerts: unread, refreshCatalog, catalogStatus } = useApp();
  const [version, setVersion] = React.useState(0);
  const [deals, retryDeals] = useSection<StoreDeal[]>(() => storeDeals(10), [], version);
  const [popular, retryPopular] = useSection<StoreItem[]>(() => popularItems(12), [], version);
  const [drops] = useSection(() => priceDrops(10), [] as Awaited<ReturnType<typeof priceDrops>>, version);
  const [recent] = useSection<StoreItem[]>(() => recentItems(10), [], version);
  const bannerW = Math.min(width - space[4] * 2 - 24, 420);
  const tileW = (Math.min(width, 520) - space[4] * 2 - space[3] * 3) / 4;
  const refresh = async () => { setVersion((v) => v + 1); await refreshCatalog(); };

  return (
    <Screen bottomSpace={TAB_BAR_SPACE} onRefresh={refresh}>
      {/* A. Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingTop: space[3] }}>
        <Logo height={28} />
        <View style={{ flex: 1 }} />
        <LocationPill label={location ? location.label.split(',')[0] : 'Set area'} onPress={() => router.push('/location')} />
        <IconButton icon={Sparkles} label="Ask the shopping assistant" onPress={() => router.push('/assistant')} />
        <IconButton icon={Bell} label="Alerts" badge={unread} onPress={() => router.push('/alerts')} />
      </View>
      <View style={{ marginHorizontal: space[4], marginTop: space[3] }}>
        <PressableScale accessibilityRole="search" accessibilityLabel="Search products" onPress={() => router.push('/search')}
          style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 52, paddingLeft: space[4], paddingRight: space[1],
            borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong }}>
          <Search size={size.iconSm} color={c.inkTertiary} />
          <Text style={[type.bodyLg, { color: c.inkTertiary, flex: 1 }]} numberOfLines={1}>Search milk, Panadol, dog food…</Text>
          <IconButton icon={Mic} label="Search by voice" flat color={c.brandText} onPress={() => router.push({ pathname: '/search', params: { voice: '1' } })} />
        </PressableScale>
      </View>
      <LiveDataNotice status={catalogStatus} onRetry={refreshCatalog} />

      {/* B. Today's Deals */}
      <FadeInView index={0} style={{ marginTop: space[6] }}>
        <View style={{ paddingHorizontal: space[4], marginBottom: space[2] }}>
          <Text accessibilityRole="header" style={[type.h2, { color: c.ink }]}>Today's Best Deals</Text>
          <Text style={[type.caption, { color: c.inkSecondary }]}>Save more today · promotions where the store also listed its regular price</Text>
        </View>
        {deals.state === 'loading' ? (
          <View style={{ flexDirection: 'row', gap: space[3], paddingHorizontal: space[4] }}>
            <View style={{ width: bannerW, height: 176, borderRadius: radius.lg, backgroundColor: c.surfaceMuted }} />
            <View style={{ width: 40, height: 176, borderRadius: radius.lg, backgroundColor: c.surfaceMuted }} />
          </View>
        ) : deals.state === 'error' ? (
          <InfoNote icon={Tag} title="Deals can't be loaded right now" body="Check your internet connection." action="Try again" onAction={retryDeals} />
        ) : deals.data.length === 0 ? (
          <InfoNote icon={Tag} title="No verified deals right now" body="We only show a deal when the store listed both the promotion and its regular price. Try searching for a product to compare prices." action="Search products" onAction={() => router.push('/search')} />
        ) : (
          <FlatList horizontal data={deals.data} keyExtractor={(d) => `${d.item.id}-${d.offer.chain}`} showsHorizontalScrollIndicator={false}
            snapToInterval={bannerW + space[3]} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3], paddingBottom: space[2] }}
            renderItem={({ item }) => <DealBannerCard d={item} width={bannerW} />} />
        )}
      </FadeInView>

      {/* C. Categories */}
      <FadeInView index={1} style={{ marginTop: space[6] }}>
        <SectionHeader title="Shop by category" action="All" onAction={() => router.push('/categories')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[4] }}>
          {CATEGORY_LIST.slice(0, 8).map((cat) => (
            <CategoryTile key={cat.id} cat={cat} width={tileW}
              onPress={() => (cat.id === 'fuel-travel' ? router.push('/fuel') : router.push({ pathname: '/category/[id]', params: { id: cat.id } }))} />
          ))}
        </View>
      </FadeInView>

      <FadeInView index={1} style={{ marginTop: space[4], marginHorizontal: space[4] }}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Map of stores near you" onPress={() => router.push('/map')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <MapPinned size={24} color={c.brandText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyStrong, { color: c.ink }]}>Stores near you</Text>
            <Text style={[type.caption, { color: c.inkSecondary }]}>Supermarkets, chemists, pet stores and fuel on a map</Text>
          </View>
          <ChevronRight size={20} color={c.inkTertiary} />
        </PressableScale>
      </FadeInView>

      {/* D. Popular products and price comparisons */}
      <FadeInView index={2} style={{ marginTop: space[6] }}>
        <SectionHeader title="Popular products" action="Search" onAction={() => router.push('/search')} />
        {popular.state === 'error' ? (
          <InfoNote icon={Search} title="Prices can't be loaded right now" body="Check your internet connection." action="Try again" onAction={retryPopular} />
        ) : popular.state === 'ready' && popular.data.length === 0 ? (
          <InfoNote icon={Search} title="Store prices are being collected" body="Popular products appear here once store prices have been saved. You can already search any product." action="Search products" onAction={() => router.push('/search')} />
        ) : (
          <ItemRow items={popular.data} loading={popular.state === 'loading'} />
        )}
      </FadeInView>

      {drops.state === 'ready' && drops.data.length > 0 && (
        <FadeInView index={3} style={{ marginTop: space[6] }}>
          <SectionHeader title="Price drops" />
          <ItemRow items={drops.data} notes={drops.data.map((d) => `Was ${dollars(d.previousCents)} at ${d.dropStore}`)} />
        </FadeInView>
      )}

      {recent.state === 'ready' && recent.data.length > 0 && (
        <FadeInView index={3} style={{ marginTop: space[6] }}>
          <SectionHeader title="Recently updated prices" />
          <ItemRow items={recent.data} />
        </FadeInView>
      )}

      <FadeInView index={4} style={{ marginTop: space[6], marginHorizontal: space[4] }}>
        <PressableScale accessibilityRole="button" onPress={() => router.push('/stores')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.brandDeep }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.deal, alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} color={c.onDeal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: c.onBrandDeep }]}>NZ stores and price matching</Text>
            <Text style={[type.body, { color: c.onBrandDeep, opacity: 0.85 }]}>{policies.length ? `${policies.length} stores may match a cheaper price · ` : ''}see which stores are connected</Text>
          </View>
          <ChevronRight size={22} color={c.onBrandDeep} />
        </PressableScale>
      </FadeInView>
    </Screen>
  );
}

function ItemRow({ items, loading, notes }: { items: StoreItem[]; loading?: boolean; notes?: string[] }) {
  const c = useTheme();
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: space[3], paddingHorizontal: space[4] }}>
        {[0, 1, 2].map((k) => <View key={k} style={{ width: 164, height: 250, borderRadius: radius.lg, backgroundColor: c.surfaceMuted }} />)}
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3], paddingBottom: space[2] }}>
      {items.map((it, i) => <ItemCard key={it.id} it={it} note={notes?.[i]} />)}
    </ScrollView>
  );
}
