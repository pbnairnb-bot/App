import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { FadeInView, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { listings } from '@/data/repo';
import { Card, Screen, TAB_BAR_SPACE } from '@/ui/kit';

export default function Categories() {
  const c = useTheme();
  const counts = React.useMemo(() => {
    const m: Record<string, number> = {};
    listings().forEach((l) => { m[l.category!] = (m[l.category!] ?? 0) + 1; });
    return m;
  }, []);
  return (
    <Screen bottomSpace={TAB_BAR_SPACE}>
      <Text accessibilityRole="header" style={[type.h1, { color: c.ink, paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[4] }]}>Categories</Text>
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        {CATEGORY_LIST.map((cat, i) => {
          const n = counts[cat.id] ?? 0;
          return (
            <FadeInView key={cat.id} index={i}>
              <Card accessibilityLabel={cat.label} onPress={() => router.push({ pathname: '/search', params: { category: cat.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] }}>
                <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: cat.id === 'petrol' ? c.dealSubtle : c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <cat.icon size={26} color={cat.id === 'petrol' ? c.dealText : c.brandText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.h3, { color: c.ink }]}>{cat.label}</Text>
                  <Text style={[type.caption, { color: c.inkSecondary }]}>
                    {cat.id === 'petrol' ? 'Shown once reliable fuel data is connected' : n ? `${n} sample product${n === 1 ? '' : 's'}` : 'Coming soon'}
                  </Text>
                </View>
                <ChevronRight size={20} color={c.inkTertiary} />
              </Card>
            </FadeInView>
          );
        })}
      </View>
    </Screen>
  );
}
