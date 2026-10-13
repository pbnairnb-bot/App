import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Button, FadeInView, Notice, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { reportPrice } from '@/data/repo';
import { useAuth } from '@/state/auth';
import { EmptyState, IconButton, Screen } from '@/ui/kit';

/** A shopper tells us a shelf price. It shows to others only after an admin checks it. */
export default function Report() {
  const { name, barcode, productId } = useLocalSearchParams<{ name?: string; barcode?: string; productId?: string }>();
  const c = useTheme();
  const { userId } = useAuth();
  const [product, setProduct] = React.useState(name ?? '');
  const [store, setStore] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const value = Number(price.replace(/[^0-9.]/g, ''));
  const valid = product.trim().length > 1 && store.trim().length > 1 && value > 0 && value < 100000;

  const submit = async () => {
    if (!valid) return;
    setBusy(true); setError(undefined);
    try { await reportPrice({ barcode, productId, productName: product.trim(), storeName: store.trim(), price: Math.round(value * 100) / 100, note: note.trim() || undefined }); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  const field = (label: string, v: string, set: (s: string) => void, extra: object = {}) => (
    <View style={{ gap: space[1] }}>
      <Text style={[type.bodyStrong, { color: c.ink }]}>{label}</Text>
      <TextInput value={v} onChangeText={set} accessibilityLabel={label} placeholderTextColor={c.inkTertiary}
        style={[type.bodyLg, { minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, color: c.ink, backgroundColor: c.surface }]} {...extra} />
    </View>
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4] }}>
        <Text accessibilityRole="header" style={[type.h1, { color: c.ink }]}>Report a price</Text>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      {!userId ? (
        <EmptyState icon={CircleCheck} title="Sign in to share prices" body="So we can keep reports honest, sharing a price needs a free account. It only takes an email and a code." action="Sign in" onAction={() => router.replace('/sign-in')} />
      ) : done ? (
        <EmptyState icon={CircleCheck} title="Thanks for sharing!" body="We'll check this price and add it for everyone, usually within a day." action="Done" onAction={() => router.back()} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[4] }}>
            <Text style={[type.bodyLg, { color: c.inkSecondary }]}>Saw this product on a shelf or online? Tell us the price and we'll add it once it's checked.</Text>
            {field('Product', product, setProduct, { placeholder: 'e.g. Smooth peanut butter 380g' })}
            {field('Store and suburb', store, setStore, { placeholder: 'e.g. Pak’nSave, Albany' })}
            {field('Price (NZD)', price, setPrice, { placeholder: '4.29', keyboardType: 'decimal-pad' })}
            {field('Note (optional)', note, setNote, { placeholder: 'e.g. Special until Sunday' })}
            {error && <Notice tone="error" title="Couldn't send.">{error}</Notice>}
            <Button block disabled={!valid || busy} onPress={submit}>{busy ? 'Sending…' : 'Send price'}</Button>
          </FadeInView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
