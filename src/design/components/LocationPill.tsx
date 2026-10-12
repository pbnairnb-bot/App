import React from 'react';
import { Pressable, Text } from 'react-native';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export interface LocationPillProps {
  /** Suburb or city; omit to show "Choose location". */
  label?: string;
  onPress?: () => void;
}

export function LocationPill({ label, onPress }: LocationPillProps) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `Location: ${label}. Change` : 'Choose location'}
      onPress={onPress}
      hitSlop={4}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.full, backgroundColor: c.surfaceMuted, alignSelf: 'flex-start' }}
    >
      <MapPin size={size.iconSm} color={c.ink} />
      <Text style={[type.bodyStrong, { color: c.ink }]}>{label ?? 'Choose location'}</Text>
      <ChevronDown size={size.iconSm} color={c.ink} />
    </Pressable>
  );
}
