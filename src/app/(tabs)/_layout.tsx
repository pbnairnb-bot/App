import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Heart, Home, LayoutGrid, ScanBarcode, User, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { useApp } from '@/state/app-state';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: Home },
  categories: { label: 'Categories', icon: LayoutGrid },
  favourites: { label: 'Favourites', icon: Heart },
  profile: { label: 'Profile', icon: User },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2), right = routes.slice(2);

  const tab = (r: (typeof routes)[number]) => {
    const meta = TABS[r.name];
    const focused = state.routes[state.index]?.key === r.key;
    const Icon = meta.icon;
    return (
      <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 2 }}>
        <Icon size={size.iconMd} color={focused ? c.brandText : c.inkSecondary} strokeWidth={focused ? 2.4 : 2} />
        <Text style={[type.caption, { color: focused ? c.brandText : c.inkSecondary, fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium' }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, space[2]), paddingTop: space[1],
      borderTopWidth: Platform.OS === 'android' ? 0 : 0.5, borderTopColor: c.border, shadowColor: '#1a1433', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {left.map(tab)}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Scan a barcode" accessibilityHint="Opens the camera to scan a product barcode" scaleTo={0.92}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/scan'); }}
            style={{ marginTop: -30, width: 64, height: 64, borderRadius: radius.full, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
              borderWidth: 5, borderColor: c.surface, shadowColor: '#5b3fd9', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            <ScanBarcode size={28} color={c.onBrand} />
          </PressableScale>
          <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_700Bold', marginTop: 2, marginBottom: 6 }]}>Scan</Text>
        </View>
        {right.map(tab)}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { ready, onboarded } = useApp();
  if (ready && !onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="favourites" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
