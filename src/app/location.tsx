import { router } from 'expo-router';
import { MapPin, Search, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { LocationPrompt, useShopperLocation, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { searchPlaces } from '@/data/fuel';
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

  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<Awaited<ReturnType<typeof searchPlaces>>>([]);
  const [searchErr, setSearchErr] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => searchPlaces(q).then((r) => { if (alive) { setResults(r); setSearchErr(false); } }).catch(() => alive && setSearchErr(true)), 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4] }}>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Your area</Text>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: space[4], gap: space[4] }}>
        {location && <Text style={[type.bodyLg, { color: c.inkSecondary }]}>Showing prices near {location.label}.</Text>}
        <LocationPrompt status={shopper.status} onUseMyLocation={shopper.requestDevice} onChoosePlace={shopper.setManual} />
        <View style={{ gap: space[2] }}>
          <Text style={[type.bodyStrong, { color: c.ink }]}>Or search for your suburb or town</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget, paddingHorizontal: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface }}>
            <Search size={20} color={c.inkTertiary} />
            <TextInput value={q} onChangeText={setQ} placeholder="e.g. Papatoetoe" placeholderTextColor={c.inkTertiary} accessibilityLabel="Suburb or town"
              autoCorrect={false} style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[2] }]} />
          </View>
          {searchErr && <Text style={[type.caption, { color: c.danger }]}>Can't search places right now. Check your connection.</Text>}
          {q.trim().length >= 2 && !searchErr && results.length === 0 && <Text style={[type.caption, { color: c.inkSecondary }]}>No NZ places found for “{q.trim()}”.</Text>}
          {results.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => { update({ location: { label: p.label, lat: p.lat, lng: p.lng, source: 'manual' } }); router.back(); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, paddingHorizontal: space[2], borderRadius: radius.md, backgroundColor: pressed ? c.surfaceMuted : 'transparent' })}>
              <MapPin size={18} color={c.brandText} />
              <Text style={[type.bodyLg, { color: c.ink }]}>{p.label}</Text>
            </Pressable>
          ))}
          <Text style={[type.caption, { color: c.inkTertiary }]}>Place names © OpenStreetMap contributors.</Text>
        </View>
        <Text style={[type.caption, { color: c.inkSecondary }]}>Your location stays on your phone and is only used to sort stores by distance. We keep the area you choose, never a location history.</Text>
      </View>
    </Screen>
  );
}
