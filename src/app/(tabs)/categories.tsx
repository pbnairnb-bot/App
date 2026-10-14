import { router } from 'expo-router';
import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { CATEGORY_LIST } from '@/data/categories';
import { categoryCounts } from '@/data/store';
import { Screen, TAB_BAR_SPACE } from '@/ui/kit';
import { CategoryTile } from '@/ui/store-cards';

export default function Categories() {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [counts, setCounts] = React.useState<Record<string, number> | null>(null);
  React.useEffect(() => { categoryCounts().then(setCounts).catch(() => setCounts(null)); }, []);
  const cols = width >= 600 ? 4 : 3;
  const tileW = (Math.min(width, 720) - space[4] * 2 - space[3] * (cols - 1)) / cols;
  return (
    <Screen bottomSpace={TAB_BAR_SPACE}>
      <Text accessibilityRole="header" style={[type.h1, { color: c.ink, padding: space[4] }]}>Categories</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[4] }}>
        {CATEGORY_LIST.map((cat) => (
          <CategoryTile key={cat.id} cat={cat} width={tileW} count={cat.id === 'fuel-travel' || !counts ? undefined : counts[cat.id] ?? 0}
            onPress={() => (cat.id === 'fuel-travel' ? router.push('/fuel') : router.push({ pathname: '/category/[id]', params: { id: cat.id } }))} />
        ))}
      </View>
      <Text style={[type.caption, { color: c.inkSecondary, margin: space[4] }]}>
        Product counts are items with saved, verified store prices. More appear as stores are connected.
      </Text>
    </Screen>
  );
}
