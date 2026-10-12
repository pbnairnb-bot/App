import React from 'react';
import { Text, View } from 'react-native';
import { space, type } from '../theme';
import { formatNZD } from './types';
import { useTheme } from './useTheme';

export interface PriceBlockProps {
  price: number;
  /** Only pass when the original price is verified. */
  wasPrice?: number;
  size?: 'lg' | 'md';
  savingAs?: 'percent' | 'amount';
}

export function PriceBlock({ price, wasPrice, size = 'lg', savingAs = 'percent' }: PriceBlockProps) {
  const c = useTheme();
  const hasSaving = wasPrice != null && wasPrice > price;
  const saving = hasSaving
    ? savingAs === 'percent' ? `Save ${Math.round((1 - price / wasPrice!) * 100)}%` : `Save ${formatNZD(wasPrice! - price)}`
    : null;
  return (
    <View
      accessible
      accessibilityLabel={`${formatNZD(price)}${hasSaving ? `, was ${formatNZD(wasPrice!)}, ${saving}` : ''}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: space[2] }}
    >
      <Text style={[size === 'lg' ? type.priceLg : type.priceMd, { color: c.ink }]}>{formatNZD(price)}</Text>
      {hasSaving && (
        <Text style={[type.body, { color: c.inkTertiary, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] }]}>{formatNZD(wasPrice!)}</Text>
      )}
      {saving && <Text style={[type.bodyStrong, { color: c.dealText }]}>{saving}</Text>}
    </View>
  );
}
