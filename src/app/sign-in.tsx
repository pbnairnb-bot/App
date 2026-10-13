import { router } from 'expo-router';
import { Smartphone, X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { BiometricOptIn, Button, FadeInView, Notice, OtpInput, ResendTimer, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { formatNzMobile, toNzMobile } from '@/lib/phone';
import { useAuth } from '@/state/auth';
import { IconButton, Screen } from '@/ui/kit';

type Step = 'phone' | 'code' | 'biometric';

/** Optional sign-in with a one-time code by SMS to an NZ mobile, then a one-time fingerprint / Face ID offer. */
export default function SignIn() {
  const c = useTheme();
  const { sendCode, verifyCode, biometric } = useAuth();
  const [step, setStep] = React.useState<Step>('phone');
  const [input, setInput] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [refresh, setRefresh] = React.useState('');
  const phone = toNzMobile(input);
  const [sentAt, setSentAt] = React.useState(0);

  const send = async () => {
    if (!phone) { setError('Enter a New Zealand mobile number, like 021 123 4567.'); return; }
    setBusy(true); setError(undefined);
    try { await sendCode(phone); setSentAt(Date.now()); setCode(''); setStep('code'); }
    catch (e) { setError(friendly(e)); }
    finally { setBusy(false); }
  };

  const verify = async (value = code) => {
    if (value.length < 6 || !phone) return;
    if (Date.now() - sentAt > 10 * 60 * 1000) { setError('This code has expired. Tap “Send a new code”.'); setCode(''); return; }
    setBusy(true); setError(undefined);
    try {
      const session = await verifyCode(phone, value);
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
        {step === 'phone' && (
          <FadeInView index={0} style={{ gap: space[4] }}>
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Sign in with your mobile</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>No password needed. We'll text a 6-digit code to your New Zealand mobile. Signing in keeps your favourites and price alerts on all your devices.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.borderStrong, backgroundColor: c.surface }}>
              <Smartphone size={20} color={c.inkTertiary} />
              <Text style={[type.bodyLg, { color: c.inkSecondary }]}>NZ</Text>
              <TextInput value={input} onChangeText={(t) => { setInput(t); setError(undefined); }} placeholder="021 123 4567" placeholderTextColor={c.inkTertiary} autoFocus
                keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" accessibilityLabel="Mobile number"
                returnKeyType="send" onSubmitEditing={send} maxLength={16} style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[3] }]} />
            </View>
            {error && <Notice tone="error" title="Couldn't send the code.">{error}</Notice>}
            <Button block disabled={!phone || busy} onPress={send}>{busy ? 'Sending…' : 'Text me a code'}</Button>
            <Text style={[type.caption, { color: c.inkSecondary }]}>Standard SMS rules apply; the text is free to receive in NZ. You can keep using PriceMatch NZ without an account. By signing in you agree to our Terms and Privacy Policy.</Text>
          </FadeInView>
        )}

        {step === 'code' && (
          <FadeInView index={0} style={{ gap: space[4] }}>
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Enter your code</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>We texted a 6-digit code to {phone ? formatNzMobile(phone) : input}. It works for 10 minutes. It can take up to a minute to arrive.</Text>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(undefined); }} onComplete={(v) => verify(v)} error={error} />
            <Button block disabled={code.length < 6 || busy} onPress={() => verify()}>{busy ? 'Checking…' : 'Sign in'}</Button>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button variant="ghost" onPress={() => { setStep('phone'); setCode(''); setError(undefined); }}>Change number</Button>
              <ResendTimer key={sentAt} seconds={60} onResend={send} />
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
  const status = (e as { status?: number })?.status;
  if (status === 429 || /rate|too many|for security purposes|seconds/i.test(m)) return 'Too many tries. Please wait a minute before asking for another code.';
  if (/expired|invalid|token/i.test(m)) return 'That code didn’t work or has expired. Check it, or send a new one.';
  if (/unsupported phone provider|phone.*(disabled|not enabled)|sms.*provider/i.test(m)) return 'Text-message sign-in isn’t switched on yet. Please try again later.';
  if (/invalid.*phone|phone.*invalid/i.test(m)) return 'That number can’t receive texts. Check it’s an NZ mobile.';
  if (/network|fetch/i.test(m)) return 'No internet connection. Check your connection and try again.';
  return 'Something went wrong sending the code. Please try again.';
}
