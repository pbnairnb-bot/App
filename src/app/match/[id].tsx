import { router, useLocalSearchParams } from 'expo-router';
import { Sun, X } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { FadeInView, PriceMatchNote, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { freshness, nzd, policiesForCategory, sourceLabel, unitPrice } from '@/data/compare';
import { getOffers, getProduct, policies as allPolicies } from '@/data/repo';
import { useApp } from '@/state/app-state';
import { IconButton, Screen, StoreMark } from '@/ui/kit';

/** The card a shopper shows at the counter: the cheaper price, where, and when it was checked. */
export default function GetItMatched() {
  const { id, store } = useLocalSearchParams<{ id: string; store?: string }>();
  const c = useTheme();
  const { location } = useApp();
  const product = getProduct(id);
  const offers = product ? getOffers(product.id, location) : [];
  const offer = offers.find((o) => o.storeId === store) ?? offers[0];
  if (!product || !offer) return null;
  const policies = policiesForCategory(product.category, allPolicies);
  const checked = new Date(offer.checkedAt);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4] }}>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Get it matched</Text>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>

      <FadeInView index={0} style={{ marginHorizontal: space[4], borderRadius: radius.xl, backgroundColor: c.brandDeep, padding: space[6], gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.badge, { color: c.deal }]}>Cheaper price found</Text>
        </View>
        <Text style={[type.h2, { color: c.onBrandDeep }]}>{product.name}{product.size ? ` ${product.size}` : ''}</Text>
        {product.barcode && <Text style={[type.body, { color: c.onBrandDeep, opacity: 0.8, letterSpacing: 2 }]}>{product.barcode}</Text>}
        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 56, lineHeight: 64, color: c.deal, fontVariant: ['tabular-nums'] }}>{nzd(offer.price)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <StoreMark store={offer.store} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: c.onBrandDeep }]}>{offer.store.name}</Text>
            <Text style={[type.body, { color: c.onBrandDeep, opacity: 0.8 }]}>
              {[offer.onlineOnly ? 'Online price' : 'In-store price', unitPrice(offer.price, product)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: c.onBrandDeep, opacity: 0.2 }} />
        <Text style={[type.body, { color: c.onBrandDeep }]}>
          {freshness(offer.checkedAt)} ({checked.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}, {checked.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })})
          {` · ${sourceLabel(offer)}`}
        </Text>
      </FadeInView>

      <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', marginHorizontal: space[4], marginTop: space[3] }}>
        <Sun size={18} color={c.inkSecondary} />
        <Text style={[type.body, { color: c.inkSecondary, flex: 1 }]}>Turn up your screen brightness and show this card at the counter.</Text>
      </View>

      <FadeInView index={1} style={{ marginHorizontal: space[4], marginTop: space[6], gap: space[3] }}>
        <Text style={[type.h2, { color: c.ink }]}>Where to ask</Text>
        <Text style={[type.body, { color: c.inkSecondary }]}>Each store decides for itself. Bring the same product, new and in stock at the other store.</Text>
        {policies.map((p) => <PriceMatchNote key={p.retailer} policy={p} expanded={false} />)}
      </FadeInView>
    </Screen>
  );
}
