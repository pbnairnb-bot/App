import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '@/design/components';
import { loadCatalog } from '@/data/repo';
import { AuthProvider, useAuth } from '@/state/auth';
import { LockScreen } from '@/ui/lock-screen';
import { colors } from '@/design/theme';
import { AppStateProvider, useApp } from '@/state/app-state';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = colors[scheme];
  const { ready } = useApp();
  const auth = useAuth();
  const [splashDone, setSplashDone] = React.useState(false);
  const [catalog, setCatalog] = React.useState(false);

  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Live prices from Supabase; after 6 s carry on with the bundled copy so the app always opens.
    const t = setTimeout(() => setCatalog(true), 6000);
    loadCatalog().finally(() => { clearTimeout(t); setCatalog(true); });
    return () => clearTimeout(t);
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.canvas, card: c.surface, text: c.ink, primary: c.brand, border: c.border } };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={splashDone ? 'auto' : 'light'} />
      {catalog && <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas }, animation: 'default' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom' }} />
        <Stack.Screen name="location" options={{ presentation: 'modal' }} />
        <Stack.Screen name="match/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="report" options={{ presentation: 'modal' }} />
      </Stack>}
      {splashDone && auth.locked && <LockScreen />}
      {!splashDone && <AnimatedSplash ready={ready && catalog && auth.ready} onFinish={() => setSplashDone(true)} />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
