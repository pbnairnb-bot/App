import React from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'pm.session';          // the backend session (e.g. Supabase refresh token), stored only when biometrics are on
const OPTED_KEY = 'pm.biometric.optin';     // 'on' | 'later:<ISO date>'

export type BiometricKind = 'fingerprint' | 'face' | null;

/**
 * One-time biometric setup after the first code sign-in, then biometric unlock on later launches.
 * The fingerprint or face never leaves the phone: the OS checks it, and only then releases the
 * session saved in secure storage (Keychain / Keystore).
 */
export function useBiometricLogin() {
  const [kind, setKind] = React.useState<BiometricKind>(null);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
      if (enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setKind(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'face' : 'fingerprint');
      }
      setEnabled((await SecureStore.getItemAsync(OPTED_KEY)) === 'on');
    })().catch(() => {});
  }, []);

  /** Show the opt-in only if supported, not already on, and not declined in the last 30 days. */
  const shouldOffer = React.useCallback(async () => {
    if (!kind || enabled) return false;
    const v = await SecureStore.getItemAsync(OPTED_KEY);
    if (v?.startsWith('later:')) return Date.now() - Date.parse(v.slice(6)) > 30 * 864e5;
    return true;
  }, [kind, enabled]);

  /** Turn on after the first successful code sign-in. Confirms with the OS first. */
  const enable = React.useCallback(async (session: string) => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on quick sign-in', cancelLabel: 'Not now', disableDeviceFallback: false });
    if (!r.success) return false;
    await SecureStore.setItemAsync(SESSION_KEY, session, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    await SecureStore.setItemAsync(OPTED_KEY, 'on');
    setEnabled(true);
    return true;
  }, []);

  const later = React.useCallback(() => SecureStore.setItemAsync(OPTED_KEY, `later:${new Date().toISOString()}`), []);

  /** On launch: ask for fingerprint / Face ID and return the saved session, or null to fall back to a code. */
  const unlock = React.useCallback(async (): Promise<string | null> => {
    if (!enabled) return null;
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PriceMatch NZ', cancelLabel: 'Use a code instead' });
    return r.success ? SecureStore.getItemAsync(SESSION_KEY) : null;
  }, [enabled]);

  /** Sign out or turn off in Profile: deletes the stored session. */
  const disable = React.useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(OPTED_KEY);
    setEnabled(false);
  }, []);

  /** Replace the stored session after the backend refreshes it (only while biometrics are on). */
  const store = React.useCallback(async (session: string) => {
    if (enabled) await SecureStore.setItemAsync(SESSION_KEY, session, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }, [enabled]);

  return { kind, enabled, shouldOffer, enable, later, unlock, disable, store };
}
