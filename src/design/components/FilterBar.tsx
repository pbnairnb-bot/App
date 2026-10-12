import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { Button } from './Button';
import { CategoryChip } from './CategoryChip';
import { activeFilterCount, DISTANCE_OPTIONS_KM, SORT_LABELS, type Filters, type ShopperLocation, type SortKey } from './filters';
import { useTheme } from './useTheme';

export interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onOpenAll: () => void;
  location?: ShopperLocation;
  onNeedLocation?: () => void;
  resultCount?: number;
}

function Pill({ label, on, onPress, icon: Icon, a11y }: { label: string; on?: boolean; onPress: () => void; icon?: typeof MapPin; a11y?: string }) {
  const c = useTheme();
  const fg = on ? c.brandText : c.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{ selected: !!on }} onPress={onPress} hitSlop={4}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.full,
        backgroundColor: on ? c.brandSubtle : c.surfaceMuted, borderWidth: 1, borderColor: on ? c.brand : 'transparent' }}>
      {Icon && <Icon size={size.iconSm} color={fg} />}
      <Text style={[type.bodyStrong, { color: fg }]}>{label}</Text>
      {!Icon && <ChevronDown size={16} color={fg} />}
    </Pressable>
  );
}

/** Quick filters above any list. Sort and distance cycle on tap; everything else is in FilterSheet. */
export function FilterBar({ filters, onChange, onOpenAll, location, onNeedLocation, resultCount }: FilterBarProps) {
  const c = useTheme();
  const n = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const sorts = (Object.keys(SORT_LABELS) as SortKey[]).filter((k) => k !== 'nearest' || location);
  const sort = filters.sort ?? 'relevance';
  const nextSort = sorts[(sorts.indexOf(sort) + 1) % sorts.length];
  const dists: Array<number | undefined> = [undefined, ...DISTANCE_OPTIONS_KM];
  const nextDist = dists[(dists.indexOf(filters.maxDistanceKm) + 1) % dists.length];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="toolbar"
      contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4], paddingVertical: space[1], alignItems: 'center' }}>
      <Pill icon={SlidersHorizontal} label={`Filters${n ? ` (${n})` : ''}`} on={n > 0} onPress={onOpenAll} />
      <Pill label={SORT_LABELS[sort]} a11y={`Sort: ${SORT_LABELS[sort]}. Tap for ${SORT_LABELS[nextSort]}`} onPress={() => set({ sort: nextSort })} />
      {location
        ? <Pill label={filters.maxDistanceKm != null ? `Within ${filters.maxDistanceKm} km` : 'Any distance'} on={filters.maxDistanceKm != null} onPress={() => set({ maxDistanceKm: nextDist })} />
        : <Pill icon={MapPin} label="Near me" onPress={() => onNeedLocation?.()} />}
      <CategoryChip label="Save 20%+" selected={(filters.minSavingPct ?? 0) >= 20} onToggle={(v) => set({ minSavingPct: v ? 20 : undefined })} />
      {n > 0 && <Button variant="ghost" onPress={() => onChange({ sort: filters.sort })}>Clear</Button>}
      {resultCount != null && <Text accessibilityLiveRegion="polite" style={[type.caption, { color: c.inkSecondary }]}>{resultCount} result{resultCount === 1 ? '' : 's'}</Text>}
    </ScrollView>
  );
}
