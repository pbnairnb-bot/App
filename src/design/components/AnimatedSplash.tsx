import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme';
import { easing, useReducedMotion } from './motion';

export interface AnimatedSplashProps {
  /** Set true once fonts and first data are ready; the splash finishes its build, then fades out. */
  ready: boolean;
  onFinish: () => void;
  tagline?: string;
}

/**
 * Launch animation (~1.4 s): "Price" slides in, the pill grows, "Match" fades in, "NZ" pops,
 * then the tagline. Hide expo-splash-screen right after this mounts: both share the brand-deep ground.
 */
export function AnimatedSplash({ ready, onFinish, tagline = 'Compare prices. Get it matched. Save.' }: AnimatedSplashProps) {
  const reduced = useReducedMotion();
  const v = React.useRef({ price: new Animated.Value(0), pill: new Animated.Value(0), match: new Animated.Value(0), nz: new Animated.Value(0), tag: new Animated.Value(0), exit: new Animated.Value(1) }).current;
  const [built, setBuilt] = React.useState(false);

  React.useEffect(() => {
    if (reduced) { Object.values(v).forEach((x) => x.setValue(1)); setBuilt(true); return; }
    const t = (x: Animated.Value, ms: number, delay: number, e = easing.emphasized) => Animated.timing(x, { toValue: 1, duration: ms, delay, easing: e, useNativeDriver: true });
    Animated.parallel([
      t(v.price, 420, 0),
      t(v.pill, 420, 260),
      t(v.match, 300, 520, easing.standard),
      t(v.nz, 420, 760, Easing.out(Easing.back(2.2))),
      t(v.tag, 400, 980, easing.standard),
    ]).start(() => setBuilt(true));
  }, [reduced, v]);

  React.useEffect(() => {
    if (!built || !ready) return;
    // Hold the finished logo briefly so it can be read, then fade into the app.
    const t = setTimeout(() => {
      Animated.timing(v.exit, { toValue: 0, duration: reduced ? 150 : 380, easing: easing.exit, useNativeDriver: true }).start(() => onFinish());
    }, reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [built, ready, reduced, onFinish, v]);

  const dark = colors.dark;
  return (
    <Animated.View accessible accessibilityRole="image" accessibilityLabel={`PriceMatch NZ. ${tagline}`}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: dark.brandDeep, opacity: v.exit, transform: [{ scale: v.exit.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] }]}>
      {/* Aurora gradient: starts on the native splash colour at the top so the handover is seamless. */}
      <LinearGradient colors={[dark.brandDeep, '#2e2468', '#4a32b8']} locations={[0, 0.55, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', 'rgba(62,230,176,0.18)']} start={{ x: 0, y: 0.6 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.mark}>
        <Animated.Text style={[styles.word, { color: dark.onBrandDeep, opacity: v.price, transform: [{ translateX: v.price.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}>Price</Animated.Text>
        <Animated.View style={[styles.pill, { opacity: v.pill, transform: [{ scaleX: v.pill.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>
          <Animated.Text style={[styles.word, { color: '#ffffff', opacity: v.match }]}>Match</Animated.Text>
        </Animated.View>
        <Animated.Text style={[styles.nz, { color: dark.deal, opacity: v.nz, transform: [{ scale: v.nz }] }]}>NZ</Animated.Text>
      </View>
      <Animated.Text style={[type.bodyLg, { color: dark.onBrandDeep, opacity: v.tag, marginTop: 16 }]}>{tagline}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { fontFamily: 'Outfit_700Bold', fontSize: 44, lineHeight: 52, letterSpacing: -1.3 },
  pill: { backgroundColor: '#7c63ec', borderRadius: 999, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
  nz: { fontFamily: 'Outfit_700Bold', fontSize: 14, alignSelf: 'flex-start', marginTop: 4 },
});
