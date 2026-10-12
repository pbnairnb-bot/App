import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ImageIcon } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { DealBadge } from './DealBadge';
import { PriceBlock } from './PriceBlock';
import { Deal, formatNZD } from './types';
import { useTheme } from './useTheme';

export const BANNER_WIDTH = 320;

export interface DealBannerProps { deal: Deal; onPress?: (deal: Deal) => void }

export function DealBanner({ deal, onPress }: DealBannerProps) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.product} at ${deal.retailer}, ${formatNZD(deal.price)}${deal.isSample ? ', sample data' : ''}`}
      onPress={() => onPress?.(deal)}
      style={{
        width: BANNER_WIDTH, flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.dealSubtle,
        shadowColor: '#1a1433', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      }}
    >
      <View style={{ flex: 1, gap: space[2] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[1] }}>
          {deal.label && <DealBadge tone={deal.label} />}
          {deal.isSample && <DealBadge tone="sample" label="Sample" />}
        </View>
        <Text style={[type.h3, { color: c.ink }]} numberOfLines={2}>{deal.product}</Text>
        <Text style={[type.bodyStrong, { color: c.inkSecondary }]}>{deal.retailer}</Text>
        <PriceBlock price={deal.price} wasPrice={deal.wasPrice} size="md" />
        {deal.endsLabel && <Text style={[type.caption, { color: c.dealText }]}>{deal.endsLabel}</Text>}
      </View>
      <View style={{ width: 104, height: 104, alignSelf: 'center', borderRadius: radius.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {deal.imageUrl
          ? <Image source={{ uri: deal.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          : <ImageIcon size={size.iconMd} color={c.inkTertiary} />}
      </View>
    </Pressable>
  );
}
