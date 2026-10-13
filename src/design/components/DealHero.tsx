import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ImageIcon } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { DealBadge } from './DealBadge';
import { heroContent, HERO_WIDTH, type HeroTemplate } from './hero';
import { Deal, formatNZD } from './types';
import { useNow } from './useNow';
import { useTheme } from './useTheme';

export interface DealHeroProps { deal: Deal; onPress?: (deal: Deal) => void; now?: number }

/** A banner that designs itself from the deal's data (see hero.ts for the rules). */
export function DealHero({ deal, onPress, now }: DealHeroProps) {
  const c = useTheme();
  const live = useNow(now == null && !!deal.endsAt);
  const h = heroContent(deal, now ?? live);
  if (!h) return null;

  const look: Record<HeroTemplate, { bg: string; fg: string; eyebrowBg: string; eyebrowFg: string; headline: string; outlineEyebrow?: boolean }> = {
    percent: { bg: c.brand, fg: c.onBrand, eyebrowBg: c.deal, eyebrowFg: c.onDeal, headline: c.onBrand },
    countdown: { bg: c.brandDeep, fg: c.onBrandDeep, eyebrowBg: 'transparent', eyebrowFg: c.onBrandDeep, headline: c.deal, outlineEyebrow: true },
    drop: { bg: c.deal, fg: c.onDeal, eyebrowBg: c.onDeal, eyebrowFg: c.deal, headline: c.onDeal },
    best: { bg: c.brandSubtle, fg: c.ink, eyebrowBg: c.brand, eyebrowFg: c.onBrand, headline: c.brandText },
    spotlight: { bg: c.dealSubtle, fg: c.ink, eyebrowBg: c.deal, eyebrowFg: c.onDeal, headline: c.ink },
  };
  const L = look[h.template];
  const big = h.template === 'percent';
  const hasWas = deal.wasPrice != null && deal.wasPrice > deal.price;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${h.eyebrow}: ${big ? `${h.headline} off` : h.headline}. ${deal.product} at ${deal.retailer}, ${formatNZD(deal.price)}`}
      onPress={() => onPress?.(deal)}
      style={{
        width: HERO_WIDTH, minHeight: 184, flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4],
        borderRadius: radius.lg, backgroundColor: L.bg, overflow: 'hidden',
        shadowColor: '#1a1433', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      }}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[1] }}>
          <View style={{ paddingVertical: 3, paddingHorizontal: space[2], borderRadius: radius.sm, backgroundColor: L.eyebrowBg, borderWidth: L.outlineEyebrow ? 1 : 0, borderColor: L.eyebrowFg }}>
            <Text style={[type.badge, { color: L.eyebrowFg }]}>{h.eyebrow}</Text>
          </View>
        </View>
        <Text style={[big ? { ...type.display, fontSize: 48, lineHeight: 52, letterSpacing: -1.5 } : { ...type.h1, fontSize: h.template === 'countdown' ? 22 : 24, lineHeight: 28 }, { color: L.headline, marginTop: space[1], fontVariant: ['tabular-nums'] }]}>
          {h.headline}
          {h.accent && (
            <Text style={[big ? type.h2 : type.bodyStrong, { color: h.template === 'countdown' ? c.deal : L.headline, }]}>
              {big ? ` ${h.accent.toUpperCase()}` : h.template === 'countdown' ? `\n${h.accent}` : `  ${h.accent}`}
            </Text>
          )}
        </Text>
        <Text style={[type.bodyStrong, { fontSize: 15, color: L.fg, marginTop: space[1] }]} numberOfLines={2}>{deal.product}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: space[2] }}>
          <Text style={[type.caption, { fontSize: 13, color: L.fg }]}>{deal.retailer}</Text>
          {h.template !== 'spotlight' && <Text style={[type.priceMd, { fontSize: 15, color: L.fg }]}>{formatNZD(deal.price)}</Text>}
          {hasWas && <Text style={[type.caption, { fontSize: 13, color: L.fg, textDecorationLine: 'line-through' }]}>{formatNZD(deal.wasPrice!)}</Text>}
        </View>
      </View>
      <View style={{ width: 96, height: 96, borderRadius: radius.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {deal.imageUrl
          ? <Image source={{ uri: deal.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          : <ImageIcon size={size.iconMd} color={c.inkTertiary} />}
      </View>
    </Pressable>
  );
}
