import React from 'react';
import { Text, View } from 'react-native';
import { FadeInView, PriceMatchList, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { Screen, TopBar } from '@/ui/kit';
import { policies } from '@/data/repo';

export default function Stores() {
  const c = useTheme();
  return (
    <Screen>
      <TopBar title="Price match stores" />
      <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[4] }}>
        <Text style={[type.bodyLg, { color: c.inkSecondary }]}>
          Found a lower price? These NZ stores may match or beat it. Tap a store to see its conditions. Rules change, so always check with the store before you buy.
        </Text>
        <View>
          <PriceMatchList title="" policies={policies} />
        </View>
      </FadeInView>
    </Screen>
  );
}
