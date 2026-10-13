import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ChevronRight, CircleHelp, FileText, LogOut, MapPin, ShieldCheck, Trash2, UserRound, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Button, Notice, SettingToggle, useTheme } from '@/design/components';
import { useAuth } from '@/state/auth';
import { radius, size, space, type } from '@/design/theme';
import { LEGAL } from '@/config';
import { useApp } from '@/state/app-state';
import { Card, ConfirmSheet, Screen, TAB_BAR_SPACE } from '@/ui/kit';

const QUIET = [{ label: '9 pm – 8 am', from: 21, to: 8 }, { label: '10 pm – 7 am', from: 22, to: 7 }, { label: 'Off', from: 0, to: 0 }];

export default function Profile() {
  const c = useTheme();
  const { location, alerts, update, keepScanHistory, scans, clearScans, catalogStatus, enableAlerts, pushReady } = useApp();
  const [pushMsg, setPushMsg] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const auth = useAuth();
  const bioLabel = auth.biometric.kind === 'face' ? 'Face ID' : 'fingerprint';
  const setAlerts = (patch: Partial<typeof alerts>) => update({ alerts: { ...alerts, ...patch } });

  return (
    <Screen bottomSpace={TAB_BAR_SPACE}>
      <Text accessibilityRole="header" style={[type.h1, { color: c.ink, padding: space[4] }]}>Profile</Text>

      <Card style={{ marginHorizontal: space[4], padding: space[4], flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <UserRound size={26} color={c.brandText} />
        </View>
        <View style={{ flex: 1, gap: space[2] }}>
          {auth.email ? (
            <>
              <Text style={[type.h3, { color: c.ink }]} numberOfLines={1}>{auth.email}</Text>
              <Text style={[type.body, { color: c.inkSecondary }]}>Favourites and scans are saved to your account.</Text>
            </>
          ) : (
            <>
              <Text style={[type.h3, { color: c.ink }]}>Using PriceMatch NZ as a guest</Text>
              <Text style={[type.body, { color: c.inkSecondary }]}>Sign in with a code to keep favourites and scans on all your devices.</Text>
              <View style={{ alignSelf: 'flex-start' }}><Button onPress={() => router.push('/sign-in')}>Sign in</Button></View>
            </>
          )}
        </View>
      </Card>

      <Group title="Shopping">
        <LinkRow icon={MapPin} label="Your area" value={location?.label ?? 'Not set'} onPress={() => router.push('/location')} />
        <LinkRow icon={ShieldCheck} label="Stores that price match" onPress={() => router.push('/stores')} />
        <LinkRow icon={CircleHelp} label="How scanning works" onPress={() => { update({ scanGuideSeen: false }); router.push('/scan'); }} last />
      </Group>

      <Group title="Alerts">
        <View style={{ padding: space[4], gap: space[2] }}>
          {!auth.email ? (
            <>
              <Text style={[type.body, { color: c.inkSecondary }]}>Sign in to get alerts when a saved product drops in price. Alerts belong to your account.</Text>
              <View style={{ alignSelf: 'flex-start' }}><Button variant="secondary" onPress={() => router.push('/sign-in')}>Sign in</Button></View>
            </>
          ) : (
            <SettingToggle title="Notifications" description="Show alerts on your lock screen. Turn off to see them only in the app." value={alerts.enabled}
              onValueChange={async (v) => {
                if (!v) { setAlerts({ enabled: false }); setPushMsg(null); return; }
                const r = await enableAlerts();
                setPushMsg(r === 'ok' ? null : r === 'denied' ? 'Notifications are blocked for PriceMatch NZ. Allow them in your phone settings, then try again.'
                  : r === 'no-device' ? 'Notifications need a real phone.' : r === 'signed-out' ? 'Sign in first.' : "Couldn't set up notifications on this phone. Alerts still appear in the app.");
              }} />
          )}
          <SettingToggle title="Price drops" description="When a verified price for a favourite gets cheaper." value={alerts.drops} onValueChange={(v) => setAlerts({ drops: v })} />
          <SettingToggle title="Petrol updates" description="When the national average pump price moves 5c or more (MBIE weekly data)." value={alerts.petrol} onValueChange={(v) => setAlerts({ petrol: v })} />
          <Text style={[type.bodyStrong, { color: c.ink, marginTop: space[2] }]}>Quiet hours</Text>
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            {QUIET.map((q) => {
              const on = alerts.quietFrom === q.from && alerts.quietTo === q.to;
              return (
                <Pressable key={q.label} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setAlerts({ quietFrom: q.from, quietTo: q.to })}
                  style={{ minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.full, justifyContent: 'center', backgroundColor: on ? c.brandSubtle : c.surfaceMuted, borderWidth: on ? 1.5 : 0, borderColor: c.brand }}>
                  <Text style={[type.bodyStrong, { color: on ? c.brandText : c.inkSecondary }]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: space[2] }}>
            {pushMsg ? <Notice tone="warning" title="Notifications not on.">{pushMsg}</Notice>
              : alerts.enabled && auth.email ? <Notice tone="info" title={pushReady ? 'Notifications are on.' : 'Setting up notifications…'}>Alerts also stay in the Alerts screen. Quiet hours use New Zealand time.</Notice> : null}
          </View>
        </View>
      </Group>

      <Group title="Privacy">
        <View style={{ paddingHorizontal: space[4], paddingTop: space[2] }}>
          <SettingToggle title="Save scan history" description="Kept on this phone. Turn off to stop saving scans." value={keepScanHistory} onValueChange={(v) => update({ keepScanHistory: v })} />
        </View>
        <LinkRow icon={Trash2} label="Clear scan history" value={scans.length ? `${scans.length}` : 'Empty'} danger onPress={() => scans.length && setConfirm(true)} />
        {auth.email && auth.biometric.kind && (
          <View style={{ paddingHorizontal: space[4] }}>
            <SettingToggle title={`Unlock with ${bioLabel}`} description="Your fingerprint or face never leaves this phone." value={auth.biometric.enabled}
              onValueChange={async (v) => { if (v) { if (auth.session) await auth.biometric.enable(auth.session.refresh_token); } else await auth.biometric.disable(); }} />
          </View>
        )}
        <LinkRow icon={FileText} label="Privacy Policy" onPress={() => LEGAL.privacy && Linking.openURL(LEGAL.privacy)} value={LEGAL.privacy ? undefined : 'Before launch'} />
        <LinkRow icon={FileText} label="Terms of Use" onPress={() => LEGAL.terms && Linking.openURL(LEGAL.terms)} value={LEGAL.terms ? undefined : 'Before launch'} last={!auth.email} />
        {auth.email && <LinkRow icon={LogOut} label="Sign out" danger onPress={() => auth.signOut()} last />}
      </Group>

      <Text style={[type.caption, { color: c.inkTertiary, textAlign: 'center', marginTop: space[6] }]}>
        PriceMatch NZ {Constants.expoConfig?.version ?? ''} · Free for New Zealanders{'\n'}{catalogStatus === 'live' ? 'Connected to live price data' : catalogStatus === 'offline' ? "Can't reach live price data" : 'Loading live price data'} · Only real, sourced prices are shown
      </Text>

      <ConfirmSheet visible={confirm} danger icon={Trash2} title="Clear your scan history?" body={`This removes all ${scans.length} scans from PriceMatch NZ. It can't be undone.`}
        confirmLabel="Clear all" onCancel={() => setConfirm(false)} onConfirm={() => { clearScans(); setConfirm(false); }} />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ marginTop: space[6] }}>
      <Text style={[type.bodyStrong, { color: c.inkSecondary, marginHorizontal: space[4], marginBottom: space[2] }]}>{title}</Text>
      <Card style={{ marginHorizontal: space[4] }}>{children}</Card>
    </View>
  );
}

function LinkRow({ icon: Icon, label, value, onPress, last, danger }: { icon: LucideIcon; label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingHorizontal: space[4], borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, backgroundColor: pressed ? c.surfaceMuted : 'transparent', borderRadius: last ? radius.lg : 0 })}>
      <Icon size={size.iconSm} color={danger ? c.danger : c.inkSecondary} />
      <Text style={[type.bodyLg, { color: danger ? c.danger : c.ink, flex: 1 }]}>{label}</Text>
      {value && <Text style={[type.body, { color: c.inkSecondary }]} numberOfLines={1}>{value}</Text>}
      <ChevronRight size={18} color={c.inkTertiary} />
    </Pressable>
  );
}
