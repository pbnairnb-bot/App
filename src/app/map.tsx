import { router } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { CategoryChip, Notice, useShopperLocation, useTheme } from '@/design/components';
import { space, type } from '@/design/theme';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/state/app-state';
import { IconButton, Screen, TopBar } from '@/ui/kit';

type Kind = 'supermarket' | 'chemist' | 'pet' | 'fuel' | 'department' | 'hardware' | 'electronics';
const FILTERS: { id: Kind; label: string; color: string }[] = [
  { id: 'supermarket', label: 'Supermarkets', color: '#16a34a' },
  { id: 'chemist', label: 'Chemists', color: '#db2777' },
  { id: 'pet', label: 'Pet stores', color: '#ea580c' },
  { id: 'fuel', label: 'Fuel', color: '#ca8a04' },
  { id: 'department', label: 'Department', color: '#7c3aed' },
  { id: 'hardware', label: 'Hardware', color: '#0f766e' },
  { id: 'electronics', label: 'Electronics', color: '#2563eb' },
];
interface Pin { id: string; name: string; kind: Kind; lat: number; lng: number; address: string | null; connected: boolean }

/** Map of real NZ stores and fuel stations near the shopper (OpenStreetMap data and map tiles). */
export default function StoreMap() {
  const c = useTheme();
  const { location, update } = useApp();
  const shopper = useShopperLocation(location);
  const [pins, setPins] = React.useState<Pin[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [on, setOn] = React.useState<Kind[]>(['supermarket', 'chemist', 'pet', 'fuel']);
  const web = React.useRef<WebView>(null);
  const center = location ?? { lat: -36.8485, lng: 174.7633, label: 'Auckland CBD' };

  React.useEffect(() => { if (shopper.location && shopper.location !== location) update({ location: shopper.location }); }, [shopper.location]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let alive = true;
    const d = 0.14; // about 15 km
    const box = (q: any) => q.gte('lat', center.lat - d).lte('lat', center.lat + d).gte('lng', center.lng - d * 1.3).lte('lng', center.lng + d * 1.3);
    Promise.all([
      box(supabase.from('store_locations').select('id,name,brand,kind,lat,lng,address,retailer_id')).limit(1500),
      box(supabase.from('fuel_stations').select('id,name,brand,lat,lng,street,suburb,city')).limit(500),
      supabase.from('retailers').select('id,integration'),
    ]).then(([s, f, r]: any[]) => {
      if (!alive) return;
      if (s.error || f.error) { setFailed(true); return; }
      const connected = new Set((r.data ?? []).filter((x: any) => x.integration === 'connected').map((x: any) => x.id));
      setPins([
        ...(s.data ?? []).filter((x: any) => x.kind !== 'other').map((x: any) => ({ id: x.id, name: x.brand && !x.name.includes(x.brand) ? `${x.brand} ${x.name}` : x.name, kind: x.kind, lat: x.lat, lng: x.lng, address: x.address, connected: connected.has(x.retailer_id) })),
        ...(f.data ?? []).map((x: any) => ({ id: x.id, name: [x.brand, x.name].filter(Boolean).join(' ') || 'Fuel station', kind: 'fuel' as Kind, lat: x.lat, lng: x.lng, address: [x.street, x.suburb, x.city].filter(Boolean).join(', ') || null, connected: false })),
      ]);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = (pins ?? []).filter((p) => on.includes(p.kind));
  React.useEffect(() => { web.current?.injectJavaScript(`window.setPins && window.setPins(${JSON.stringify(shown)}); true;`); }, [shown.length, on.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'directions') {
        const q = `${m.lat},${m.lng}`;
        Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${encodeURIComponent(m.name)}@${q}` : `geo:${q}?q=${q}(${encodeURIComponent(m.name)})`)
          .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
      }
    } catch { /* ignore */ }
  };

  return (
    <Screen scroll={false}>
      <TopBar title="Stores near you" right={<IconButton icon={LocateFixed} label="Use my location" onPress={shopper.requestDevice} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4], paddingBottom: space[2] }} style={{ flexGrow: 0 }}>
        {FILTERS.map((f) => (
          <CategoryChip key={f.id} label={`${f.label}${pins ? ` ${pins.filter((p) => p.kind === f.id).length}` : ''}`} selected={on.includes(f.id)}
            onToggle={() => setOn((o) => (o.includes(f.id) ? o.filter((x) => x !== f.id) : [...o, f.id]))} />
        ))}
      </ScrollView>
      {failed && <View style={{ padding: space[4] }}><Notice tone="warning" title="Can't load stores.">Check your internet connection and try again.</Notice></View>}
      {!location && <Text style={[type.caption, { color: c.inkSecondary, paddingHorizontal: space[4], paddingBottom: space[2] }]}>Showing Auckland CBD. Tap the location button or set your area to see stores near you.</Text>}
      <View style={{ flex: 1 }}>
        {!pins && !failed && <ActivityIndicator color={c.brand} style={{ position: 'absolute', top: space[8], alignSelf: 'center', zIndex: 2 }} />}
        <WebView ref={web} originWhitelist={['*']} onMessage={onMessage} javaScriptEnabled
          source={{ html: mapHtml(center.lat, center.lng), baseUrl: 'https://pricematch.nz/' }}
          onLoadEnd={() => web.current?.injectJavaScript(`window.setPins && window.setPins(${JSON.stringify(shown)}); true;`)}
          style={{ flex: 1 }} />
      </View>
      <Text style={[type.caption, { color: c.inkTertiary, padding: space[2], textAlign: 'center' }]} onPress={() => router.push('/stores')}>
        Store locations and map © OpenStreetMap contributors · Green dot = prices connected
      </Text>
    </Screen>
  );
}

function mapHtml(lat: number, lng: number) {
  const colors = JSON.stringify(Object.fromEntries(FILTERS.map((f) => [f.id, f.color])));
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{height:100%;margin:0;font-family:-apple-system,Roboto,sans-serif}.p b{font-size:14px}.p small{color:#555}.p a{display:inline-block;margin-top:6px;color:#5b3fd9;font-weight:600;text-decoration:none}</style>
</head><body><div id="m"></div><script>
var C=${colors};var map=L.map('m',{zoomControl:false}).setView([${lat},${lng}],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.circleMarker([${lat},${lng}],{radius:7,color:'#fff',weight:3,fillColor:'#5b3fd9',fillOpacity:1}).addTo(map).bindPopup('You');
var layer=L.layerGroup().addTo(map);
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
window.setPins=function(pins){layer.clearLayers();pins.forEach(function(p){
  var m=L.circleMarker([p.lat,p.lng],{radius:p.connected?8:6,color:p.connected?'#16a34a':'#fff',weight:p.connected?3:2,fillColor:C[p.kind]||'#555',fillOpacity:.95});
  m.bindPopup('<div class="p"><b>'+esc(p.name)+'</b><br><small>'+esc(p.address||'')+'</small>'+(p.connected?'<br><small style="color:#16a34a">Prices connected in PriceMatch</small>':'')+'<br><a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'directions\\',lat:'+p.lat+',lng:'+p.lng+',name:'+JSON.stringify(p.name).replace(/"/g,'&quot;')+'}));return false;">Directions</a></div>');
  layer.addLayer(m);});};
</script></body></html>`;
}
