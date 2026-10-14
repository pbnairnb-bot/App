import { router } from 'expo-router';
import { BellPlus, Fuel as FuelIcon, MapPin, Navigation, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Button, CategoryChip, FadeInView, LocationPill, Notice, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { formatKm } from '@/data/compare';
import { addFuelRule, FUEL_LABEL, isLive, listFuelRules, loadFuel, MBIE_FUEL, nearbyStations, priceCount, removeFuelRule, stationCount, stationTitle, type NearbyStation } from '@/data/fuel';
import { latestFuel } from '@/data/repo';
import type { FuelAlertRule, FuelType } from '@/data/types';
import { useApp } from '@/state/app-state';
import { useAuth } from '@/state/auth';
import { timeAgo } from '@/ui/format';
import { Card, SectionHeader, Screen, TopBar } from '@/ui/kit';

const FUELS: FuelType[] = ['91', '95', '98', 'diesel'];
const dollars = (cents: number) => `$${(cents / 100).toFixed(3)}`;

export default function FuelScreen() {
  const c = useTheme();
  const { location, preferredFuel, update, catalogVersion } = useApp();
  const auth = useAuth();
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [tick, setTick] = React.useState(0);
  const fuel = preferredFuel ?? '91';

  const load = React.useCallback(async (force = false) => {
    try { if (force || !stationCount()) setStatus('loading'); await loadFuel(force); setStatus('ready'); setTick((t) => t + 1); }
    catch { setStatus('error'); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const list = React.useMemo(() => (location && status === 'ready' ? nearbyStations(location, fuel) : []), [location, fuel, status, tick]);
  const priced = list.filter((s) => s.price);
  const cheapest = priced[0];
  const national = React.useMemo(() => latestFuel().find((f) => f.fuel === MBIE_FUEL[fuel]), [fuel, catalogVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen onRefresh={() => load(true)}>
      <TopBar />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingTop: space[3] }}>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink, flex: 1 }]}>Fuel & Travel</Text>
        <LocationPill label={location ? location.label.split(',')[0] : 'Set your area'} onPress={() => router.push('/location')} />
      </View>

      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], marginTop: space[3] }}>
        {FUELS.map((f) => <CategoryChip key={f} label={FUEL_LABEL[f]} selected={f === fuel} onToggle={() => update({ preferredFuel: f })} />)}
      </View>

      {/* National average: MBIE, weekly */}
      <Card style={{ marginHorizontal: space[4], marginTop: space[4], padding: space[4], gap: space[1] }}>
        <Text style={[type.caption, { color: c.inkSecondary, fontFamily: 'Inter_600SemiBold' }]}>NZ AVERAGE · {FUEL_LABEL[fuel]}</Text>
        {national ? (
          <>
            <Text style={[type.priceMd, { color: c.ink, fontSize: 28 }]}>{dollars(national.now.centsPerLitre)}/L</Text>
            <Text style={[type.caption, { color: c.inkSecondary }]}>
              Week of {new Date(national.now.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              {national.before ? ` · ${national.now.centsPerLitre <= national.before.centsPerLitre ? 'down' : 'up'} ${Math.abs(national.now.centsPerLitre - national.before.centsPerLitre).toFixed(1)}c on the week before` : ''}
              {'\n'}Source: MBIE weekly fuel price monitoring. Not a price at any one station.
            </Text>
          </>
        ) : (
          <Text style={[type.body, { color: c.inkSecondary }]}>Price unavailable. MBIE doesn't publish a national average for {FUEL_LABEL[fuel]}{fuel === '98' ? '' : ' right now'}.</Text>
        )}
      </Card>

      {!location ? (
        <View style={{ margin: space[4] }}>
          <Notice tone="info" title="Choose your area to see stations." action={{ label: 'Set your area', onPress: () => router.push('/location') }}>
            Use your phone's location or pick a suburb. We only use it to sort stations by distance.
          </Notice>
        </View>
      ) : status === 'loading' ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: space[8] }} />
      ) : status === 'error' ? (
        <View style={{ margin: space[4] }}>
          <Notice tone="warning" title="Can't load fuel stations." action={{ label: 'Try again', onPress: () => load(true) }}>
            We couldn't reach the PriceMatch server. Check your internet connection.
          </Notice>
        </View>
      ) : (
        <>
          {cheapest ? (
            <FadeInView index={0} style={{ marginTop: space[6] }}>
              <SectionHeader title={`Cheapest verified ${FUEL_LABEL[fuel]} nearby`} />
              <StationRow s={cheapest} fuel={fuel} highlight />
            </FadeInView>
          ) : (
            <View style={{ marginHorizontal: space[4], marginTop: space[4] }}>
              <Notice tone="info" title="Station prices unavailable.">
                {priceCount() === 0
                  ? "We haven't connected a licensed station-price feed yet, so we don't show pump prices for individual stations. We never estimate them."
                  : `No station near you has a verified ${FUEL_LABEL[fuel]} price from the last 2 days.`}
              </Notice>
            </View>
          )}

          <FadeInView index={1} style={{ marginTop: space[6] }}>
            <SectionHeader title={`${list.length} station${list.length === 1 ? '' : 's'} within 15 km`} />
            {list.length === 0 ? (
              <Text style={[type.body, { color: c.inkSecondary, marginHorizontal: space[4] }]}>
                {stationCount() ? `No stations within 15 km of ${location.label}.` : 'Station list unavailable right now. Pull down to try again.'}
              </Text>
            ) : (
              <Card style={{ marginHorizontal: space[4] }}>
                {list.map((s, i) => <StationRow key={s.station.id} s={s} fuel={fuel} first={i === 0} inCard />)}
              </Card>
            )}
            <Text style={[type.caption, { color: c.inkTertiary, marginHorizontal: space[4], marginTop: space[2] }]}>
              Station locations © OpenStreetMap contributors (ODbL). Stations not mapped as selling {FUEL_LABEL[fuel]} are hidden; stations with unknown fuels are shown.
            </Text>
          </FadeInView>

          <FuelAlerts fuel={fuel} signedIn={!!auth.userId} at={location} />
        </>
      )}
    </Screen>
  );
}

function StationRow({ s, fuel, first, highlight, inCard }: { s: NearbyStation; fuel: FuelType; first?: boolean; highlight?: boolean; inCard?: boolean }) {
  const c = useTheme();
  const title = stationTitle(s.station);
  const open = () => {
    const q = `${s.station.lat},${s.station.lng}`;
    Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${encodeURIComponent(title)}@${q}` : `geo:${q}?q=${q}(${encodeURIComponent(title)})`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  };
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderTopWidth: inCard && !first ? 1 : 0, borderTopColor: c.border }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: highlight ? c.dealSubtle : c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        <FuelIcon size={20} color={highlight ? c.dealText : c.inkSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={2}>
          {[formatKm(s.km), s.station.address].filter(Boolean).join(' · ')}
        </Text>
        {s.price ? (
          <Text style={[type.caption, { color: isLive(s.price) ? c.dealText : c.inkSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            {isLive(s.price) ? 'Live · ' : ''}Updated {timeAgo(s.price.observedAt).toLowerCase()} · {s.price.sourceName}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {s.price
          ? <Text style={[type.priceMd, { color: highlight ? c.dealText : c.ink }]}>{dollars(s.price.centsPerLitre)}</Text>
          : <Text style={[type.caption, { color: c.inkTertiary, textAlign: 'right' }]}>Price{'\n'}unavailable</Text>}
        <Pressable accessibilityRole="link" accessibilityLabel={`Directions to ${title}`} onPress={open} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Navigation size={14} color={c.brandText} />
          <Text style={[type.caption, { color: c.brandText, fontFamily: 'Inter_600SemiBold' }]}>Directions</Text>
        </Pressable>
      </View>
    </View>
  );
  return inCard ? body : <Card style={{ marginHorizontal: space[4], borderWidth: highlight ? 2 : 0, borderColor: c.deal }}>{body}</Card>;
}

function FuelAlerts({ fuel, signedIn, at }: { fuel: FuelType; signedIn: boolean; at: { lat: number; lng: number; label: string } }) {
  const c = useTheme();
  const [rules, setRules] = React.useState<FuelAlertRule[] | null>(null);
  const [max, setMax] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const refresh = React.useCallback(() => { if (signedIn) listFuelRules().then(setRules).catch(() => setRules([])); }, [signedIn]);
  React.useEffect(refresh, [refresh]);
  const cents = Math.round(parseFloat(max.replace(/[^\d.]/g, '')) * 1000) / 10;
  const valid = cents >= 100 && cents <= 600;

  return (
    <View style={{ marginTop: space[6] }}>
      <SectionHeader title="Fuel price alerts" />
      <Card style={{ marginHorizontal: space[4], padding: space[4], gap: space[3] }}>
        {!signedIn ? (
          <>
            <Text style={[type.body, { color: c.inkSecondary }]}>Sign in with your mobile number to get an alert when {FUEL_LABEL[fuel]} near you drops below a price you choose.</Text>
            <View style={{ alignSelf: 'flex-start' }}><Button variant="secondary" onPress={() => router.push('/sign-in')}>Sign in</Button></View>
          </>
        ) : (
          <>
            <Text style={[type.body, { color: c.inkSecondary }]}>Alert me when {FUEL_LABEL[fuel]} is at or below this price within 10 km of {at.label.split(',')[0]}:</Text>
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: size.tapTarget, paddingHorizontal: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong }}>
                <Text style={[type.bodyLg, { color: c.inkSecondary }]}>$</Text>
                <TextInput value={max} onChangeText={(t) => { setMax(t); setErr(null); }} placeholder="2.89" placeholderTextColor={c.inkTertiary} keyboardType="decimal-pad"
                  accessibilityLabel="Alert price in dollars per litre" style={[type.bodyLg, { flex: 1, color: c.ink, paddingVertical: space[2] }]} />
                <Text style={[type.body, { color: c.inkSecondary }]}>/L</Text>
              </View>
              <Button icon={BellPlus} disabled={!valid || busy} onPress={async () => {
                setBusy(true); setErr(null);
                try { await addFuelRule({ fuel, maxCents: cents, lat: at.lat, lng: at.lng, radiusKm: 10, label: at.label }); setMax(''); refresh(); }
                catch { setErr("Couldn't save the alert. Check your connection and try again."); }
                finally { setBusy(false); }
              }}>Add</Button>
            </View>
            {err && <Text style={[type.caption, { color: c.danger }]}>{err}</Text>}
            {rules?.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <MapPin size={16} color={c.inkSecondary} />
                <Text style={[type.body, { color: c.ink, flex: 1 }]}>{FUEL_LABEL[r.fuel]} under {dollars(r.maxCents)} · {r.radiusKm} km of {r.label?.split(',')[0] ?? 'your area'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete alert" hitSlop={8} onPress={() => removeFuelRule(r.id).then(refresh).catch(() => {})}>
                  <Trash2 size={18} color={c.danger} />
                </Pressable>
              </View>
            ))}
            {priceCount() === 0 && (
              <Text style={[type.caption, { color: c.inkSecondary }]}>These alerts start working once a licensed station-price feed is connected. Weekly national-average alerts can be turned on in Profile.</Text>
            )}
          </>
        )}
      </Card>
    </View>
  );
}
