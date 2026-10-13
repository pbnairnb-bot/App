import { router } from 'expo-router';
import { ImageIcon, Send, Sparkles, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeInView, PressableScale, useTheme } from '@/design/components';
import { radius, size, space, type } from '@/design/theme';
import { ask, type AssistantReply } from '@/data/assistant';
import { nzd } from '@/data/compare';
import { listings } from '@/data/repo';
import { useApp } from '@/state/app-state';
import { IconButton, Screen } from '@/ui/kit';
import { ListeningSheet, MicButton, useVoice } from '@/ui/voice';

interface Msg { id: string; role: 'user' | 'assistant'; text: string; reply?: AssistantReply }

const SUGGESTIONS = ['Cheapest milk near me', 'Is coffee a good price?', 'Compare milk, eggs and bread', 'Who price matches TVs?', 'Any deals on electronics?'];

export default function Assistant() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { id: 'hi', role: 'assistant', text: "Kia ora! Ask me where something is cheapest, whether a price is good, or paste your shopping list. You can also tap the mic and just say it." },
  ]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const list = React.useRef<FlatList<Msg>>(null);
  const hints = React.useMemo(() => listings().map((l) => l.product.name), []);

  const send = React.useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const history = msgs.map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: q }]);
    setBusy(true);
    const reply = await ask(q, history, location);
    setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', text: reply.text, reply }]);
    setBusy(false);
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  }, [busy, msgs, location]);

  const voice = useVoice((t) => send(t), hints);

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2] }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color={c.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={[type.h2, { color: c.ink }]}>Shopping assistant</Text>
          <Text style={[type.caption, { color: c.inkSecondary }]}>Answers from PriceMatch prices only</Text>
        </View>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space[4], gap: space[3] }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => <FadeInView index={Math.min(index, 2)}><Bubble m={item} /></FadeInView>}
          ListFooterComponent={
            <View style={{ gap: space[3], marginTop: space[2] }}>
              {busy && <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}><ActivityIndicator color={c.brand} /><Text style={[type.body, { color: c.inkSecondary }]}>Checking prices…</Text></View>}
              {msgs.length <= 1 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} accessibilityRole="button" onPress={() => send(s)}
                      style={{ minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, justifyContent: 'center' }}>
                      <Text style={[type.bodyStrong, { color: c.brandText }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          }
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[2], paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: Math.max(insets.bottom, space[3]), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
          <TextInput value={input} onChangeText={setInput} placeholder="Ask about any product…" placeholderTextColor={c.inkTertiary} multiline
            accessibilityLabel="Ask the shopping assistant" onSubmitEditing={() => send(input)} blurOnSubmit returnKeyType="send"
            style={[type.bodyLg, { flex: 1, minHeight: size.tapTarget, maxHeight: 120, paddingHorizontal: space[4], paddingTop: 12, paddingBottom: 12, borderRadius: radius.xl, backgroundColor: c.surfaceMuted, color: c.ink }]} />
          {input.trim() ? (
            <PressableScale accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(input)}
              style={{ width: size.tapTarget, height: size.tapTarget, borderRadius: radius.full, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Send size={20} color={c.onBrand} />
            </PressableScale>
          ) : (
            <MicButton size={size.tapTarget} listening={voice.listening} onPress={voice.listening ? voice.stop : voice.start} />
          )}
        </View>
      </KeyboardAvoidingView>

      <ListeningSheet visible={voice.listening || !!voice.error} partial={voice.partial} error={voice.error}
        onStop={() => { voice.stop(); voice.clearError(); }} onRetry={voice.start} prompt="Try “Is coffee a good price?”" />
    </Screen>
  );
}

function Bubble({ m }: { m: Msg }) {
  const c = useTheme();
  const mine = m.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: space[2] }}>
      <View style={{ maxWidth: '88%', paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg,
        borderBottomRightRadius: mine ? 4 : radius.lg, borderBottomLeftRadius: mine ? radius.lg : 4, backgroundColor: mine ? c.brand : c.surface }}>
        <Text style={[type.bodyLg, { color: mine ? c.onBrand : c.ink }]}>{m.text}</Text>
      </View>
      {m.reply?.products?.map((l) => (
        <PressableScale key={l.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.id } })}
          style={{ width: '88%', flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color={c.inkTertiary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyStrong, { color: c.ink }]} numberOfLines={1}>{l.product.name}{l.product.size ? ` ${l.product.size}` : ''}</Text>
            <Text style={[type.caption, { color: c.inkSecondary }]} numberOfLines={1}>{l.best.store.name}{l.storeCount > 1 ? ` · lowest of ${l.storeCount}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[type.priceMd, { color: c.dealText }]}>{nzd(l.price)}</Text>
          </View>
        </PressableScale>
      ))}
      {m.reply?.basket && m.reply.basket.byStore.length > 0 && (
        <View style={{ width: '88%', padding: space[3], gap: space[2], borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <Text style={[type.bodyStrong, { color: c.ink }]}>Your list by store</Text>
          {m.reply.basket.byStore.slice(0, 4).map((s, i) => (
            <View key={s.store} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.body, { color: c.inkSecondary }]}>{s.store}{s.count < m.reply!.basket!.items.length ? ` (${s.count} of ${m.reply!.basket!.items.length})` : ''}</Text>
              <Text style={[type.bodyStrong, { color: i === 0 && s.count === m.reply!.basket!.items.length ? c.dealText : c.ink }]}>{nzd(s.total)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: space[2] }}>
            <Text style={[type.bodyStrong, { color: c.ink }]}>Cheapest of each</Text>
            <Text style={[type.bodyStrong, { color: c.dealText }]}>{nzd(m.reply.basket.bestSplit)}</Text>
          </View>
        </View>
      )}
      {!!m.reply?.actions?.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], maxWidth: '88%' }}>
          {m.reply.actions.map((a) => (
            <Pressable key={a.label} accessibilityRole="link" onPress={() => router.push(a.href as never)}
              style={{ minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.full, backgroundColor: c.brandSubtle, justifyContent: 'center' }}>
              <Text style={[type.bodyStrong, { color: c.brandText }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
