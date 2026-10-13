/*
 * Side-by-side store prices for one product. The cheapest fresh price is highlighted, and every
 * other store shows how much more it costs. Two to four columns fit any phone width (Android or
 * iPhone); more stores scroll sideways.
 */
import { TrendingDown } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { PressableScale, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { formatKm, nzd, type Offer, unitPrice } from '@/data/compare';
import type { Product } from '@/data/types';
import { StoreMark } from './kit';

export function CompareStrip({ product, offers, onPressStore, max = 4 }: { product: Product; offers: Offer[]; onPressStore?: (o: Offer) => void; max?: number }) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const list = offers.slice(0, max);
  if (!list.length) return null;
  const fresh = list.filter((o) => !o.stale);
  const lowest = Math.min(...(fresh.length ? fresh : list).map((o) => o.total));
  // Columns share the screen width: 2–3 visible at once, the rest scroll.
  const cols = Math.min(list.length, width < 380 ? 2.6 : 3);
  const tileW = Math.max(108, Math.floor((width - space[4] * 2 - space[2] * (Math.ceil(cols) - 1)) / cols));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2], paddingVertical: space[1] }}
      accessibilityLabel={`Prices for ${product.name} at ${list.length} stores`}>
      {list.map((o) => {
        const best = o.total === lowest && !o.stale;
        const diff = o.total - lowest;
        const up = unitPrice(o.price, product);
        return (
          <PressableScale key={o.storeId} accessibilityRole="button" onPress={() => onPressStore?.(o)}
            accessibilityLabel={`${o.store.name}, ${nzd(o.total)}${best ? ', lowest price' : `, ${nzd(diff)} more`}`}
            style={{ width: tileW, padding: space[3], gap: 6, borderRadius: radius.lg, backgroundColor: best ? c.dealSubtle : c.surface,
              borderWidth: best ? 2 : 1, borderColor: best ? c.deal : c.border, opacity: o.stale ? 0.55 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <StoreMark store={o.store} size={30} />
              {best && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, backgroundColor: c.deal }}>
                  <TrendingDown size={12} color={c.onDeal} strokeWidth={2.5} />
                  <Text style={[type.badge, { fontSize: 10, color: c.onDeal }]}>Lowest</Text>
                </View>
              )}
            </View>
            <Text style={[type.caption, { color: c.inkSecondary, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{o.store.name}</Text>
            <Text style={[type.priceMd, { fontSize: 20, lineHeight: 26, color: best ? c.dealText : c.ink }]}>{nzd(o.total)}</Text>
            <Text style={[type.caption, { color: best ? c.dealText : c.inkSecondary, fontFamily: best ? 'Inter_600SemiBold' : 'Inter_500Medium' }]} numberOfLines={1}>
              {best ? 'Best price' : `+${nzd(diff)}`}
            </Text>
            <Text style={[type.caption, { color: c.inkTertiary }]} numberOfLines={2}>
              {[up, o.onlineOnly ? 'Online, incl. delivery' : o.km != null ? formatKm(o.km) : null].filter(Boolean).join(' · ')}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
