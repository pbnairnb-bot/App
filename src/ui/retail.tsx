import { Image } from 'expo-image';
import { ExternalLink, ImageIcon } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { formatKm } from '@/data/compare';
import { dollars, isOld, observedAgo, type RetailProduct } from '@/data/retail';
import { Card } from './kit';

/** One product with its observed price at each store, lowest first. */
export function RetailCard({ p }: { p: RetailProduct }) {
  const c = useTheme();
  const compared = p.offers.length > 1;
  return (
    <Card style={{ padding: space[3], gap: space[2] }}>
      <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {p.image ? <Image source={{ uri: p.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel={p.name} /> : <ImageIcon size={22} color={c.inkTertiary} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{p.name}</Text>
          <Text style={[type.caption, { color: c.inkSecondary }]}>{[p.size, compared ? `Same item at ${p.offers.length} stores` : 'Only seen at 1 store'].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      {p.offers.map((o, i) => {
        const best = compared && i === 0;
        const old = isOld(o.observedAt);
        return (
          <View key={o.chain} accessible accessibilityLabel={`${o.store}, ${dollars(o.priceCents)}, observed ${observedAgo(o.observedAt)}`}
            style={{ flexDirection: 'row', gap: space[2], paddingTop: space[2], borderTopWidth: 1, borderTopColor: c.border }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[type.bodyStrong, { color: c.ink }]}>{o.store}{best ? <Text style={{ color: c.dealText }}>  · Lowest</Text> : null}</Text>
              <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={2}>
                {[o.location, o.km != null ? formatKm(o.km) : null, o.deliveryZone ? 'online delivery-zone price' : null].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[type.caption, { color: old ? c.warning : c.inkSecondary }]}>Last seen {observedAgo(o.observedAt)}{old ? ' · may have changed' : ''}</Text>
              {o.url && (
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(o.url!)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <ExternalLink size={12} color={c.brandText} />
                  <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_600SemiBold' }]}>Check at {o.store}</Text>
                </Pressable>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[type.priceMd, { color: best ? c.dealText : c.ink }]}>{dollars(o.priceCents)}</Text>
              {o.wasCents != null && <Text style={[type.caption, { color: c.inkTertiary, textDecorationLine: 'line-through' }]}>{dollars(o.wasCents)}</Text>}
              {o.promo && <Text style={[type.caption, { color: c.dealText, fontFamily: 'Inter_600SemiBold' }]}>Promo price</Text>}
              {o.unitPriceCents != null && o.unitMeasure && <Text style={[type.caption, { color: c.inkSecondary }]}>{dollars(o.unitPriceCents)}/{o.unitMeasure}</Text>}
            </View>
          </View>
        );
      })}
    </Card>
  );
}
