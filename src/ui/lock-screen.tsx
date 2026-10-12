import { router } from 'expo-router';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { useAuth } from '@/state/auth';
import { Logo } from './kit';

/** Shown at launch when fingerprint / Face ID unlock is on. */
export function LockScreen() {
  const c = useTheme();
  const { unlock, signOut, biometric } = useAuth();
  const [failed, setFailed] = React.useState(false);
  const Icon = biometric.kind === 'face' ? ScanFace : Fingerprint;
  const label = biometric.kind === 'face' ? 'Face ID' : 'fingerprint';
  const tryUnlock = React.useCallback(async () => setFailed(!(await unlock())), [unlock]);
  React.useEffect(() => { tryUnlock(); }, [tryUnlock]);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[4] }]}>
      <Logo height={32} />
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center', marginTop: space[6] }}>
        <Icon size={48} color={c.brandText} />
      </View>
      <Text style={[type.h1, { color: c.ink, textAlign: 'center' }]}>Welcome back</Text>
      <Text style={[type.bodyLg, { color: c.inkSecondary, textAlign: 'center' }]}>{failed ? `That didn't work. Try your ${label} again, or sign in with a code.` : `Unlock with your ${label}.`}</Text>
      <View style={{ alignSelf: 'stretch', gap: space[2], marginTop: space[4] }}>
        <Button block icon={Icon} onPress={tryUnlock}>{`Unlock with ${label}`}</Button>
        <Button block variant="ghost" onPress={async () => { await signOut(); router.push('/sign-in'); }}>Use a code instead</Button>
      </View>
    </View>
  );
}
