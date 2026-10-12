import React from 'react';
import { Animated, Text, View } from 'react-native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import { radius, space, type } from '../theme';
import { Button } from './Button';
import { easing, useReducedMotion } from './motion';
import { useTheme } from './useTheme';

/** Asked once, right after the first successful code sign-in. */
export function BiometricOptIn({ kind = 'fingerprint', onEnable, onSkip }: { kind?: 'fingerprint' | 'face'; onEnable: () => void; onSkip: () => void }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const ping = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(ping, { toValue: 1, duration: 1800, easing: easing.standard, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduced, ping]);
  const name = kind === 'face' ? 'Face ID' : 'fingerprint';
  const Icon = kind === 'face' ? ScanFace : Fingerprint;
  return (
    <View accessibilityLabel={`Sign in with ${name}`} style={{ alignItems: 'center', gap: space[4], padding: space[6], borderRadius: radius.xl, backgroundColor: c.surface }}>
      <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: c.brand,
          opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }] }} />
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={48} color={c.brandText} strokeWidth={1.6} />
        </View>
      </View>
      <Text accessibilityRole="header" style={[type.h2, { color: c.ink, textAlign: 'center' }]}>{`Sign in faster with ${name}`}</Text>
      <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center' }]}>{`Next time, unlock PriceMatch NZ with your ${name} instead of a code.`}</Text>
      <View style={{ alignSelf: 'stretch' }}><Button block onPress={onEnable}>{`Use ${name}`}</Button></View>
      <Button variant="ghost" onPress={onSkip}>Not now</Button>
      <Text style={[type.caption, { color: c.inkSecondary, textAlign: 'center' }]}>{`Your ${name} stays on your phone. We never receive it.`}</Text>
    </View>
  );
}
