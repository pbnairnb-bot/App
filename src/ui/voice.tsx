/*
 * Voice search: speak instead of typing. Uses the phone's own speech recogniser (Google on
 * Android, Apple on iPhone) in New Zealand English. Nothing is recorded or stored by us.
 */
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, MicOff } from 'lucide-react-native';
import React from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale, useReducedMotion, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';

export function useVoice(onFinal: (text: string) => void, hints: string[] = []) {
  const [listening, setListening] = React.useState(false);
  const [partial, setPartial] = React.useState('');
  const [error, setError] = React.useState<string>();
  const final = React.useRef(onFinal);
  final.current = onFinal;

  useSpeechRecognitionEvent('start', () => { setListening(true); setError(undefined); });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    setPartial(t);
    if (e.isFinal && t.trim()) { setListening(false); final.current(t.trim()); }
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setError(e.error === 'no-speech' || e.error === 'speech-timeout' ? "I didn't catch that. Tap the mic and try again."
      : e.error === 'not-allowed' ? 'Microphone access is off. You can turn it on in your phone settings.'
      : e.error === 'aborted' ? undefined : 'Voice search is not available right now. Try typing instead.');
  });

  const start = React.useCallback(async () => {
    setPartial(''); setError(undefined);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setError('Microphone access is off. You can turn it on in your phone settings.'); return; }
      ExpoSpeechRecognitionModule.start({ lang: 'en-NZ', interimResults: true, continuous: false, contextualStrings: hints.slice(0, 50) });
      setListening(true);
    } catch {
      setError('Voice search is not available on this device. Try typing instead.');
    }
  }, [hints]);

  const stop = React.useCallback(() => { try { ExpoSpeechRecognitionModule.stop(); } catch { /* not running */ } setListening(false); }, []);
  return { listening, partial, error, start, stop, clearError: () => setError(undefined) };
}

/** Round mic button for search bars. */
export function MicButton({ onPress, listening, size: s = 40 }: { onPress: () => void; listening?: boolean; size?: number }) {
  const c = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Search by voice'} onPress={onPress} hitSlop={6}
      style={{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: listening ? c.brand : c.brandSubtle }}>
      {listening ? <MicOff size={20} color={c.onBrand} /> : <Mic size={20} color={c.brandText} />}
    </PressableScale>
  );
}

/** Full-width "Listening…" sheet with a pulsing mic and the words as they're heard. */
export function ListeningSheet({ visible, partial, error, onStop, onRetry, prompt = 'Try “cheapest milk near me”' }: {
  visible: boolean; partial: string; error?: string; onStop: () => void; onRetry: () => void; prompt?: string;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!visible || reduced || error) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [visible, reduced, error, pulse]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStop} statusBarTranslucent>
      <Pressable accessibilityLabel="Stop listening" onPress={onStop} style={{ flex: 1, backgroundColor: c.overlay }} />
      <View accessibilityViewIsModal style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space[6], paddingBottom: insets.bottom + space[6], alignItems: 'center', gap: space[4] }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          {!error && (
            <Animated.View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: c.brand,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }} />
          )}
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: error ? c.surfaceMuted : c.brand, alignItems: 'center', justifyContent: 'center' }}>
            {error ? <MicOff size={34} color={c.inkSecondary} /> : <Mic size={34} color={c.onBrand} />}
          </View>
        </View>
        <Text accessibilityLiveRegion="polite" style={[type.h2, { color: c.ink, textAlign: 'center', minHeight: 56 }]}>
          {error ? error : partial ? `“${partial}”` : 'Listening…'}
        </Text>
        {!error && !partial && <Text style={[type.body, { color: c.inkSecondary }]}>{prompt}</Text>}
        <View style={{ alignSelf: 'stretch', gap: space[2] }}>
          {error ? <Button block icon={Mic} onPress={onRetry}>Try again</Button> : <Button block variant="secondary" onPress={onStop}>Done</Button>}
          {error && <Button block variant="ghost" onPress={onStop}>Type instead</Button>}
        </View>
        <Text style={[type.caption, { color: c.inkTertiary, textAlign: 'center', minHeight: size.iconSm }]}>Uses your phone's speech recognition. We don't record your voice.</Text>
      </View>
    </Modal>
  );
}
