/*
 * Optional sign-in: a 6-digit code by SMS to an NZ mobile (Supabase Phone Auth), then a one-time offer to unlock
 * with fingerprint / Face ID. The fingerprint never leaves the phone; it only releases the
 * session kept in the phone's secure storage.
 */
import type { Session } from '@supabase/supabase-js';
import React from 'react';
import { useBiometricLogin } from '@/design/components';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** The signed-in mobile number (E.164), or an older email account. */
  account?: string;
  userId?: string;
  ready: boolean;
  /** Signed in with fingerprint unlock on, waiting for the fingerprint at launch. */
  locked: boolean;
  biometric: ReturnType<typeof useBiometricLogin>;
  /** Sends a 6-digit code by SMS. `phone` must already be E.164 (+64…). */
  sendCode: (phone: string) => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<Session>;
  unlock: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const Ctx = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [ready, setReady] = React.useState(false);
  const [locked, setLocked] = React.useState(false);
  const [lockChecked, setLockChecked] = React.useState(false);
  const biometric = useBiometricLogin();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // At launch only: if fingerprint unlock is on, ask for it before showing the account.
  React.useEffect(() => {
    if (!ready || lockChecked) return;
    const t = setTimeout(() => {
      setLockChecked(true);
      if (biometric.enabled && session) setLocked(true);
    }, 300);
    return () => clearTimeout(t);
  }, [ready, lockChecked, biometric.enabled, session]);

  // Keep the stored session fresh for the next fingerprint unlock.
  React.useEffect(() => {
    if (biometric.enabled && session?.refresh_token) biometric.store(session.refresh_token).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometric.enabled, session?.refresh_token]);

  const value: AuthState = {
    session, ready, locked, biometric,
    account: session?.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : session?.user.email ?? undefined,
    userId: session?.user.id,
    // `target` is an NZ mobile in E.164 (+64…) for a text code, or an email address for an emailed code.
    sendCode: async (target) => {
      const { error } = target.includes('@')
        ? await supabase.auth.signInWithOtp({ email: target.trim().toLowerCase(), options: { shouldCreateUser: true } })
        : await supabase.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: true, channel: 'sms' } });
      if (error) throw error;
    },
    verifyCode: async (target, code) => {
      const { data, error } = target.includes('@')
        ? await supabase.auth.verifyOtp({ email: target.trim().toLowerCase(), token: code, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: target, token: code, type: 'sms' });
      if (error || !data.session) throw error ?? new Error('That code didn’t work. Check it and try again.');
      return data.session;
    },
    unlock: async () => {
      const token = await biometric.unlock();
      if (!token) return false;
      if (!session) {
        const { error } = await supabase.auth.refreshSession({ refresh_token: token });
        if (error) return false;
      }
      setLocked(false);
      return true;
    },
    signOut: async () => {
      await biometric.disable();
      await supabase.auth.signOut().catch(() => {});
      setLocked(false);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
