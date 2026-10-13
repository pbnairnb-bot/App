import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, ImageIcon, PackageSearch, Share2, ShieldCheck, Store as StoreIcon } from 'lucide-react-native';
import React from 'react';
import { Share, Text, useWindowDimensions, View } from 'react-native';
import { Button, DealBadge, FadeInView, PriceBlock, PriceMatchBadge, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { bestOffer, formatKm, freshness, nzd, type Offer, policiesForCategory, unitPrice, verdict } from '@/data/compare';
import { getHistory, getOffers, getProduct, policies as allPolicies } from '@/data/repo';
import type { Product } from '@/data/types';
import { useApp } from '@/state/app-state';
import { CompareStrip } from '@/ui/compare';
import { Card, EmptyState, IconButton, Screen, SectionHeader, Sparkline, StoreMark, TopBar, VerdictPill } from '@/ui/kit';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const { location, favourites, toggleFavourite } = useApp();
  const product = getProduct(id);
  const offers = React.useMemo(() => (product ? getOffers(product.id, location) : []), [product, location]);
  const history = React.useMemo(() => (product ? getHistory(product.id) : []), [product]);

  if (!product) {
    return (
      <Screen>
        <TopBar />
        <EmptyState icon={PackageSearch} title="Product not found" body="It may have been removed. Try searching for it by name." action="Search" onAction={() => router.replace('/search')} />
      </Screen>
    );
  }

  const best = bestOffer(offers);
  const v = best ? verdict(history, best.price) : null;
  const fav = favourites.includes(product.id);
  const policies = policiesForCategory(product.category, allPolicies);
  const title = `${product.name}${product.size ? ` ${product.size}` : ''}`;
  const prices = history.map((p) => p.price);

  return (
    <Screen>
      <TopBar right={
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <IconButton icon={Share2} label="Share" onPress={() => Share.share({ message: best ? `${title}: best price ${nzd(best.price)} at ${best.store.name} (PriceMatch NZ)` : title }).catch(() => {})} />
          <IconButton icon={Heart} label={fav ? 'Remove from favourites' : 'Save to favourites'} color={fav ? c.brandText : c.ink} onPress={() => toggleFavourite(product.id)} />
        </View>
      } />

      <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <ProductImage product={product} />
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {product.isSample && <DealBadge tone="sample" />}
          <Text style={[type.caption, { color: c.inkSecondary }]}>{CATEGORY_LABELS[product.category] ?? product.category}{product.barcode ? ` · ${product.barcode}` : ''}</Text>
        </View>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>{title}</Text>
      </FadeInView>

      {offers.length > 1 && (
        <FadeInView index={1} style={{ marginTop: space[4] }}>
          <Text style={[type.bodyStrong, { color: c.inkSecondary, marginHorizontal: space[4], marginBottom: space[2] }]}>Compare {offers.length} stores</Text>
          <CompareStrip product={product} offers={offers} />
        </FadeInView>
      )}

      {best ? (
        <FadeInView index={1} style={{ marginHorizontal: space[4], marginTop: space[4] }}>
          <Card style={{ padding: space[4], gap: space[3], borderWidth: 2, borderColor: c.deal }}>
            <Text style={[type.badge, { color: c.dealText }]}>Best price{offers.length > 1 ? ` of ${offers.length} stores` : ''}</Text>
            <PriceBlock price={best.price} wasPrice={best.wasPrice} size="lg" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <StoreMark store={best.store} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: c.ink }]}>{best.store.name}</Text>
                <Text style={[type.caption, { color: c.inkSecondary }]}>
                  {[best.km != null ? `${formatKm(best.km)} away` : best.onlineOnly ? 'Online' : null, unitPrice(best.price, product), freshness(best.checkedAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            {best.onlineOnly && best.total > best.price && <Text style={[type.body, { color: c.inkSecondary }]}>{nzd(best.total)} with {nzd(best.total - best.price)} delivery</Text>}
            {v && (
              <View style={{ gap: 4 }}>
                <VerdictPill label={v.label} tone={v.tone} />
                <Text style={[type.body, { color: c.inkSecondary }]}>{v.detail}</Text>
              </View>
            )}
            {policies.length > 0 && (
              <Button block icon={ShieldCheck} onPress={() => router.push({ pathname: '/match/[id]', params: { id: product.id, store: best.storeId } })}>Get it matched</Button>
            )}
          </Card>
        </FadeInView>
      ) : (
        <Card style={{ margin: space[4], padding: space[4] }}><Text style={[type.bodyLg, { color: c.inkSecondary }]}>No prices yet for this product.</Text></Card>
      )}

      {prices.length > 14 && (
        <FadeInView index={2} style={{ marginTop: space[6] }}>
          <SectionHeader title="Price over 90 days" />
          <Card style={{ marginHorizontal: space[4], padding: space[4], gap: space[2] }}>
            <Sparkline points={history} width={width - space[4] * 4} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.caption, { color: c.inkSecondary }]}>Lowest {nzd(Math.min(...prices))}</Text>
              <Text style={[type.caption, { color: c.inkSecondary }]}>Highest {nzd(Math.max(...prices))}</Text>
            </View>
          </Card>
        </FadeInView>
      )}

      {offers.length > 0 && (
        <FadeInView index={3} style={{ marginTop: space[6] }}>
          <SectionHeader title="All store prices" />
          <Card style={{ marginHorizontal: space[4] }}>
            {offers.map((o, i) => <OfferRow key={o.storeId} offer={o} product={product} first={i === 0} best={o === best} />)}
          </Card>
          <Text style={[type.caption, { color: c.inkSecondary, marginHorizontal: space[4], marginTop: space[2] }]}>
            Sorted by price including delivery. Prices older than 3 days are faded and never shown as the best price.
          </Text>
          <View style={{ marginHorizontal: space[4], marginTop: space[2] }}>
            <Button block variant="secondary" onPress={() => router.push({ pathname: '/report', params: { name: title, barcode: product.barcode, productId: product.id } })}>Seen a different price? Tell us</Button>
          </View>
        </FadeInView>
      )}

      {policies.length > 0 && (
        <FadeInView index={4} style={{ marginTop: space[6] }}>
          <SectionHeader title="Found it cheaper?" action="All stores" onAction={() => router.push('/stores')} />
          <Card style={{ marginHorizontal: space[4], padding: space[4], gap: space[3] }}>
            <Text style={[type.body, { color: c.inkSecondary }]}>These stores sell this kind of product and may match or beat a cheaper price. Check with the store before you buy.</Text>
            {policies.map((p) => (
              <View key={p.retailer} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 }}>
                  <StoreIcon size={18} color={c.inkSecondary} />
                  <Text style={[type.bodyStrong, { color: c.ink }]}>{p.retailer}</Text>
                </View>
                <PriceMatchBadge policy={p} />
              </View>
            ))}
          </Card>
        </FadeInView>
      )}
    </Screen>
  );
}

function ProductImage({ product }: { product: Product }) {
  const c = useTheme();
  return (
    <View style={{ height: 200, borderRadius: radius.lg, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {product.imageUrl
        ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} accessibilityLabel={product.name} />
        : <ImageIcon size={40} color={c.inkTertiary} />}
    </View>
  );
}

function OfferRow({ offer: o, product, first, best }: { offer: Offer; product: Product; first: boolean; best: boolean }) {
  const c = useTheme();
  const up = unitPrice(o.price, product);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderTopWidth: first ? 0 : 1, borderTopColor: c.border, opacity: o.stale ? 0.55 : 1 }}
      accessible accessibilityLabel={`${o.store.name}, ${nzd(o.price)}${o.stale ? ', may be out of date' : ''}`}>
      <StoreMark store={o.store} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={1}>{o.store.name}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={2}>
          {[o.km != null ? formatKm(o.km) : o.onlineOnly ? `Online${o.store.deliveryFee ? ` · +${nzd(o.store.deliveryFee)} delivery` : ''}` : null, freshness(o.checkedAt)].filter(Boolean).join(' · ')}
        </Text>
        {o.memberPrice != null && <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_600SemiBold' }]}>{o.memberLabel ?? 'Member price'} {nzd(o.memberPrice)}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.priceMd, { color: best ? c.dealText : c.ink }]}>{nzd(o.price)}</Text>
        {o.wasPrice != null && <Text style={[type.caption, { color: c.inkTertiary, textDecorationLine: 'line-through' }]}>{nzd(o.wasPrice)}</Text>}
        {up && <Text style={[type.caption, { color: c.inkSecondary }]}>{up}</Text>}
      </View>
    </View>
  );
}
