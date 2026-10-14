import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Tag } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { PressableScale, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { dollars, isOld, observedAgo } from '@/data/retail';
import type { StoreDeal, StoreItem } from '@/data/store';
import { shadow } from './kit';

const openItem = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });

/**
 * Product photo. Only genuine photos are shown (Open Food Facts, matched by barcode or exact product).
 * Without one we show a clear "no photo" tile in the product's category style, never another product's
 * picture; a broken image URL falls back to the same tile instead of a blank box.
 */
export function ProductPhoto({ uri, size, label, category }: { uri: string | null | undefined; size: number; label: string; category?: string }) {
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(!!uri);
  const cat = CATEGORY_LIST.find((x) => x.id === category) ?? CATEGORY_LIST[0];
  if (!uri || failed) {
    return (
      <LinearGradient colors={[`${cat.tint[0]}33`, `${cat.tint[1]}26`]} style={{ width: size, height: size, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 }}
        accessible accessibilityLabel={`${label}, no photo available`}>
        <cat.icon size={size * 0.34} color={cat.tint[1]} strokeWidth={1.8} />
        {size >= 90 && <Text style={[type.caption, { color: cat.tint[1], fontSize: 11 }]}>No photo yet</Text>}
      </LinearGradient>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} accessibilityLabel={label} cachePolicy="memory-disk"
        onLoad={() => setLoading(false)} onError={() => setFailed(true)} />
      {loading && <ActivityIndicator style={{ position: 'absolute' }} color={cat.tint[1]} />}
    </View>
  );
}

/** Large swipeable deal banner: verified promo price with the source's regular price. */
export function DealBannerCard({ d, width }: { d: StoreDeal; width: number }) {
  const c = useTheme();
  const save = d.offer.wasCents! - d.offer.priceCents;
  const pct = Math.round((save / d.offer.wasCents!) * 100);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${d.item.name}, ${dollars(d.offer.priceCents)} at ${d.offer.store}, was ${dollars(d.offer.wasCents!)}`}
      onPress={() => openItem(d.item.id)} style={{ width, borderRadius: radius.lg, overflow: 'hidden', ...shadow }}>
      <LinearGradient colors={[c.brand, c.brandDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space[4], flexDirection: 'row', gap: space[3], minHeight: 176 }}>
        <View style={{ flex: 1, gap: 6, justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: c.deal }}>
              <Tag size={12} color={c.onDeal} />
              <Text style={[type.badge, { color: c.onDeal }]}>SAVE {pct}%</Text>
            </View>
            <Text style={[type.h3, { color: '#fff' }]} numberOfLines={2}>{d.item.name}</Text>
            {d.item.size && <Text style={[type.caption, { color: '#ffffffcc' }]}>{d.item.size}</Text>}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={[type.priceMd, { color: '#fff', fontSize: 26 }]}>{dollars(d.offer.priceCents)}</Text>
              <Text style={[type.body, { color: '#ffffffaa', textDecorationLine: 'line-through' }]}>{dollars(d.offer.wasCents!)}</Text>
            </View>
            <Text style={[type.caption, { color: '#ffffffdd' }]} numberOfLines={1}>{d.offer.store} · seen {observedAgo(d.offer.observedAt)}</Text>
          </View>
        </View>
        <ProductPhoto uri={d.item.imageUrl} size={108} label={d.item.name} category={d.item.category} />
      </LinearGradient>
    </PressableScale>
  );
}

/** Compact product card for horizontal rows: photo, name, best stored price, store and when it was seen. */
export function ItemCard({ it, note }: { it: StoreItem; note?: string }) {
  const c = useTheme();
  const old = isOld(it.bestObservedAt);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${it.name}, ${dollars(it.bestCents)} at ${it.bestStore}`} onPress={() => openItem(it.id)}
      style={{ width: 164, padding: space[3], gap: 6, borderRadius: radius.lg, backgroundColor: c.surface, ...shadow }}>
      <View style={{ alignItems: 'center' }}><ProductPhoto uri={it.imageUrl} size={96} label={it.name} category={it.category} /></View>
      <Text style={[type.bodyStrong, { color: c.ink, minHeight: 40 }]} numberOfLines={2}>{it.name}</Text>
      {it.size && <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{it.size}</Text>}
      <Text style={[type.priceMd, { color: it.storeCount > 1 ? c.dealText : c.ink }]}>{dollars(it.bestCents)}</Text>
      <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{it.storeCount > 1 ? `Lowest of ${it.storeCount} · ` : ''}{it.bestStore}</Text>
      <Text style={[type.caption, { color: old ? c.warning : c.inkTertiary }]} numberOfLines={1}>{note ?? `Seen ${observedAgo(it.bestObservedAt)}`}</Text>
    </PressableScale>
  );
}

/** Illustrated category tile (gradient + icon), same size for every category. */
export function CategoryTile({ cat, count, onPress, width }: { cat: (typeof CATEGORY_LIST)[number]; count?: number; onPress: () => void; width: number }) {
  const c = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={cat.label} onPress={onPress} style={{ width, gap: 6 }}>
      <LinearGradient colors={cat.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ height: width * 0.8, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' }}>
          <cat.icon size={28} color="#fff" strokeWidth={2.2} />
        </View>
      </LinearGradient>
      <Text style={[type.caption, { color: c.ink, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }]} numberOfLines={2}>{cat.label}</Text>
      {count != null && <Text style={[type.caption, { color: c.inkTertiary, textAlign: 'center', marginTop: -4 }]}>{count ? `${count} products` : 'Coming soon'}</Text>}
    </PressableScale>
  );
}
