import React from 'react';
import { type DimensionValue, Image, Pressable, Text, View } from 'react-native';
import { Heart, ImageIcon } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { DealBadge } from './DealBadge';
import { PriceBlock } from './PriceBlock';
import { Product } from './types';
import { useTheme } from './useTheme';

export interface ProductCardProps {
  product: Product;
  isFavourite?: boolean;
  onPress?: (p: Product) => void;
  onToggleFavourite?: (p: Product) => void;
  /** Card width: a number, or '100%' to fill a grid cell. */
  width?: DimensionValue;
}

export function ProductCard({ product, isFavourite, onPress, onToggleFavourite, width = 168 }: ProductCardProps) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}`}
      onPress={() => onPress?.(product)}
      style={{
        width, gap: space[2], padding: space[3], borderRadius: radius.lg, backgroundColor: c.surface,
        shadowColor: '#1a1433', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      }}
    >
      <View style={{ height: 112, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {product.imageUrl
          ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          : <ImageIcon size={size.iconMd} color={c.inkTertiary} />}
        {product.badge && <View style={{ position: 'absolute', top: space[2], left: space[2] }}><DealBadge tone={product.badge} /></View>}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !!isFavourite }}
          accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Save to favourites'}
          onPress={() => onToggleFavourite?.(product)}
          hitSlop={4}
          style={{ position: 'absolute', top: space[1], right: space[1], width: 40, height: 40, borderRadius: radius.full, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Heart size={size.iconSm} color={isFavourite ? c.brandText : c.inkSecondary} fill={isFavourite ? c.brandText : 'none'} />
        </Pressable>
      </View>
      <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{product.name}</Text>
      <PriceBlock price={product.price} wasPrice={product.wasPrice} size="md" />
      <Text style={[type.caption, { color: c.inkSecondary }]}>{product.where}</Text>
    </Pressable>
  );
}
