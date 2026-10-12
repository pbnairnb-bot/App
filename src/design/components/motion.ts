import React from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/** Motion tokens: match --dur-* and --ease-* in the web kit. */
export const duration = { fast: 150, base: 220, slow: 320, stagger: 40 } as const;
export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  emphasized: Easing.bezier(0.3, 0, 0, 1),
  exit: Easing.bezier(0.3, 0, 1, 1),
};

/** True when the phone's Reduce motion / Remove animations setting is on. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
