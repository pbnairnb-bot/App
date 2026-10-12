import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export interface ButtonProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
}

export function Button({ children, variant = 'primary', block, disabled, icon: Icon, onPress }: ButtonProps) {
  const c = useTheme();
  const bg = disabled ? c.surfaceMuted : variant === 'primary' ? c.brand : variant === 'secondary' ? c.surface : 'transparent';
  const fg = disabled ? c.inkTertiary : variant === 'primary' ? c.onBrand : variant === 'secondary' ? c.ink : c.brandText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.tapTarget,
        paddingHorizontal: variant === 'ghost' ? space[3] : space[6],
        borderRadius: radius.md,
        backgroundColor: bg,
        borderWidth: variant === 'secondary' && !disabled ? 1 : 0,
        borderColor: c.borderStrong,
        alignSelf: block ? 'stretch' : 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {Icon && <Icon size={size.iconSm} color={fg} />}
        <Text style={[type.button, { color: fg }]}>{children}</Text>
      </View>
    </Pressable>
  );
}
