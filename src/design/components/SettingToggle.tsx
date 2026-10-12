import React from 'react';
import { Switch, Text, View } from 'react-native';
import { space, type } from '../theme';
import { useTheme } from './useTheme';

export interface SettingToggleProps { title: string; description?: string; value: boolean; onValueChange: (v: boolean) => void }

export function SettingToggle({ title, description, value, onValueChange }: SettingToggleProps) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingVertical: space[3], paddingHorizontal: space[4], backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]}>{title}</Text>
        {description && <Text style={[type.caption, { color: c.inkSecondary }]}>{description}</Text>}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: c.brand, false: c.surfaceMuted }}
        thumbColor={value ? c.onBrand : c.borderStrong}
        ios_backgroundColor={c.surfaceMuted}
      />
    </View>
  );
}
