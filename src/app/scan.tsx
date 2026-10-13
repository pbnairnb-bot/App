import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CircleHelp, Flashlight, FlashlightOff, Keyboard, ScanBarcode, X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Button, FadeInView, PressableScale, useTheme } from '@/design/components';
import { colors, radius, size, space, type } from '@/design/theme';
import { useApp } from '@/state/app-state';
import { IconButton } from '@/ui/kit';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Opens the lookup for a scanned code; the lookup screen identifies it, records it in Scan History and shows prices. */
function useHandleCode() {
  return React.useCallback((code: string) => {
    router.replace({ pathname: '/barcode/[code]', params: { code, from: 'scan' } });
  }, []);
}

export default function ScanScreen() {
  const { scanGuideSeen, update } = useApp();
  const [showGuide, setShowGuide] = React.useState(!scanGuideSeen);
  const [permission, requestPermission] = useCameraPermissions();

  const start = async () => {
    update({ scanGuideSeen: true });
    if (!permission?.granted) await requestPermission();
    setShowGuide(false);
  };

  if (showGuide) return <Guide onStart={start} firstTime={!scanGuideSeen} />;
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) return <NoCamera canAsk={permission.canAskAgain} onAsk={requestPermission} />;
  return <Scanner onHelp={() => setShowGuide(true)} />;
}

function Guide({ onStart, firstTime }: { onStart: () => void; firstTime: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [how, setHow] = React.useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + space[4] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[4], paddingTop: space[2] }}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space[6], alignItems: 'center', gap: space[4], flexGrow: 1, justifyContent: 'center' }}>
        <FadeInView index={0}><ScanIllustration /></FadeInView>
        <FadeInView index={1} style={{ alignItems: 'center', gap: space[3] }}>
          <Text accessibilityRole="header" style={[type.display, { color: c.ink, textAlign: 'center' }]}>Scan. Compare. Save.</Text>
          <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center', maxWidth: 320 }]}>
            Scan a product barcode to compare prices across stores and find the best deal.
          </Text>
        </FadeInView>
        {how && (
          <FadeInView index={0} style={{ alignSelf: 'stretch', gap: space[3], backgroundColor: c.surface, borderRadius: radius.lg, padding: space[4] }}>
            {[
              ['Scan the barcode', 'Hold your phone over the barcode on the pack. It scans on its own, no button needed.'],
              ['See every store’s price', 'We show the best price first, then every store with its unit price and when it was checked.'],
              ['Get it matched', 'Found it cheaper? Show the “Get it matched” card at the counter of a store that price matches.'],
            ].map(([t, d], i) => (
              <View key={t} style={{ flexDirection: 'row', gap: space[3] }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.bodyStrong, { color: c.onBrand }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyStrong, { color: c.ink }]}>{t}</Text>
                  <Text style={[type.body, { color: c.inkSecondary }]}>{d}</Text>
                </View>
              </View>
            ))}
          </FadeInView>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: space[4], gap: space[2] }}>
        <Button block icon={ScanBarcode} onPress={onStart}>{firstTime ? 'Start scanning' : 'Back to scanning'}</Button>
        <Button block variant="ghost" onPress={() => setHow((v) => !v)}>{how ? 'Hide how it works' : 'How it works'}</Button>
      </View>
    </View>
  );
}

function ScanIllustration() {
  const c = useTheme();
  return (
    <Svg width={260} height={190} viewBox="0 0 260 190" accessibilityLabel="A phone scanning a barcode, then a list of store prices with the cheapest highlighted">
      <Rect x="18" y="20" width="96" height="160" rx="16" fill={c.surface} stroke={c.border} strokeWidth="2" />
      <Rect x="32" y="62" width="68" height="44" rx="6" fill={c.surfaceMuted} />
      {[38, 43, 46, 51, 56, 59, 64, 69, 72, 77, 82, 85, 90].map((x, i) => (
        <Rect key={x} x={x} y="70" width={i % 3 === 0 ? 3 : 1.6} height="28" fill={c.ink} />
      ))}
      <Rect x="26" y="83" width="80" height="2.5" rx="1" fill={c.deal} />
      <Path d="M28 56v-8h10M104 56v-8H94M28 112v8h10M104 112v8H94" stroke={c.brand} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M126 100h22" stroke={c.borderStrong} strokeWidth="2.5" strokeDasharray="3 4" strokeLinecap="round" />
      <Path d="M144 94l7 6-7 6" stroke={c.borderStrong} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          <Rect x="160" y={46 + i * 40} width="88" height="32" rx="8" fill={i === 0 ? c.dealSubtle : c.surface} stroke={i === 0 ? c.deal : c.border} strokeWidth="2" />
          <Circle cx="176" cy={62 + i * 40} r="7" fill={i === 0 ? c.dealText : c.borderStrong} opacity={i === 0 ? 1 : 0.5} />
          <Rect x="190" y={57 + i * 40} width={i === 0 ? 46 : 38} height="10" rx="5" fill={i === 0 ? c.dealText : c.border} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

function NoCamera({ canAsk, onAsk }: { canAsk: boolean; onAsk: () => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top, paddingBottom: insets.bottom + space[4] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: space[4] }}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: space[6], justifyContent: 'center', gap: space[4] }}>
        <Text style={[type.h1, { color: c.ink }]}>Camera is off for PriceMatch NZ</Text>
        <Text style={[type.bodyLg, { color: c.inkSecondary }]}>
          We only use the camera to read barcodes, and photos are never saved. You can still type the barcode number or search by name.
        </Text>
        <ManualEntry />
        <Button variant="secondary" block onPress={() => router.replace('/search')}>Search by name instead</Button>
        {canAsk ? <Button variant="ghost" block onPress={onAsk}>Allow camera</Button> : <Button variant="ghost" block onPress={() => Linking.openSettings()}>Open phone settings</Button>}
      </View>
    </KeyboardAvoidingView>
  );
}

function ManualEntry({ dark, onDone }: { dark?: boolean; onDone?: () => void }) {
  const theme = useTheme();
  const c = dark ? colors.dark : theme;
  const handle = useHandleCode();
  const [code, setCode] = React.useState('');
  const valid = /^\d{8,14}$/.test(code);
  const submit = () => { if (valid) { onDone?.(); handle(code); } };
  return (
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={14} placeholder="Barcode number"
        placeholderTextColor={c.inkTertiary} accessibilityLabel="Barcode number" onSubmitEditing={submit} returnKeyType="search"
        style={[type.bodyLg, { flex: 1, minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, color: c.ink, backgroundColor: c.surface }]} />
      <PressableScale accessibilityRole="button" accessibilityState={{ disabled: !valid }} onPress={submit}
        style={{ minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: valid ? c.brand : c.surfaceMuted, justifyContent: 'center' }}>
        <Text style={[type.button, { color: valid ? c.onBrand : c.inkTertiary }]}>Find</Text>
      </PressableScale>
    </View>
  );
}

function Scanner({ onHelp }: { onHelp: () => void }) {
  const insets = useSafeAreaInsets();
  const handle = useHandleCode();
  const [torch, setTorch] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const locked = React.useRef(false);
  const d = colors.dark;

  const onScanned = (r: BarcodeScanningResult) => {
    if (locked.current || !r.data) return;
    locked.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    handle(r.data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }} onBarcodeScanned={typing ? undefined : onScanned} />
      <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + space[2], paddingBottom: insets.bottom + space[4] }]} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[4] }}>
          <RoundBtn label="Close scanner" onPress={() => router.back()}><X size={24} color="#fff" /></RoundBtn>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <RoundBtn label={torch ? 'Turn torch off' : 'Turn torch on'} onPress={() => setTorch((t) => !t)} active={torch}>
              {torch ? <FlashlightOff size={22} color={d.onDeal} /> : <Flashlight size={22} color="#fff" />}
            </RoundBtn>
            <RoundBtn label="How scanning works" onPress={onHelp}><CircleHelp size={24} color="#fff" /></RoundBtn>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <View style={{ width: 280, height: 170 }}>
            {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
              <View key={i} style={[{ position: 'absolute', width: 36, height: 36, borderColor: d.deal }, pos,
                { borderTopWidth: 'top' in pos ? 4 : 0, borderBottomWidth: 'bottom' in pos ? 4 : 0, borderLeftWidth: 'left' in pos ? 4 : 0, borderRightWidth: 'right' in pos ? 4 : 0, borderRadius: 6 }]} />
            ))}
          </View>
          <Text style={[type.bodyLg, { color: '#fff', marginTop: space[6], fontFamily: 'Inter_600SemiBold', textShadowColor: '#0008', textShadowRadius: 6 }]}>Point at a barcode</Text>
        </View>

        <View style={{ marginHorizontal: space[4], padding: space[4], gap: space[3], borderRadius: radius.lg, backgroundColor: 'rgba(13,10,28,0.82)' }}>
          {typing ? (
            <ManualEntry dark onDone={() => setTyping(false)} />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setTyping(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget }}>
              <Keyboard size={22} color={d.ink} />
              <Text style={[type.button, { color: d.ink }]}>Type the barcode number</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function RoundBtn({ children, label, onPress, active }: { children: React.ReactNode; label: string; onPress: () => void; active?: boolean }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }} onPress={onPress}
      style={{ width: size.tapTarget, height: size.tapTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.dark.deal : 'rgba(13,10,28,0.6)' }}>
      {children}
    </PressableScale>
  );
}
