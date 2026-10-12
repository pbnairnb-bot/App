import React from 'react';
import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Search milk, nappies, TVs…' }: SearchBarProps) {
  const c = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space[2],
        minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.full,
        backgroundColor: c.surface, borderWidth: focused ? 2 : 1, borderColor: focused ? c.focus : c.borderStrong,
      }}
    >
      <Search size={size.iconMd} color={c.inkTertiary} />
      <TextInput
        accessibilityLabel="Search products"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        placeholder={placeholder}
        placeholderTextColor={c.inkTertiary}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[3] }]}
      />
    </View>
  );
}
