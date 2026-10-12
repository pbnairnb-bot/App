import React from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { duration, easing, useReducedMotion } from './motion';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: React.ReactNode }

/** A Pressable that gently scales down while pressed (0.97 by default). */
export function PressableScale({ style, scaleTo = 0.97, children, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = React.useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(scale, { toValue: v, duration: reduced ? 0 : duration.fast, easing: easing.standard, useNativeDriver: true }).start();
  return (
    <Pressable {...rest} onPressIn={(e) => { to(scaleTo); onPressIn?.(e); }} onPressOut={(e) => { to(1); onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
