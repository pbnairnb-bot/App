import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowDown, BellRing, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, useColorScheme, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, Text, View } from 'react-native';
import { Button, useTheme } from '@/design/components';
import { policies } from '@/data/repo';
import { radius, size, space, type } from '@/design/theme';
import { useApp } from '@/state/app-state';
import { Logo, Screen } from '@/ui/kit';

interface Page { key: string; eyebrow: string; title: string; body: string; art: () => React.ReactElement }

/** Page 1 art: one product, three stores, cheapest highlighted. */
function CompareArt() {
  const c = useTheme();
  const rows = [['EG', '#0e7c66', 'Store A', '$4.29', true], ['FM', '#b45309', 'Store B', '$4.79', false], ['EO', '#334155', 'Store C', '$5.10', false]] as const;
  return (
    <View style={{ width: 260, padding: space[3], gap: space[2], borderRadius: radius.lg, backgroundColor: c.surface }}>
      <Text style={[type.bodyStrong, { color: c.ink }]}>Peanut butter 380g</Text>
      {rows.map(([s, col, name, price, best]) => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[2], borderRadius: radius.md, backgroundColor: best ? c.dealSubtle : c.surfaceMuted, borderWidth: best ? 1.5 : 0, borderColor: c.deal }}>
          <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 10 }}>{s}</Text></View>
          <Text style={[type.body, { color: c.ink, flex: 1 }]}>{name}</Text>
          {best && <Text style={[type.badge, { color: c.dealText }]}>Best</Text>}
          <Text style={[type.priceMd, { fontSize: 16, color: best ? c.dealText : c.ink }]}>{price}</Text>
        </View>
      ))}
    </View>
  );
}

/** Page 2 art: the "Get it matched" card shown at the counter. */
function MatchArt() {
  const c = useTheme();
  return (
    <View style={{ width: 260, padding: space[4], gap: space[2], borderRadius: radius.xl, backgroundColor: c.brandDeep }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <ShieldCheck size={18} color={c.deal} />
        <Text style={[type.badge, { color: c.deal }]}>Cheaper price found</Text>
      </View>
      <Text style={[type.bodyStrong, { color: c.onBrandDeep }]}>Air fryer 5L</Text>
      <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 40, lineHeight: 46, color: c.deal }}>$129</Text>
      <Text style={[type.caption, { color: c.onBrandDeep, opacity: 0.85 }]}>Show this at the counter · Checked 2 h ago</Text>
    </View>
  );
}

/** Page 3 art: the good-price verdict and an alert. */
function AlertArt() {
  const c = useTheme();
  return (
    <View style={{ width: 260, gap: space[3] }}>
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.full, backgroundColor: c.dealSubtle }}>
        <ArrowDown size={18} color={c.dealText} strokeWidth={2.5} />
        <Text style={[type.bodyStrong, { color: c.dealText }]}>Lowest in 90 days</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: c.surface }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}><BellRing size={20} color={c.brandText} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: c.ink }]}>Price drop</Text>
          <Text style={[type.caption, { color: c.inkSecondary }]}>A favourite of yours is now cheaper.</Text>
        </View>
      </View>
    </View>
  );
}

const PAGES: Page[] = [
  { key: 'compare', eyebrow: 'What is PriceMatch NZ?', art: CompareArt, title: 'Compare Prices. Save More.',
    body: 'A free app for New Zealanders. Scan a barcode or search any product to see what it costs at each store, with the best price first.' },
  { key: 'match', eyebrow: 'Found it cheaper?', art: MatchArt, title: 'Get it price matched',
    body: `${policies.length} NZ stores may match or beat a cheaper price. We show where to ask, and give you a card to show at the counter.` },
  { key: 'alerts', eyebrow: 'Buy at the right time', art: AlertArt, title: 'Never miss a deal',
    body: 'We tell you when a price is a good one, and can let you know about the best deals and price drops on your favourites.' },
];

export default function Onboarding() {
  const c = useTheme();
  const dark = useColorScheme() === 'dark';
  const { update, alerts } = useApp();
  const [index, setIndex] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const list = React.useRef<FlatList<Page>>(null);
  const last = index === PAGES.length - 1;

  const finish = (alertsOn?: boolean) => {
    update({ onboarded: true, ...(alertsOn != null ? { alerts: { ...alerts, enabled: alertsOn } } : {}) });
    router.replace('/');
  };
  const goTo = (i: number) => {
    setIndex(i);
    list.current?.scrollToOffset({ offset: i * width, animated: true });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={{ flex: 1 }}>
    <LinearGradient colors={dark ? [c.canvas, '#1d1640', '#0f2420'] : ['#ffffff', c.canvas, '#e9e4ff']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    <Screen scroll={false} style={{ backgroundColor: 'transparent' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingTop: space[2], minHeight: 56 }}>
        <Logo height={26} />
        {!last && (
          <Pressable accessibilityRole="button" onPress={() => finish()} hitSlop={8} style={{ minHeight: size.tapTarget, justifyContent: 'center', paddingHorizontal: space[2] }}>
            <Text style={[type.button, { color: c.brandText }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <FlatList
            ref={list}
            data={PAGES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p.key}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={onScrollEnd}
            onScroll={onScrollEnd}
            scrollEventThrottle={64}
            renderItem={({ item }) => (
              <View style={{ width, paddingHorizontal: space[6], alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
                <LinearGradient colors={dark ? ['#2e2468', '#1a1433', '#0f2e27'] : ['#e9e4ff', '#f1edff', '#d6f8ec']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: 300, height: 260, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' }}>
                  <item.art />
                </LinearGradient>
                <Text style={[type.badge, { color: c.brandText, marginTop: space[2] }]}>{item.eyebrow}</Text>
                <Text accessibilityRole="header" style={[type.display, { color: c.ink, textAlign: 'center' }]}>{item.title}</Text>
                <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center' }]}>{item.body}</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={{ paddingHorizontal: space[4], paddingBottom: space[6], gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[2], marginBottom: space[1] }} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={`Go to page ${i + 1}`} onPress={() => goTo(i)} hitSlop={10}>
              <View style={{ height: 8, width: i === index ? 24 : 8, borderRadius: radius.full, backgroundColor: i === index ? c.brand : c.border }} />
            </Pressable>
          ))}
        </View>
        {last ? (
          <>
            <Button block onPress={() => finish(true)}>Turn on alerts</Button>
            <Button block variant="ghost" onPress={() => finish(false)}>Not now</Button>
          </>
        ) : (
          <Button block onPress={() => goTo(index + 1)}>{index === 0 ? 'Get started' : 'Next'}</Button>
        )}
        <Text style={[type.caption, { color: c.inkSecondary, textAlign: 'center' }]}>Free for New Zealanders · No sign-up needed · Your data stays on your phone</Text>
      </View>
    </Screen>
    </View>
  );
}
