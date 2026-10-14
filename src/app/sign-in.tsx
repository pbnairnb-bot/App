import { router } from 'expo-router';
import { Mail, Smartphone, X } from 'lucide-react-native';
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
  const [mode, setMode] = React.useState<'phone' | 'email'>('phone');
  const [smsOff, setSmsOff] = React.useState(false);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim()) ? input.trim().toLowerCase() : null;
  // The verified target: an NZ mobile (+64…) or an email address.
  const phone = mode === 'phone' ? toNzMobile(input) : email;
  const [sentAt, setSentAt] = React.useState(0);
  const switchMode = (m: 'phone' | 'email') => { setMode(m); setInput(''); setError(undefined); };

  const send = async () => {
    if (!phone) { setError(mode === 'phone' ? 'Enter a New Zealand mobile number, like 021 123 4567.' : 'Enter a valid email address.'); return; }
    setBusy(true); setError(undefined);
    try { await sendCode(phone); setSentAt(Date.now()); setCode(''); setStep('code'); }
    catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (mode === 'phone' && /unsupported phone provider|phone_provider_disabled/i.test(m + ((e as any)?.code ?? ''))) setSmsOff(true);
      setError(friendly(e));
    }
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
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>{mode === 'phone' ? 'Sign in with your mobile' : 'Sign in with your email'}</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>No password needed. We'll {mode === 'phone' ? 'text a 6-digit code to your New Zealand mobile' : 'email you a 6-digit code'}. Signing in keeps your favourites, scan history and price alerts on all your devices.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.borderStrong, backgroundColor: c.surface }}>
              {mode === 'phone' ? <Smartphone size={20} color={c.inkTertiary} /> : <Mail size={20} color={c.inkTertiary} />}
              {mode === 'phone' && <Text style={[type.bodyLg, { color: c.inkSecondary }]}>NZ</Text>}
              <TextInput key={mode} value={input} onChangeText={(t) => { setInput(t); setError(undefined); }} placeholder={mode === 'phone' ? '021 123 4567' : 'you@example.co.nz'} placeholderTextColor={c.inkTertiary} autoFocus
                keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'} autoCapitalize="none" autoComplete={mode === 'phone' ? 'tel' : 'email'}
                textContentType={mode === 'phone' ? 'telephoneNumber' : 'emailAddress'} accessibilityLabel={mode === 'phone' ? 'Mobile number' : 'Email address'}
                returnKeyType="send" onSubmitEditing={send} maxLength={mode === 'phone' ? 16 : 120} style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[3] }]} />
            </View>
            {error && <Notice tone="error" title="Couldn't send the code.">{error}</Notice>}
            <Button block disabled={!phone || busy} onPress={send}>{busy ? 'Sending…' : mode === 'phone' ? 'Text me a code' : 'Email me a code'}</Button>
            <Button variant="ghost" onPress={() => switchMode(mode === 'phone' ? 'email' : 'phone')}>{mode === 'phone' ? 'Use email instead' : 'Use mobile number instead'}</Button>
            <Text style={[type.caption, { color: c.inkSecondary }]}>Standard SMS rules apply; the text is free to receive in NZ. You can keep using PriceMatch NZ without an account. By signing in you agree to our Terms and Privacy Policy.</Text>
          </FadeInView>
        )}

        {step === 'code' && (
          <FadeInView index={0} style={{ gap: space[4] }}>
            <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Enter your code</Text>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>We {mode === 'phone' ? 'texted' : 'emailed'} a 6-digit code to {mode === 'phone' && phone ? formatNzMobile(phone) : input.trim()}. It works for 10 minutes.{mode === 'email' ? ' Check your spam folder if it isn’t there.' : ' It can take up to a minute to arrive.'}</Text>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(undefined); }} onComplete={(v) => verify(v)} error={error} />
            <Button block disabled={code.length < 6 || busy} onPress={() => verify()}>{busy ? 'Checking…' : 'Sign in'}</Button>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button variant="ghost" onPress={() => { setStep('phone'); setCode(''); setError(undefined); }}>{mode === 'phone' ? 'Change number' : 'Change email'}</Button>
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
  if (/unsupported phone provider|phone.*(disabled|not enabled)|sms.*provider/i.test(m)) return 'Text-message sign-in isn’t switched on yet. Use your email instead for now.';
  if (/signups not allowed|email.*(disabled|not enabled)/i.test(m)) return 'Sign-in by email isn’t switched on yet. Please try again later.';
  if (/invalid.*phone|phone.*invalid/i.test(m)) return 'That number can’t receive texts. Check it’s an NZ mobile.';
  if (/network|fetch/i.test(m)) return 'No internet connection. Check your connection and try again.';
  return 'Something went wrong sending the code. Please try again.';
}
