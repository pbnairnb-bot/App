import React from 'react';
import { FlatList, View } from 'react-native';
import { radius, space } from '../theme';
import { BANNER_WIDTH, DealBanner } from './DealBanner';
import { DealHero } from './DealHero';
import { heroContent, HERO_WIDTH } from './hero';
import { useNow } from './useNow';
import { Notice } from './Notice';
import { Deal, LoadState } from './types';
import { useTheme } from './useTheme';

export interface DealCarouselProps {
  deals: Deal[];
  state?: LoadState;
  onPressDeal?: (deal: Deal) => void;
  onRetry?: () => void;
  /** 'hero' = dynamic DealHero banners (default); 'card' = compact DealBanners. */
  variant?: 'hero' | 'card';
}

export function DealCarousel({ deals: all, state = 'ready', onPressDeal, onRetry, variant = 'hero' }: DealCarouselProps) {
  const c = useTheme();
  const [index, setIndex] = React.useState(0);
  const now = useNow(variant === 'hero' && all.some((d) => d.endsAt));
  const deals = variant === 'hero' ? all.filter((d) => heroContent(d, now)) : all;
  const step = (variant === 'hero' ? HERO_WIDTH : BANNER_WIDTH) + space[4];

  if (state === 'loading') {
    return (
      <View style={{ flexDirection: 'row', gap: space[4], paddingHorizontal: space[4] }} accessibilityLabel="Loading deals">
        {[0, 1].map((k) => <View key={k} style={{ width: BANNER_WIDTH, height: 168, borderRadius: radius.lg, backgroundColor: c.surfaceMuted }} />)}
      </View>
    );
  }
  if (state === 'error') {
    return <View style={{ paddingHorizontal: space[4] }}><Notice tone="error" title="Couldn't load deals." action={onRetry && { label: 'Try again', onPress: onRetry }}>Check your connection and try again.</Notice></View>;
  }
  if (state === 'empty' || deals.length === 0) {
    return <View style={{ paddingHorizontal: space[4] }}><Notice tone="info" title="No verified deals right now.">Check back later today.</Notice></View>;
  }
  return (
    <View style={{ gap: space[2] }}>
      <FlatList
        horizontal
        data={deals}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => variant === 'hero' ? <DealHero deal={item} onPress={onPressDeal} now={now} /> : <DealBanner deal={item} onPress={onPressDeal} />}
        ItemSeparatorComponent={() => <View style={{ width: space[4] }} />}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingVertical: space[1] }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
        accessibilityLabel="Today's best deals"
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[1] }} importantForAccessibility="no-hide-descendants">
        {deals.map((d, i) => (
          <View key={d.id} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: radius.full, backgroundColor: i === index ? c.brand : c.borderStrong }} />
        ))}
      </View>
    </View>
  );
}
