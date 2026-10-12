import React from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { radius, space, type } from '../theme';
import { duration, easing, useReducedMotion } from './motion';
import { useTheme } from './useTheme';

export interface OtpInputProps { length?: number; value: string; onChange: (code: string) => void; onComplete?: (code: string) => void; error?: string }

/**
 * Six digit boxes over one hidden field, so SMS autofill (iOS "From Messages", Android SMS retriever)
 * and paste fill every box at once. Shakes on error.
 */
export function OtpInput({ length = 6, value, onChange, onComplete, error }: OtpInputProps) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const ref = React.useRef<TextInput>(null);
  const [focused, setFocused] = React.useState(false);
  const shake = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!error || reduced) return;
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: 360, easing: easing.standard, useNativeDriver: true }).start();
  }, [error, reduced, shake]);

  const set = (t: string) => {
    const clean = t.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };
  return (
    <View style={{ gap: space[2] }}>
      <Pressable accessibilityLabel={`${length}-digit code, ${value.length} entered`} onPress={() => ref.current?.focus()}>
        <Animated.View style={{ flexDirection: 'row', gap: space[2], transform: [{ translateX: shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -6, 6, -4, 4, 0] }) }] }}>
          {Array.from({ length }, (_, i) => {
            const d = value[i] ?? '';
            const active = focused && i === Math.min(value.length, length - 1);
            return (
              <View key={i} style={{ flex: 1, height: 56, borderRadius: radius.md, borderWidth: active ? 2 : 1, alignItems: 'center', justifyContent: 'center',
                borderColor: error ? c.danger : active || d ? c.brand : c.borderStrong, backgroundColor: c.surface }}>
                <Text style={[type.priceLg, { fontSize: 24, color: c.ink }]}>{d}</Text>
              </View>
            );
          })}
        </Animated.View>
      </Pressable>
      <TextInput ref={ref} value={value} onChangeText={set} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp"
        maxLength={length} autoFocus onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        accessibilityLabel="Verification code" style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
      {error && <Text accessibilityRole="alert" style={[type.bodyStrong, { color: c.danger }]}>{error}</Text>}
    </View>
  );
}

/** "Didn't get it? Resend in 0:45", then a Resend button. */
export function ResendTimer({ seconds = 45, onResend }: { seconds?: number; onResend: () => void }) {
  const c = useTheme();
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  if (left > 0) return <Text accessibilityLiveRegion="polite" style={[type.body, { color: c.inkSecondary }]}>{`Didn't get it? Resend in 0:${String(left).padStart(2, '0')}`}</Text>;
  return (
    <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { onResend(); setLeft(seconds); }}>
      <Text style={[type.bodyStrong, { color: c.brandText, textDecorationLine: 'underline' }]}>Resend code</Text>
    </Pressable>
  );
}

export const OTP_TIMING = { resendSeconds: 45, expiresMinutes: 10, fadeMs: duration.base } as const;
