import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageIcon, ScanBarcode, SearchX } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, FadeInView, Notice, useTheme } from '@/design/components';
import { radius, space, type } from '@/design/theme';
import { bestOffer } from '@/data/compare';
import { findByBarcode, findByBarcodeRemote, getOffers, lookupOpenFoodFacts } from '@/data/repo';
import { searchRetail, type RetailProduct } from '@/data/retail';
import type { Product } from '@/data/types';
import { useApp } from '@/state/app-state';
import { EmptyState, Screen, TopBar } from '@/ui/kit';
import { RetailCard } from '@/ui/retail';

const sameCode = (a?: string | null, b?: string | null) => !!a && !!b && a.replace(/^0+/, '') === b.replace(/^0+/, '');

/**
 * Barcode lookup (scanned or typed). Identifies the product (our NZ database, then Open Food Facts),
 * records it in Scan History (one entry per barcode), and shows store prices only for this exact
 * barcode. Products with our own verified prices open their product page.
 */
export default function BarcodeResult() {
  const { code, from } = useLocalSearchParams<{ code: string; from?: string }>();
  const c = useTheme();
  const { addScan, location } = useApp();
  const [state, setState] = React.useState<'loading' | 'found' | 'missing'>('loading');
  const [product, setProduct] = React.useState<Product | null>(null);
  const [retail, setRetail] = React.useState<{ state: 'loading' | 'ready' | 'error'; item?: RetailProduct }>({ state: 'loading' });

  React.useEffect(() => {
    let alive = true;
    const priced = findByBarcode(code);
    if (priced && getOffers(priced.id, location).length) {
      const best = bestOffer(getOffers(priced.id, location));
      addScan({ barcode: code, productId: priced.id, name: `${priced.name}${priced.size ? ` ${priced.size}` : ''}`, imageUrl: priced.imageUrl, bestPrice: best?.price, bestStore: best?.store.name });
      router.replace({ pathname: '/product/[id]', params: { id: priced.id } });
      return;
    }
    (async () => {
      const p = (await findByBarcodeRemote(code)) ?? (await lookupOpenFoodFacts(code));
      if (!alive) return;
      setProduct(p);
      setState(p ? 'found' : 'missing');
      const name = p ? `${p.name}${p.size ? ` ${p.size}` : ''}` : `Barcode ${code}`;
      // Store prices for exactly this barcode (never a similar product).
      let item: RetailProduct | undefined;
      if (p) {
        try {
          const r = await searchRetail([p.brand, p.name].filter(Boolean).join(' ').slice(0, 60), location);
          item = r.products.find((x) => sameCode(x.gtin, code));
          if (alive) setRetail({ state: 'ready', item });
        } catch { if (alive) setRetail({ state: 'error' }); }
      } else if (alive) setRetail({ state: 'ready' });
      const cheapest = item?.offers[0];
      addScan({ barcode: code, productId: p?.id, name, imageUrl: p?.imageUrl ?? item?.image ?? undefined,
        bestPrice: cheapest ? cheapest.priceCents / 100 : undefined, bestStore: cheapest?.store });
    })();
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
        <EmptyState icon={SearchX} title="We don't know this barcode yet" body={`We couldn't identify ${code}, so we can't show a price. Try searching by the product's name.`}
          action="Search by name" onAction={() => router.replace('/search')} />
      )}
      {state === 'found' && product && (
        <FadeInView index={0} style={{ paddingHorizontal: space[4], gap: space[4] }}>
          <View style={{ height: 200, borderRadius: radius.lg, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} accessibilityLabel={product.name} /> : <ImageIcon size={40} color={c.inkTertiary} />}
          </View>
          <View style={{ gap: space[1] }}>
            {product.brand && <Text style={[type.bodyStrong, { color: c.inkSecondary }]}>{product.brand}</Text>}
            <Text style={[type.h1, { color: c.ink }]}>{product.name}</Text>
            <Text style={[type.body, { color: c.inkSecondary }]}>{[product.size, code].filter(Boolean).join(' · ')}</Text>
          </View>

          {retail.state === 'loading' && <ActivityIndicator color={c.brand} />}
          {retail.state === 'ready' && retail.item && (
            <View style={{ gap: space[2] }}>
              <Text style={[type.h2, { color: c.ink }]}>Prices for this barcode</Text>
              <RetailCard p={{ ...retail.item, image: retail.item.image ?? product.imageUrl ?? null }} />
              <Text style={[type.caption, { color: c.inkTertiary }]}>Latest prices seen by Baskt (baskt.nz). Not live checkout prices; check with the store.</Text>
            </View>
          )}
          {retail.state === 'ready' && !retail.item && (
            <Notice tone="info" title="Price unavailable.">None of the stores we're connected to has a price for this exact barcode, so we don't show one.</Notice>
          )}
          {retail.state === 'error' && (
            <Notice tone="warning" title="Price unavailable.">We couldn't reach store prices right now. Check your connection and try again.</Notice>
          )}

          <Button block variant="secondary" onPress={() => router.push({ pathname: '/report', params: { name: `${product.name}${product.size ? ` ${product.size}` : ''}`, barcode: code } })}>Share a price you've seen</Button>
          {from === 'scan' && <Button block variant="secondary" icon={ScanBarcode} onPress={() => router.replace('/scan')}>Scan another</Button>}
          <Text style={[type.caption, { color: c.inkTertiary }]}>Product details and photo from Open Food Facts (CC BY-SA). Saved to your Scan History.</Text>
        </FadeInView>
      )}
    </Screen>
  );
}
