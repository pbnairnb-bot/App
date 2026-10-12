import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { FadeInView, ProductCard, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { listings } from '@/data/repo';
import { useApp } from '@/state/app-state';
import { toCard } from '@/ui/format';
import { EmptyState, Screen, TAB_BAR_SPACE } from '@/ui/kit';

export default function Favourites() {
  const c = useTheme();
  const { favourites, toggleFavourite, location } = useApp();
  const items = React.useMemo(() => {
    const all = listings(location);
    return favourites.map((id) => all.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
  }, [favourites, location]);

  return (
    <Screen bottomSpace={TAB_BAR_SPACE}>
      <Text accessibilityRole="header" style={[type.h1, { color: c.ink, padding: space[4] }]}>Favourites</Text>
      {items.length === 0 ? (
        <EmptyState icon={Heart} title="No favourites yet" body="Tap the heart on any product to keep an eye on its price here." action="Browse deals" onAction={() => router.push('/search')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[4] }}>
          {items.map((l, i) => (
            <FadeInView key={l.id} index={i} style={{ width: '48%' }}>
              <ProductCard width="100%" product={toCard(l)} isFavourite onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.id } })} onToggleFavourite={() => toggleFavourite(l.id)} />
            </FadeInView>
          ))}
        </View>
      )}
    </Screen>
  );
}
