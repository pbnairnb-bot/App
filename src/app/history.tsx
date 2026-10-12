import { router } from 'expo-router';
import { ScanBarcode, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { nzd } from '@/data/compare';
import type { ScanRecord } from '@/data/types';
import { useApp } from '@/state/app-state';
import { ConfirmSheet, EmptyState, IconButton, Screen, Toast, TopBar, VerdictPill } from '@/ui/kit';

function groupOf(iso: string) {
  const d = new Date(iso), now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400e3);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? 'This week' : 'Earlier';
}

export default function History() {
  const c = useTheme();
  const { scans, removeScan, restoreScan, clearScans } = useApp();
  const [confirm, setConfirm] = React.useState(false);
  const [removed, setRemoved] = React.useState<ScanRecord | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const remove = (id: string) => {
    const r = removeScan(id);
    if (!r) return;
    setRemoved(r);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRemoved(null), 5000);
  };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const sections = ['Today', 'Yesterday', 'This week', 'Earlier']
    .map((title) => ({ title, data: scans.filter((s) => groupOf(s.scannedAt) === title) }))
    .filter((s) => s.data.length);

  return (
    <Screen scroll={false}>
      <TopBar title="Scan history" right={scans.length > 0 && (
        <Pressable accessibilityRole="button" onPress={() => setConfirm(true)} style={{ minHeight: size.tapTarget, justifyContent: 'center', paddingHorizontal: space[2] }}>
          <Text style={[type.button, { color: c.danger }]}>Clear all</Text>
        </Pressable>
      )} />
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: 140 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState icon={ScanBarcode} title="No scans yet" body="Tap Scan to compare a product's price across stores." action="Scan a product" onAction={() => router.replace('/scan')} />}
        renderSectionHeader={({ section }) => <Text style={[type.bodyStrong, { color: c.inkSecondary, marginTop: space[4], marginBottom: space[2] }]}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const first = index === 0, last = index === section.data.length - 1;
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingLeft: space[3], paddingVertical: space[2], backgroundColor: c.surface,
              borderTopLeftRadius: first ? radius.lg : 0, borderTopRightRadius: first ? radius.lg : 0, borderBottomLeftRadius: last ? radius.lg : 0, borderBottomRightRadius: last ? radius.lg : 0,
              borderTopWidth: first ? 0 : 1, borderTopColor: c.border }}>
              <Pressable accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56 }}
                onPress={() => (item.productId ? router.push({ pathname: '/product/[id]', params: { id: item.productId } }) : router.push({ pathname: '/barcode/[code]', params: { code: item.barcode } }))}>
                <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <ScanBarcode size={20} color={c.brandText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>
                    {item.bestPrice != null ? `Best ${nzd(item.bestPrice)} at ${item.bestStore}` : 'No prices yet'} · {new Date(item.scannedAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  {item.verdict && <VerdictPill label={item.verdict} tone={item.verdict.startsWith('Lowest') ? 'good' : item.verdict.startsWith('Higher') ? 'high' : 'normal'} />}
                </View>
              </Pressable>
              <IconButton icon={Trash2} flat label={`Remove ${item.name} from history`} color={c.inkSecondary} onPress={() => remove(item.id)} />
            </View>
          );
        }}
      />
      <Toast visible={!!removed} message="Scan removed" actionLabel="Undo" bottom={40}
        onAction={() => { if (removed) restoreScan(removed); setRemoved(null); }} />
      <ConfirmSheet visible={confirm} danger icon={Trash2} title="Clear your scan history?"
        body={`This removes all ${scans.length} scan${scans.length === 1 ? '' : 's'} from PriceMatch NZ. It can't be undone.`}
        confirmLabel="Clear all" onCancel={() => setConfirm(false)} onConfirm={() => { clearScans(); setConfirm(false); setRemoved(null); }} />
    </Screen>
  );
}
