import React from 'react';
import { Text, View } from 'react-native';
import { LocateFixed, MapPin } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { Button } from './Button';
import { CategoryChip } from './CategoryChip';
import { NZ_PLACES, type ShopperLocation } from './filters';
import { Notice } from './Notice';
import type { LocationStatus } from './useShopperLocation';
import { useTheme } from './useTheme';

export interface LocationPromptProps {
  status: LocationStatus;
  onUseMyLocation: () => void;
  onChoosePlace: (place: ShopperLocation) => void;
  places?: ShopperLocation[];
}

/** Explains the benefit, asks the OS only on tap, and always offers a manual choice. */
export function LocationPrompt({ status, onUseMyLocation, onChoosePlace, places = NZ_PLACES }: LocationPromptProps) {
  const c = useTheme();
  const blocked = status === 'denied' || status === 'unavailable';
  const [picking, setPicking] = React.useState(blocked);
  React.useEffect(() => { if (blocked) setPicking(true); }, [blocked]);
  return (
    <View accessibilityLabel="Choose your location" style={{ gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        <MapPin size={size.iconMd} color={c.brandText} />
        <View style={{ flex: 1 }}>
          <Text style={[type.h3, { fontFamily: 'Outfit_700Bold', color: c.ink }]}>See deals near you</Text>
          <Text style={[type.body, { color: c.inkSecondary }]}>We use your location only to show nearby stores and prices. You can change it any time.</Text>
        </View>
      </View>
      {status === 'denied' && <Notice tone="info" title="Location is off.">Choose your area below instead.</Notice>}
      {!picking ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <Button icon={LocateFixed} onPress={onUseMyLocation} disabled={status === 'requesting'}>{status === 'requesting' ? 'Finding you…' : 'Use my location'}</Button>
          <Button variant="ghost" onPress={() => setPicking(true)}>Choose area</Button>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {places.map((p) => <CategoryChip key={p.label} label={p.label} onToggle={() => onChoosePlace(p)} />)}
        </View>
      )}
    </View>
  );
}
