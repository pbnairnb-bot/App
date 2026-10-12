import React from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { duration, easing, useReducedMotion } from './motion';

/** Rises 8 px and fades in on first mount; `index` staggers list items 40 ms apart. */
export function FadeInView({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const t = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: reduced ? 0 : duration.slow, delay: reduced ? 0 : index * duration.stagger, easing: easing.emphasized, useNativeDriver: true }).start();
  }, [reduced, index, t]);
  return <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}
