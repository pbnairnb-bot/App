import { router } from 'expo-router';
import { Bell, ChevronRight, Mic, ScanBarcode, Search, ShieldCheck, Sparkles } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { applyFilters, DealCarousel, FadeInView, LocationPill, PressableScale, ProductCard, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { nzd } from '@/data/compare';
import { deals, getAlerts, getOffers, getProduct, listings, policies } from '@/data/repo';
import { Card, IconButton, Logo, SampleBanner, Screen, SectionHeader, shadow, TAB_BAR_SPACE, VerdictPill } from '@/ui/kit';
import { useApp } from '@/state/app-state';
import { CompareStrip } from '@/ui/compare';
import { timeAgo, toCard } from '@/ui/format';

export default function Home() {
  const c = useTheme();
  const { location, scans, favourites, toggleFavourite, readAlerts, catalogVersion, refreshCatalog } = useApp();
  const unread = getAlerts().filter((a) => !a.read && !readAlerts.includes(a.id)).length;
  const todays = React.useMemo(() => deals(location), [location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const near = React.useMemo(() => applyFilters(listings(location), { sort: location ? 'nearest' : 'relevance' }, location).slice(0, 6), [location, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });
  // "Compare at a glance": the deal with the most stores to compare.
  const featured = React.useMemo(() => {
    const ids = [...todays.map((d) => d.id), ...near.map((l) => l.id)];
    const id = ids.find((x) => getOffers(x, location).length >= 3) ?? ids[0];
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
        <Text style={[type.bodyLg, { color: c.inkTertiary, flex: 1 }]} numberOfLines={1}>Search or scan</Text>
        <IconButton icon={Mic} label="Search by voice" flat color={c.brandText} onPress={() => router.push({ pathname: '/search', params: { voice: '1' } })} />
        <IconButton icon={ScanBarcode} label="Scan a barcode" flat color={c.brandText} onPress={() => router.push('/scan')} />
      </PressableScale>

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

      <SampleBanner />

      {scans.length > 0 && (
        <FadeInView index={0} style={{ marginTop: space[6] }}>
          <SectionHeader title="Recent scans" action="See all" onAction={() => router.push('/history')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3], paddingBottom: space[2] }}>
            {scans.slice(0, 8).map((s) => (
              <Card key={s.id} accessibilityLabel={`${s.name}${s.bestPrice ? `, best ${nzd(s.bestPrice)} at ${s.bestStore}` : ''}`}
                onPress={() => (s.productId ? open(s.productId) : router.push({ pathname: '/barcode/[code]', params: { code: s.barcode } }))}
                style={{ width: 196, padding: space[3], gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                    <ScanBarcode size={20} color={c.brandText} />
                  </View>
                  <Text style={[type.caption, { color: c.inkTertiary }]}>{timeAgo(s.scannedAt)}</Text>
                </View>
                <Text style={[type.bodyStrong, { color: c.ink, minHeight: 40 }]} numberOfLines={2}>{s.name}</Text>
                {s.bestPrice != null ? (
                  <Text style={[type.body, { color: c.inkSecondary }]} numberOfLines={2}>
                    Best <Text style={{ fontFamily: 'Inter_700Bold', color: c.ink }}>{nzd(s.bestPrice)}</Text> at {s.bestStore}
                  </Text>
                ) : <Text style={[type.body, { color: c.inkSecondary }]}>No prices yet</Text>}
                {s.verdict && <VerdictPill label={s.verdict} tone={s.verdict.startsWith('Lowest') ? 'good' : s.verdict.startsWith('Higher') ? 'high' : 'normal'} />}
              </Card>
            ))}
          </ScrollView>
        </FadeInView>
      )}

      {featured && (
        <FadeInView index={1} style={{ marginTop: space[6] }}>
          <SectionHeader title="Compare at a glance" action="Details" onAction={() => open(featured.product.id)} />
          <Text style={[type.bodyStrong, { color: c.ink, marginHorizontal: space[4], marginTop: -space[2], marginBottom: space[2] }]} numberOfLines={1}>
            {featured.product.name}{featured.product.size ? ` ${featured.product.size}` : ''}
          </Text>
          <CompareStrip product={featured.product} offers={featured.offers} onPressStore={() => open(featured.product.id)} />
        </FadeInView>
      )}

      <FadeInView index={2} style={{ marginTop: space[6] }}>
        <SectionHeader title="Today's best deals" action="See all" onAction={() => router.push({ pathname: '/search', params: { sort: 'biggest-saving' } })} />
        <DealCarousel deals={todays} onPressDeal={(d) => open(d.id)} />
      </FadeInView>

      <FadeInView index={2} style={{ marginTop: space[6] }}>
        <SectionHeader title={location ? 'Best prices near you' : 'Best prices'} action="See all" onAction={() => router.push({ pathname: '/search', params: { sort: location ? 'nearest' : 'relevance' } })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3], paddingBottom: space[2] }}>
          {near.map((l) => (
            <ProductCard key={l.id} product={toCard(l)} isFavourite={favourites.includes(l.id)} onPress={() => open(l.id)} onToggleFavourite={() => toggleFavourite(l.id)} />
          ))}
        </ScrollView>
      </FadeInView>

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
            <Text style={[type.body, { color: c.onBrandDeep, opacity: 0.85 }]}>{policies.length} NZ stores may match or beat a cheaper price</Text>
          </View>
          <ChevronRight size={22} color={c.onBrandDeep} />
        </PressableScale>
      </FadeInView>
    </Screen>
  );
}

