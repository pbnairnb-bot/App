import { router } from 'expo-router';
import { Bell, Flame, Fuel, TrendingDown } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DealBadge, FadeInView, Notice, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { getAlerts } from '@/data/repo';
import { useApp } from '@/state/app-state';
import { timeAgo } from '@/ui/format';
import { Screen, TopBar } from '@/ui/kit';

export default function Alerts() {
  const c = useTheme();
  const { readAlerts, update } = useApp();
  const alerts = getAlerts();
  React.useEffect(() => {
    const ids = alerts.map((a) => a.id);
    if (ids.some((i) => !readAlerts.includes(i))) update({ readAlerts: Array.from(new Set([...readAlerts, ...ids])) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const icon = { deal: Flame, drop: TrendingDown, petrol: Fuel };

  return (
    <Screen>
      <TopBar title="Alerts" />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        <Notice tone="info" title="Sample alerts." action={{ label: 'Alert settings', onPress: () => router.push('/profile') }}>
          Push notifications start once alerts are connected. Choose what you want in Profile.
        </Notice>
        {alerts.map((a, i) => {
          const Icon = icon[a.kind] ?? Bell;
          const unread = !a.read && !readAlerts.includes(a.id);
          return (
            <FadeInView key={a.id} index={i}>
              <Pressable accessibilityRole="button" disabled={!a.productId} onPress={() => a.productId && router.push({ pathname: '/product/[id]', params: { id: a.productId } })}
                style={{ flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.surface, borderLeftWidth: unread ? 4 : 0, borderLeftColor: c.brand }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.kind === 'drop' ? c.dealSubtle : c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={a.kind === 'drop' ? c.dealText : c.brandText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
                    <Text style={[type.bodyStrong, { color: c.ink }]}>{a.title}</Text>
                    <Text style={[type.caption, { color: c.inkTertiary }]}>{timeAgo(a.at)}</Text>
                  </View>
                  <Text style={[type.body, { color: c.inkSecondary }]}>{a.body}</Text>
                  {a.kind !== 'petrol' && <View style={{ marginTop: 4 }}><DealBadge tone="sample" /></View>}
                </View>
              </Pressable>
            </FadeInView>
          );
        })}
      </View>
    </Screen>
  );
}
