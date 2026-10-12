import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bell, Heart, House, LayoutGrid, User, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export type TabId = 'home' | 'categories' | 'favourites' | 'alerts' | 'profile';
export const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'categories', label: 'Categories', icon: LayoutGrid },
  { id: 'favourites', label: 'Favourites', icon: Heart },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

export interface BottomNavProps { active: TabId; onNavigate: (tab: TabId) => void; alertCount?: number }

/** Use as the custom tabBar of an Expo Router <Tabs>, or on its own. */
export function BottomNav({ active, onNavigate, alertCount }: BottomNavProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row', backgroundColor: c.surface, paddingTop: space[1], paddingHorizontal: space[2], paddingBottom: Math.max(insets.bottom, space[2]),
        shadowColor: '#1a1433', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 8,
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const on = id === active;
        const fg = on ? c.brandText : c.inkSecondary;
        return (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={id === 'alerts' && alertCount ? `${label}, ${alertCount} new` : label}
            onPress={() => onNavigate(id)} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <View>
              <Icon size={size.iconMd} color={fg} strokeWidth={on ? 2.5 : 2} />
              {id === 'alerts' && !!alertCount && (
                <View style={{ position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: radius.full, backgroundColor: c.deal, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.badge, { color: c.onDeal, textTransform: 'none' }]}>{alertCount > 9 ? '9+' : alertCount}</Text>
                </View>
              )}
            </View>
            <Text style={[type.caption, { color: fg }, on && { fontFamily: 'Inter_700Bold' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
