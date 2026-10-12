import React from 'react';
import { Text, View } from 'react-native';
import { radius, space, type } from '../theme';
import type { BadgeTone } from './types';
import { useTheme } from './useTheme';

const LABELS: Record<BadgeTone, string> = {
  deal: 'Deal of the day', limited: 'Limited-time deal', best: 'Best price', save: 'Save more', sample: 'Sample data',
};

export interface DealBadgeProps { tone: BadgeTone; label?: string }

export function DealBadge({ tone, label }: DealBadgeProps) {
  const c = useTheme();
  const look = {
    deal: { bg: c.deal, fg: c.onDeal },
    limited: { bg: c.dealSubtle, fg: c.dealText },
    best: { bg: c.brand, fg: c.onBrand },
    save: { bg: c.dealSubtle, fg: c.dealText },
    sample: { bg: c.warningSubtle, fg: c.warning },
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start', paddingVertical: space[1], paddingHorizontal: space[2], borderRadius: radius.sm, backgroundColor: look.bg,
        ...(tone === 'sample' ? { borderWidth: 1, borderStyle: 'dashed', borderColor: c.warning } : {}),
      }}
    >
      <Text style={[type.badge, { color: look.fg }]}>{label ?? LABELS[tone]}</Text>
    </View>
  );
}
