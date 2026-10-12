import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { LocationPrompt, useShopperLocation, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { useApp } from '@/state/app-state';
import { IconButton, Screen } from '@/ui/kit';

/** Choose an area by hand, or use the phone's location. Only the chosen area is kept. */
export default function LocationScreen() {
  const c = useTheme();
  const { location, update } = useApp();
  const shopper = useShopperLocation(location);

  React.useEffect(() => {
    if (shopper.location && shopper.location !== location) {
      update({ location: shopper.location });
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopper.location]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4] }}>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Your area</Text>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: space[4], gap: space[4] }}>
        {location && <Text style={[type.bodyLg, { color: c.inkSecondary }]}>Showing prices near {location.label}.</Text>}
        <LocationPrompt status={shopper.status} onUseMyLocation={shopper.requestDevice} onChoosePlace={shopper.setManual} />
        <Text style={[type.caption, { color: c.inkSecondary }]}>Your location stays on your phone and is only used to sort stores by distance. We keep the area you choose, never a location history.</Text>
      </View>
    </Screen>
  );
}
