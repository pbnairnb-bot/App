import { router } from 'expo-router';
import { Bell, BellOff, Flame, Fuel, TrendingDown } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FadeInView, Notice, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { useApp } from '@/state/app-state';
import { timeAgo } from '@/ui/format';
import { EmptyState, Screen, TopBar } from '@/ui/kit';

export default function Alerts() {
  const c = useTheme();
  const { alertItems, alertsStatus, reloadAlerts, markAllAlertsRead, alerts: prefs, pushReady } = useApp();
  // Opening the screen marks what's shown as read (on the server too).
  React.useEffect(() => {
    if (alertsStatus === 'ready') { const t = setTimeout(markAllAlertsRead, 1500); return () => clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsStatus, alertItems.length]);
  const icon = { deal: Flame, drop: TrendingDown, petrol: Fuel };

  if (alertsStatus === 'signed-out') {
    return (
      <Screen>
        <TopBar title="Alerts" />
        <EmptyState icon={Bell} title="Sign in for price alerts" body="We'll tell you when a product you've saved drops in price. Alerts are tied to your account so they work on any phone."
          action="Sign in" onAction={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={reloadAlerts}>
      <TopBar title="Alerts" />
      <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
        {!prefs.enabled ? (
          <Notice tone="info" title="Notifications are off." action={{ label: 'Turn on', onPress: () => router.push('/profile') }}>
            Alerts still collect here. Turn on notifications in Profile to get them on your lock screen.
          </Notice>
        ) : !pushReady ? (
          <Notice tone="info" title="Alerts show here." action={{ label: 'Settings', onPress: () => router.push('/profile') }}>
            Lock-screen notifications need permission on this phone. Check Profile.
          </Notice>
        ) : null}

        {alertsStatus === 'loading' && <ActivityIndicator color={c.brand} style={{ marginTop: space[8] }} />}
        {alertsStatus === 'error' && (
          <Notice tone="warning" title="Couldn't load your alerts." action={{ label: 'Try again', onPress: () => { reloadAlerts(); } }}>
            Check your internet connection.
          </Notice>
        )}
        {alertsStatus === 'ready' && alertItems.length === 0 && (
          <EmptyState icon={BellOff} title="No alerts yet" body="Save products with the heart. When a verified price for one of them drops, you'll see it here."
            action="Find products" onAction={() => router.push('/search')} />
        )}

        {alertItems.map((a, i) => {
          const Icon = icon[a.kind] ?? Bell;
          return (
            <FadeInView key={a.id} index={Math.min(i, 8)}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${a.read ? '' : 'New. '}${a.title}. ${a.body}`} disabled={!a.productId}
                onPress={() => a.productId && router.push({ pathname: '/product/[id]', params: { id: a.productId } })}
                style={{ flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.surface, borderLeftWidth: a.read ? 0 : 4, borderLeftColor: c.brand }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.kind === 'drop' ? c.dealSubtle : c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={a.kind === 'drop' ? c.dealText : c.brandText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
                    <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{a.title}</Text>
                    <Text style={[type.caption, { color: c.inkTertiary }]}>{timeAgo(a.at)}</Text>
                  </View>
                  <Text style={[type.body, { color: c.inkSecondary }]}>{a.body}</Text>
                </View>
              </Pressable>
            </FadeInView>
          );
        })}
      </View>
    </Screen>
  );
}
