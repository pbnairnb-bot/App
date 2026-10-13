/* App-level building blocks built on the PriceMatch NZ design system. */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CloudOff, Minus, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Animated, Modal, Pressable, RefreshControl, ScrollView, type StyleProp, Text, useColorScheme, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, duration, easing, PressableScale, useReducedMotion, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import type { VerdictTone } from '@/data/compare';
import type { PricePoint, Store } from '@/data/types';

export const shadow = { shadowColor: '#1a1433', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;

/** Space the floating tab bar needs at the bottom of tab screens. */
export const TAB_BAR_SPACE = 104;

export function Screen({ children, scroll = true, bottomSpace = 24, style, onRefresh }: { children: React.ReactNode; scroll?: boolean; bottomSpace?: number; style?: StyleProp<ViewStyle>; onRefresh?: () => Promise<void> }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top, paddingBottom: insets.bottom + bottomSpace };
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = onRefresh ? <RefreshControl refreshing={refreshing} tintColor={c.brand} colors={[c.brand]} progressViewOffset={insets.top}
    onRefresh={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }} /> : undefined;
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={[pad, style]} keyboardShouldPersistTaps="handled" refreshControl={refresh}>{children}</ScrollView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: c.canvas }, { paddingTop: insets.top }, style]}>{children}</View>
  );
}

export function IconButton({ icon: Icon, label, onPress, badge, flat, color }: { icon: LucideIcon; label: string; onPress?: () => void; badge?: number; flat?: boolean; color?: string }) {
  const c = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} new` : label} onPress={onPress} hitSlop={4}
      style={[{ width: size.tapTarget, height: size.tapTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }, !flat && { backgroundColor: c.surface, ...shadow }]}>
      <Icon size={size.iconMd} color={color ?? c.ink} />
      {!!badge && (
        <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.deal, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[type.caption, { fontSize: 11, lineHeight: 14, color: c.onDeal, fontFamily: 'Inter_700Bold' }]}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function TopBar({ title, right, back = true }: { title?: string; right?: React.ReactNode; back?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[2], minHeight: 64 }}>
      {back && <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      {!!title && <Text accessibilityRole="header" style={[type.h1, { color: c.ink, flex: 1 }]} numberOfLines={1}>{title}</Text>}
      {!title && <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], marginBottom: space[3] }}>
      <Text accessibilityRole="header" style={[type.h2, { color: c.ink }]}>{title}</Text>
      {action && (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', minHeight: size.tapTarget }}>
          <Text style={[type.bodyStrong, { color: c.brandText }]}>{action}</Text>
          <ChevronRight size={18} color={c.brandText} />
        </Pressable>
      )}
    </View>
  );
}

export function Logo({ height = 30 }: { height?: number }) {
  const dark = useColorScheme() === 'dark';
  return (
    <Image accessibilityLabel="PriceMatch NZ" contentFit="contain" style={{ height, width: (height * 1249) / 246 }}
      source={dark ? require('@/assets/brand/logo-wordmark-dark.png') : require('@/assets/brand/logo-wordmark.png')} />
  );
}

/** Store mark: the licensed logo when we have one, otherwise initials on the store colour. */
export function StoreMark({ store, size: s = 40 }: { store: Pick<Store, 'short' | 'color' | 'logoUrl' | 'name'>; size?: number }) {
  if (store.logoUrl) return <Image source={{ uri: store.logoUrl }} style={{ width: s, height: s, borderRadius: s / 4 }} contentFit="contain" accessibilityLabel={store.name} />;
  return (
    <View accessible accessibilityLabel={store.name} style={{ width: s, height: s, borderRadius: s / 4, backgroundColor: store.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: s * 0.36, color: '#ffffff', letterSpacing: 0.3 }}>{store.short}</Text>
    </View>
  );
}

export function VerdictPill({ label, tone }: { label: string; tone: VerdictTone }) {
  const c = useTheme();
  const bg = tone === 'good' ? c.dealSubtle : tone === 'high' ? c.warningSubtle : c.surfaceMuted;
  const fg = tone === 'good' ? c.dealText : tone === 'high' ? c.warning : c.inkSecondary;
  const Icon = tone === 'good' ? ArrowDown : tone === 'high' ? ArrowUp : Minus;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.full, backgroundColor: bg }}>
      <Icon size={14} color={fg} strokeWidth={2.5} />
      <Text style={[type.caption, { color: fg, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
    </View>
  );
}

/**
 * Says plainly when live prices can't be reached, with a retry. Shows nothing while live.
 * The app never falls back to made-up prices.
 */
export function LiveDataNotice({ status, onRetry }: { status: 'loading' | 'live' | 'offline'; onRetry?: () => Promise<void> | void }) {
  const c = useTheme();
  const [busy, setBusy] = React.useState(false);
  if (status === 'live') return null;
  const offline = status === 'offline';
  return (
    <View accessibilityLiveRegion="polite" style={{ marginHorizontal: space[4], marginTop: space[3], padding: space[3], gap: space[2], borderRadius: radius.md,
      backgroundColor: offline ? c.warningSubtle : c.surfaceMuted, borderWidth: 1, borderColor: offline ? c.warning : c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <CloudOff size={18} color={offline ? c.warning : c.inkSecondary} />
        <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{offline ? "Can't load live prices" : 'Loading live prices…'}</Text>
      </View>
      {offline && (
        <>
          <Text style={[type.body, { color: c.inkSecondary }]}>We couldn't reach the PriceMatch server. Check your internet connection. We don't show old or made-up prices in the meantime.</Text>
          {onRetry && <View style={{ alignSelf: 'flex-start' }}><Button variant="secondary" disabled={busy} onPress={async () => { setBusy(true); try { await onRetry(); } finally { setBusy(false); } }}>{busy ? 'Trying…' : 'Try again'}</Button></View>}
        </>
      )}
    </View>
  );
}

/** A small bordered note used for honest "nothing verified yet" states inside a section. */
export function InfoNote({ icon: Icon, title, body, action, onAction }: { icon: LucideIcon; title: string; body: string; action?: string; onAction?: () => void }) {
  const c = useTheme();
  return (
    <View style={{ marginHorizontal: space[4], padding: space[4], gap: space[2], borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Icon size={20} color={c.brandText} />
        <Text style={[type.bodyStrong, { color: c.ink, flex: 1 }]}>{title}</Text>
      </View>
      <Text style={[type.body, { color: c.inkSecondary }]}>{body}</Text>
      {action && <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}><Text style={[type.bodyStrong, { color: c.brandText }]}>{action}</Text></Pressable>}
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const c = useTheme();
  const base = [{ backgroundColor: c.surface, borderRadius: radius.lg, ...shadow }, style];
  return onPress ? <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={base}>{children}</PressableScale> : <View style={base}>{children}</View>;
}

export function EmptyState({ icon: Icon, title, body, action, onAction }: { icon: LucideIcon; title: string; body: string; action?: string; onAction?: () => void }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: space[8], paddingVertical: space[12], gap: space[3] }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={32} color={c.brandText} />
      </View>
      <Text style={[type.h2, { color: c.ink, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center' }]}>{body}</Text>
      {action && <View style={{ marginTop: space[2] }}><Button onPress={onAction}>{action}</Button></View>}
    </View>
  );
}

/** A short message with an Undo action, e.g. after removing a scan. */
export function Toast({ message, actionLabel, onAction, visible, bottom = 120 }: { message: string; actionLabel?: string; onAction?: () => void; visible: boolean; bottom?: number }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(v, { toValue: visible ? 1 : 0, duration: reduced ? 0 : duration.base, easing: visible ? easing.emphasized : easing.exit, useNativeDriver: true }).start();
  }, [visible, reduced, v]);
  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: space[4], right: space[4], bottom, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space[4], paddingRight: space[1], minHeight: 52, borderRadius: radius.md, backgroundColor: c.brandDeep, ...shadow }}>
      <Text style={[type.body, { color: c.onBrandDeep, fontFamily: 'Inter_500Medium' }]}>{message}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: size.tapTarget, justifyContent: 'center', paddingHorizontal: space[3] }}>
          <Text style={[type.button, { color: c.deal }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export function ConfirmSheet({ visible, icon: Icon, title, body, confirmLabel, onConfirm, onCancel, danger }: { visible: boolean; icon: LucideIcon; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" onPress={onCancel} style={{ flex: 1, backgroundColor: c.overlay }} />
      <View accessibilityViewIsModal style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space[4], paddingBottom: insets.bottom + space[6], alignItems: 'center', gap: space[3] }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: danger ? c.dangerSubtle : c.brandSubtle, alignItems: 'center', justifyContent: 'center', marginTop: space[2] }}>
          <Icon size={28} color={danger ? c.danger : c.brandText} />
        </View>
        <Text style={[type.h2, { color: c.ink, textAlign: 'center' }]}>{title}</Text>
        <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center' }]}>{body}</Text>
        <PressableScale accessibilityRole="button" onPress={onConfirm}
          style={{ alignSelf: 'stretch', minHeight: size.tapTarget, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? c.danger : c.brand, marginTop: space[2] }}>
          <Text style={[type.button, { color: danger ? c.surface : c.onBrand }]}>{confirmLabel}</Text>
        </PressableScale>
        <View style={{ alignSelf: 'stretch' }}><Button variant="secondary" block onPress={onCancel}>Cancel</Button></View>
      </View>
    </Modal>
  );
}

/** 90-day price line with the lowest point marked. */
export function Sparkline({ points, width, height = 72 }: { points: PricePoint[]; width: number; height?: number }) {
  const c = useTheme();
  if (points.length < 2) return null;
  const ys = points.map((p) => p.price);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const x = (i: number) => (i * width) / (points.length - 1);
  const y = (v: number) => 6 + (height - 12) * (1 - (v - min) / span);
  const d = ys.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = ys.length - 1;
  return (
    <Svg width={width} height={height} accessibilityLabel="Price over the last 90 days">
      <Path d={`${d} L${width} ${height} L0 ${height} Z`} fill={c.brandSubtle} opacity={0.6} />
      <Path d={d} stroke={c.brandText} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Path d={`M${x(last)} ${y(ys[last])} m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0`} fill={c.deal} stroke={c.surface} strokeWidth={2} />
    </Svg>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[3] }, style]}>{children}</View>;
}
