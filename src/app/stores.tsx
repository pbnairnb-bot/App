import { ExternalLink } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { CategoryChip, FadeInView, Notice, PriceMatchList, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { CATEGORY_LABELS } from '@/data/categories';
import { policies } from '@/data/repo';
import { observedAgo } from '@/data/retail';
import { retailers, type Retailer } from '@/data/store';
import { Card, Screen, SectionHeader, TopBar } from '@/ui/kit';

const STATUS = {
  connected: { label: 'Prices connected', tone: 'deal' },
  possible: { label: 'Possible after approval', tone: 'brand' },
  not_connected: { label: 'Prices not connected yet', tone: 'muted' },
} as const;

/** NZ store directory: official website, category and whether we can show that store's prices (and why not). */
export default function Stores() {
  const c = useTheme();
  const [list, setList] = React.useState<Retailer[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | Retailer['integration']>('all');
  const load = React.useCallback(() => { setFailed(false); retailers().then(setList).catch(() => setFailed(true)); }, []);
  React.useEffect(load, [load]);
  const shown = (list ?? []).filter((r) => filter === 'all' || r.integration === filter);
  const count = (k: Retailer['integration']) => (list ?? []).filter((r) => r.integration === k).length;

  return (
    <Screen>
      <TopBar title="NZ stores" />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <Text style={[type.body, { color: c.inkSecondary }]}>
          Every store we know of, its official website, and whether PriceMatch NZ can show its prices. We only use data a store or source allows; for the rest, tap the website to check prices there.
        </Text>
        {failed && <Notice tone="warning" title="Can't load the store list." action={{ label: 'Try again', onPress: load }}>Check your internet connection.</Notice>}
        {!list && !failed && <ActivityIndicator color={c.brand} />}
        {list && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <CategoryChip label={`All ${list.length}`} selected={filter === 'all'} onToggle={() => setFilter('all')} />
            <CategoryChip label={`Connected ${count('connected')}`} selected={filter === 'connected'} onToggle={() => setFilter('connected')} />
            <CategoryChip label={`Possible ${count('possible')}`} selected={filter === 'possible'} onToggle={() => setFilter('possible')} />
            <CategoryChip label={`Not yet ${count('not_connected')}`} selected={filter === 'not_connected'} onToggle={() => setFilter('not_connected')} />
          </View>
        )}
        {shown.map((r, i) => {
          const st = STATUS[r.integration];
          const color = st.tone === 'deal' ? c.dealText : st.tone === 'brand' ? c.brandText : c.inkSecondary;
          return (
            <FadeInView key={r.id} index={Math.min(i, 8)}>
              <Card style={{ padding: space[3], gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[type.bodyStrong, { color: c.brandText }]}>{r.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bodyStrong, { color: c.ink }]}>{r.name}</Text>
                    <Text style={[type.caption, { color: c.inkSecondary }]}>{CATEGORY_LABELS[r.category] ?? r.category}</Text>
                  </View>
                  <Text style={[type.caption, { color, fontFamily: 'Inter_600SemiBold', textAlign: 'right', maxWidth: 120 }]}>{st.label}</Text>
                </View>
                <Text style={[type.caption, { color: c.inkSecondary }]}>{r.dataMethod}{r.coverage && r.coverage !== 'None' ? ` · ${r.coverage}` : ''}</Text>
                <Text style={[type.caption, { color: c.inkTertiary }]}>{r.permission}{r.lastDataAt ? ` · prices last seen ${observedAgo(r.lastDataAt)}` : ''}</Text>
                <Pressable accessibilityRole="link" accessibilityLabel={`Open ${r.name} website`} onPress={() => Linking.openURL(r.website)} hitSlop={6}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <ExternalLink size={12} color={c.brandText} />
                  <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_600SemiBold' }]}>{r.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text>
                </Pressable>
              </Card>
            </FadeInView>
          );
        })}
      </View>

      {policies.length > 0 && (
        <View style={{ marginTop: space[6] }}>
          <SectionHeader title="Stores that price match" />
          <View style={{ paddingHorizontal: space[4], gap: space[2] }}>
            <Text style={[type.body, { color: c.inkSecondary }]}>Found a lower price? These stores may match or beat it. Rules change, so always check with the store before you buy.</Text>
            <PriceMatchList title="" policies={policies} />
          </View>
        </View>
      )}
    </Screen>
  );
}
