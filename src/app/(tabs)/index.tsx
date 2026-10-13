import { router } from 'expo-router';
import { Bell, ChevronRight, Fuel, History, Mic, PackageSearch, ScanBarcode, Search, ShieldCheck, Sparkles, Tag } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { applyFilters, DealCarousel, FadeInView, LocationPill, PressableScale, ProductCard, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { nzd } from '@/data/compare';
import { deals, getOffers, getProduct, latestFuel, listings, policies, productCount } from '@/data/repo';
import { Card, IconButton, InfoNote, LiveDataNotice, Logo, Screen, SectionHeader, shadow, TAB_BAR_SPACE, VerdictPill } from '@/ui/kit';
import { useApp } from '@/state/app-state';
import { CompareStrip } from '@/ui/compare';
import { timeAgo, toCard } from '@/ui/format';

export default function Home() {
  const c = useTheme();
  const { location, favourites, toggleFavourite, unreadAlerts: unread, catalogVersion, refreshCatalog, catalogStatus } = useApp();
  const fuel = React.useMemo(() => latestFuel(), [catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const [total, setTotal] = React.useState<number | null>(null);
  React.useEffect(() => { productCount().then(setTotal); }, [catalogVersion]);
  const todays = React.useMemo(() => deals(location), [location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const near = React.useMemo(() => applyFilters(listings(location), { sort: location ? 'nearest' : 'relevance' }, location).slice(0, 6), [location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });
  // "Compare at a glance": the deal with the most stores to compare.
  const featured = React.useMemo(() => {
    const ids = [...todays.map((d) => d.id), ...near.map((l) => l.id)];
    const id = ids.find((x) => getOffers(x, location).length >= 2);
    const product = id ? getProduct(id) : undefined;
    return product ? { product, offers: getOffers(product.id, location) } : null;
  }, [todays, near, location]);

  return (
    <Screen bottomSpace={TAB_BAR_SPACE} onRefresh={refreshCatalog}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingTop: space[3] }}>
        <Logo height={28} />
        <View style={{ flex: 1 }} />
        <LocationPill label={location ? location.label.split(',')[0] : 'Set your area'} onPress={() => router.push('/location')} />
        <IconButton icon={Bell} label="Alerts" badge={unread} onPress={() => router.push('/alerts')} />
      </View>

      <PressableScale accessibilityRole="search" accessibilityLabel="Search products" onPress={() => router.push('/search')}
        style={{ marginHorizontal: space[4], marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 52, paddingLeft: space[4], paddingRight: space[1],
          borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong }}>
        <Search size={size.iconMd} color={c.inkTertiary} />
        <Text style={[type.bodyLg, { color: c.inkTertiary, flex: 1 }]} numberOfLines={1}>Search products</Text>
        <IconButton icon={Mic} label="Search by voice" flat color={c.brandText} onPress={() => router.push({ pathname: '/search', params: { voice: '1' } })} />
        <IconButton icon={ScanBarcode} label="Scan a barcode" flat color={c.brandText} onPress={() => router.push('/scan')} />
      </PressableScale>

      <View style={{ flexDirection: 'row', gap: space[2], marginHorizontal: space[4], marginTop: space[3] }}>
        {[
          { icon: ScanBarcode, label: 'Scan', onPress: () => router.push('/scan') },
          { icon: History, label: 'Scan History', onPress: () => router.push('/history') },
          { icon: Fuel, label: 'Fuel', onPress: () => router.push('/fuel') },
        ].map((q) => (
          <PressableScale key={q.label} accessibilityRole="button" accessibilityLabel={q.label} onPress={q.onPress}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: space[3], borderRadius: radius.lg, backgroundColor: c.surface, ...shadow }}>
            <q.icon size={22} color={c.brandText} />
            <Text style={[type.caption, { color: c.ink, fontFamily: 'Inter_600SemiBold' }]}>{q.label}</Text>
          </PressableScale>
        ))}
      </View>

      <PressableScale accessibilityRole="button" accessibilityLabel="Ask the shopping assistant" onPress={() => router.push('/assistant')}
        style={{ marginHorizontal: space[4], marginTop: space[3], flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: c.brandSubtle }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color={c.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: c.ink }]}>Ask the shopping assistant</Text>
          <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>“Where's milk cheapest?” Type or speak</Text>
        </View>
        <ChevronRight size={20} color={c.brandText} />
      </PressableScale>

      <LiveDataNotice status={catalogStatus} onRetry={refreshCatalog} />

      {featured && (
        <FadeInView index={1} style={{ marginTop: space[6] }}>
          <SectionHeader title="Compare at a glance" action="Details" onAction={() => open(featured.product.id)} />
          <Text style={[type.bodyStrong, { color: c.ink, marginHorizontal: space[4], marginTop: -space[2], marginBottom: space[2] }]} numberOfLines={1}>
            {featured.product.name}{featured.product.size ? ` ${featured.product.size}` : ''}
          </Text>
          <CompareStrip product={featured.product} offers={featured.offers} onPressStore={() => open(featured.product.id)} />
        </FadeInView>
      )}

      {catalogStatus === 'live' && (
        <FadeInView index={2} style={{ marginTop: space[6] }}>
          <SectionHeader title="Today's verified deals" action={todays.length ? 'See all' : undefined} onAction={() => router.push({ pathname: '/search', params: { sort: 'biggest-saving' } })} />
          {todays.length ? <DealCarousel deals={todays} onPressDeal={(d) => open(d.id)} /> : (
            <InfoNote icon={Tag} title="No verified deals right now"
              body="A deal only shows here when a store's own price data confirms the earlier price. We never make up discounts." />
          )}
        </FadeInView>
      )}

      {fuel.length > 0 && (
        <FadeInView index={2} style={{ marginTop: space[6] }}>
          <SectionHeader title="Petrol and diesel" />
          <Card style={{ marginHorizontal: space[4], padding: space[4], gap: space[3] }}>
            {fuel.map((f) => {
              const diff = f.before ? f.now.centsPerLitre - f.before.centsPerLitre : null;
              return (
                <View key={f.fuel} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}
                  accessible accessibilityLabel={`${f.fuel}, ${(f.now.centsPerLitre / 100).toFixed(2)} dollars a litre national average`}>
                  <Fuel size={20} color={c.brandText} />
                  <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{f.fuel}</Text>
                  {diff != null && Math.abs(diff) >= 0.1 && (
                    <Text style={[type.caption, { color: diff < 0 ? c.dealText : c.warning, fontFamily: 'Inter_600SemiBold' }]}>{diff > 0 ? '+' : '−'}{Math.abs(diff).toFixed(1)}c</Text>
                  )}
                  <Text style={[type.priceMd, { color: c.ink }]}>${(f.now.centsPerLitre / 100).toFixed(2)}/L</Text>
                </View>
              );
            })}
            <Text style={[type.caption, { color: c.inkSecondary }]}>
              National average pump price, week of {new Date(fuel[0].now.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}. Source: MBIE fuel price monitoring. Prices at your local station will differ.
            </Text>
          </Card>
        </FadeInView>
      )}

      {catalogStatus === 'live' && (
        <FadeInView index={2} style={{ marginTop: space[6] }}>
          <SectionHeader title={location ? 'Real prices near you' : 'Latest real prices'} action={near.length ? 'See all' : undefined} onAction={() => router.push({ pathname: '/search', params: { sort: location ? 'nearest' : 'relevance' } })} />
          {near.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3], paddingBottom: space[2] }}>
              {near.map((l) => (
                <ProductCard key={l.id} product={toCard(l)} isFavourite={favourites.includes(l.id)} onPress={() => open(l.id)} onToggleFavourite={() => toggleFavourite(l.id)} />
              ))}
            </ScrollView>
          ) : (
            <InfoNote icon={PackageSearch} title="Compare supermarket prices"
              body={`Search any product to see the latest prices seen at Woolworths, PAK'nSAVE, New World, FreshChoice, SuperValue, The Warehouse, chemists and pet stores.${total ? ` ${total.toLocaleString('en-NZ')} NZ products have photos and details.` : ''}`}
              action="Search products" onAction={() => router.push('/search')} />
          )}
        </FadeInView>
      )}

      <FadeInView index={3} style={{ marginTop: space[6] }}>
        <SectionHeader title="Popular categories" action="All" onAction={() => router.push('/categories')} />
        <View style={{ flexDirection: 'row', paddingHorizontal: space[4], gap: space[2] }}>
          {CATEGORY_LIST.slice(0, 4).map((cat) => (
            <PressableScale key={cat.id} accessibilityRole="button" accessibilityLabel={cat.label} onPress={() => router.push({ pathname: '/search', params: { category: cat.id } })}
              style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...shadow }}>
                <cat.icon size={26} color={c.brandText} />
              </View>
              <Text style={[type.caption, { color: c.ink, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{cat.label}</Text>
            </PressableScale>
          ))}
        </View>
      </FadeInView>

      <FadeInView index={4} style={{ marginTop: space[6], marginHorizontal: space[4] }}>
        <PressableScale accessibilityRole="button" onPress={() => router.push('/stores')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.brandDeep }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.deal, alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={26} color={c.onDeal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: c.onBrandDeep }]}>Stores that price match</Text>
            <Text style={[type.body, { color: c.onBrandDeep, opacity: 0.85 }]}>{policies.length ? `${policies.length} NZ stores may match or beat a cheaper price` : 'See which NZ stores may match a cheaper price'}</Text>
          </View>
          <ChevronRight size={22} color={c.onBrandDeep} />
        </PressableScale>
      </FadeInView>
    </Screen>
  );
}

