import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, size, space, type } from '../theme';
import { Button } from './Button';
import { CategoryChip } from './CategoryChip';
import { applyFilters, DISTANCE_OPTIONS_KM, facets, type Filterable, type Filters, type ShopperLocation } from './filters';
import { SettingToggle } from './SettingToggle';
import { useTheme } from './useTheme';

export interface FilterSheetProps {
  visible: boolean;
  items: Filterable[];
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
  location?: ShopperLocation;
  categoryLabels?: Record<string, string>;
}

/** Every filter in a bottom sheet; options and counts come from the data. */
export function FilterSheet({ visible, items, filters, onApply, onClose, location, categoryLabels = {} }: FilterSheetProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [f, setF] = React.useState<Filters>(filters);
  React.useEffect(() => { if (visible) setF(filters); }, [visible, filters]);
  const { categories, retailers } = facets(items);
  const toggle = (key: 'categories' | 'retailers', v: string) => {
    const cur = f[key] ?? []; setF({ ...f, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const count = applyFilters(items, f, location).length;
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: space[2] }}>
      <Text accessibilityRole="header" style={[type.bodyStrong, { color: c.ink }]}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>{children}</View>
    </View>
  );
  const num = (v?: number) => (v == null ? '' : String(v));
  const parse = (t: string) => (t.trim() === '' || isNaN(Number(t)) ? undefined : Number(t));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close filters" onPress={onClose} style={{ flex: 1, backgroundColor: c.overlay }} />
      <View style={{ maxHeight: '88%', backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: Math.max(insets.bottom, space[4]) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4] }}>
          <Text accessibilityRole="header" style={[type.h2, { color: c.ink }]}>Filters</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}
            style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <X size={size.iconMd} color={c.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[4], gap: space[6], paddingBottom: space[4] }}>
          <Section title="Category">
            {categories.map(([k, n]) => <CategoryChip key={k} label={`${categoryLabels[k] ?? k} · ${n}`} selected={!!f.categories?.includes(k)} onToggle={() => toggle('categories', k)} />)}
          </Section>
          <Section title="Retailer">
            {retailers.map(([r, n]) => <CategoryChip key={r} label={`${r} · ${n}`} selected={!!f.retailers?.includes(r)} onToggle={() => toggle('retailers', r)} />)}
          </Section>
          <Section title={location ? `Distance from ${location.label}` : 'Distance'}>
            {location ? (
              <>
                <CategoryChip label="Any" selected={f.maxDistanceKm == null} onToggle={() => setF({ ...f, maxDistanceKm: undefined })} />
                {DISTANCE_OPTIONS_KM.map((km) => <CategoryChip key={km} label={`${km} km`} selected={f.maxDistanceKm === km} onToggle={() => setF({ ...f, maxDistanceKm: km })} />)}
              </>
            ) : <Text style={[type.body, { color: c.inkSecondary }]}>Set your location to filter by distance.</Text>}
          </Section>
          <Section title="Saving">
            {[0, 10, 20, 30].map((p) => <CategoryChip key={p} label={p ? `${p}%+` : 'Any'} selected={(f.minSavingPct ?? 0) === p} onToggle={() => setF({ ...f, minSavingPct: p || undefined })} />)}
          </Section>
          <Section title="Price (NZD)">
            {(['minPrice', 'maxPrice'] as const).map((k) => (
              <View key={k} style={{ gap: space[1] }}>
                <Text style={[type.caption, { color: c.inkSecondary }]}>{k === 'minPrice' ? 'Min' : 'Max'}</Text>
                <TextInput accessibilityLabel={k === 'minPrice' ? 'Minimum price' : 'Maximum price'} keyboardType="decimal-pad" value={num(f[k])}
                  onChangeText={(t) => setF({ ...f, [k]: parse(t) })}
                  style={[type.bodyLg, { width: 120, minHeight: size.tapTarget, paddingHorizontal: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, color: c.ink, fontVariant: ['tabular-nums'] }]} />
              </View>
            ))}
          </Section>
          <SettingToggle title="Online and nationwide only" description="Hide in-store-only prices" value={!!f.onlineOnly} onValueChange={(v) => setF({ ...f, onlineOnly: v || undefined })} />
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] }}>
          <Button variant="ghost" onPress={() => setF({ sort: f.sort })}>Clear all</Button>
          <View style={{ flex: 1 }}><Button block onPress={() => onApply(f)}>{`Show ${count} result${count === 1 ? '' : 's'}`}</Button></View>
        </View>
      </View>
    </Modal>
  );
}
