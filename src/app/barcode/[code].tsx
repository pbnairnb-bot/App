import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageIcon, ScanBarcode, SearchX } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, FadeInView, Notice, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { lookupOpenFoodFacts } from '@/data/repo';
import type { Product } from '@/data/types';
import { useApp } from '@/state/app-state';
import { EmptyState, Screen, TopBar } from '@/ui/kit';

/** A real barcode we have no prices for yet: show what it is (Open Food Facts) and what to do next. */
export default function BarcodeResult() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const c = useTheme();
  const { addScan } = useApp();
  const [state, setState] = React.useState<'loading' | 'found' | 'missing'>('loading');
  const [product, setProduct] = React.useState<Product | null>(null);

  React.useEffect(() => {
    let alive = true;
    lookupOpenFoodFacts(code).then((p) => {
      if (!alive) return;
      setProduct(p);
      setState(p ? 'found' : 'missing');
      addScan({ barcode: code, name: p ? `${p.name}${p.size ? ` ${p.size}` : ''}` : `Barcode ${code}` });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Screen>
      <TopBar title={state === 'found' ? 'Product found' : undefined} />
      {state === 'loading' && (
        <View style={{ alignItems: 'center', padding: space[12], gap: space[3] }}>
          <ActivityIndicator color={c.brand} size="large" />
          <Text style={[type.bodyLg, { color: c.inkSecondary }]}>Looking up {code}…</Text>
        </View>
      )}
      {state === 'missing' && (
        <EmptyState icon={SearchX} title="We don't know this barcode yet" body={`We couldn't find ${code}. Try searching by the product's name, or scan again.`}
          action="Search by name" onAction={() => router.replace('/search')} />
      )}
      {state === 'found' && product && (
        <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[4] }}>
          <View style={{ height: 220, borderRadius: radius.lg, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} /> : <ImageIcon size={40} color={c.inkTertiary} />}
          </View>
          <View style={{ gap: space[1] }}>
            {product.brand && <Text style={[type.bodyStrong, { color: c.inkSecondary }]}>{product.brand}</Text>}
            <Text style={[type.h1, { color: c.ink }]}>{product.name}</Text>
            <Text style={[type.body, { color: c.inkSecondary }]}>{[product.size, code].filter(Boolean).join(' · ')}</Text>
          </View>
          <Notice tone="info" title="No prices for this product yet.">Store prices appear here as stores and shoppers share them.</Notice>
          <Button block onPress={() => router.push({ pathname: '/report', params: { name: `${product.name}${product.size ? ` ${product.size}` : ''}`, barcode: code } })}>Share a price you've seen</Button>
          <Button block variant="secondary" onPress={() => router.replace({ pathname: '/search', params: { q: product.name.split(' ').slice(0, 2).join(' ') } })}>Find similar products</Button>
          <Button block variant="secondary" icon={ScanBarcode} onPress={() => router.replace('/scan')}>Scan another</Button>
          <Text style={[type.caption, { color: c.inkTertiary }]}>Product details and photo from Open Food Facts (CC BY-SA).</Text>
        </FadeInView>
      )}
    </Screen>
  );
}
