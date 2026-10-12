import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, Info } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { useTheme } from './useTheme';

export interface NoticeProps {
  tone: 'info' | 'warning' | 'error';
  title: string;
  children?: string;
  action?: { label: string; onPress: () => void };
}

export function Notice({ tone, title, children, action }: NoticeProps) {
  const c = useTheme();
  const look = {
    info: { bg: c.infoSubtle, fg: c.info, Icon: Info },
    warning: { bg: c.warningSubtle, fg: c.warning, Icon: AlertCircle },
    error: { bg: c.dangerSubtle, fg: c.danger, Icon: AlertCircle },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: look.bg }}
    >
      <look.Icon size={size.iconSm} color={look.fg} />
      <Text style={[type.body, { color: look.fg, flex: 1 }]}>
        <Text style={type.bodyStrong}>{title}</Text> {children}
      </Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={12}>
          <Text style={[type.bodyStrong, { color: look.fg, textDecorationLine: 'underline' }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
