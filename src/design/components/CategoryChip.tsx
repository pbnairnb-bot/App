import React from 'react';
import { Pressable, Text } from 'react-native';
import { Fuel, ShoppingCart, type LucideIcon } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export const CATEGORIES: Array<{ id: string; label: string; icon?: LucideIcon }> = [
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'beauty', label: 'Beauty & pharmacy' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'appliances', label: 'Home appliances' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'pets', label: 'Pet supplies' },
  { id: 'petrol', label: 'Petrol', icon: Fuel },
];

export interface CategoryChipProps { label: string; icon?: LucideIcon; selected?: boolean; onToggle?: (selected: boolean) => void }

export function CategoryChip({ label, icon: Icon, selected = false, onToggle }: CategoryChipProps) {
  const c = useTheme();
  const fg = selected ? c.brandText : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onToggle?.(!selected)}
      hitSlop={4}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 40, paddingHorizontal: space[4], borderRadius: radius.full,
        backgroundColor: selected ? c.brandSubtle : c.surfaceMuted, borderWidth: 1, borderColor: selected ? c.brand : 'transparent',
      }}
    >
      {Icon && <Icon size={size.iconSm} color={fg} />}
      <Text style={[type.bodyStrong, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}
