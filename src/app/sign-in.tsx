import { router } from 'expo-router';
import { Mail, X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { BiometricOptIn, Button, FadeInView, Notice, OtpInput, ResendTimer, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { useAuth } from '@/state/auth';
import { IconButton, Screen } from '@/ui/kit';

type Step = 'email' | 'code' | 'biometric';

/** Optional sign-in with a one-time code by email, then a one-time fingerprint / Face ID offer. */
export default function SignIn() {
  const c = useTheme();
  const { sendCode, verifyCode, biometric } = useAuth();
  const [step, setStep] = React.useState<Step>('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [refresh, setRefresh] = React.useState('');
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const send = async () => {
    if (!validEmail) return;
    setBusy(true); setError(undefined);
    try { await sendCode(email); setStep('code'); }
    catch (e) { setError(friendly(e)); }
    finally { setBusy(false); }
  };

  const verify = async (value = code) => {
    if (value.length < 6) return;
    setBusy(true); setError(undefined);
    try {
      const session = await verifyCode(email, value);
      if (await biometric.shouldOffer()) { setRefresh(session.refresh_token); setStep('biometric'); }
      else router.back();
    } catch (e) { setError(friendly(e)); setCode(''); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: space[4] }}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ paddingHorizontal: space[6], gap: space[4] }}>
        {step === 'email' && (
          <FadeInView index={0} style={{ gap: space[4] }}>
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Sign in or create an account</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>No password needed. We'll email you a 6-digit code. Signing in keeps your favourites and scans on all your devices.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface }}>
              <Mail size={20} color={c.inkTertiary} />
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.co.nz" placeholderTextColor={c.inkTertiary} autoFocus
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" accessibilityLabel="Email address"
                returnKeyType="send" onSubmitEditing={send} style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[3] }]} />
            </View>
            {error && <Notice tone="error" title="Couldn't send the code.">{error}</Notice>}
            <Button block disabled={!validEmail || busy} onPress={send}>{busy ? 'Sending…' : 'Email me a code'}</Button>
            <Text style={[type.caption, { color: c.inkSecondary }]}>You can keep using PriceMatch NZ without an account. By signing in you agree to our Terms and Privacy Policy.</Text>
          </FadeInView>
        )}

        {step === 'code' && (
          <FadeInView index={0} style={{ gap: space[4] }}>
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Enter your code</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>We sent a 6-digit code to {email.trim()}. It works for 10 minutes. Check your spam folder if it's not there.</Text>
            <OtpInput value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} />
            <Button block disabled={code.length < 6 || busy} onPress={() => verify()}>{busy ? 'Checking…' : 'Sign in'}</Button>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button variant="ghost" onPress={() => { setStep('email'); setCode(''); setError(undefined); }}>Change email</Button>
              <ResendTimer onResend={send} />
            </View>
          </FadeInView>
        )}

        {step === 'biometric' && (
          <FadeInView index={0}>
            <BiometricOptIn kind={biometric.kind === 'face' ? 'face' : 'fingerprint'}
              onEnable={async () => { await biometric.enable(refresh); router.back(); }}
              onSkip={async () => { await biometric.later(); router.back(); }} />
          </FadeInView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/rate|too many|seconds/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
  if (/expired|invalid|token/i.test(m)) return 'That code didn’t work or has expired. Check it, or send a new one.';
  if (/network|fetch/i.test(m)) return 'No internet connection. Check your connection and try again.';
  return m;
}
