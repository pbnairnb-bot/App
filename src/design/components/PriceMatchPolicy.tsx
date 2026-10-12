import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ChevronDown, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { radius, size, space, type } from '../theme';
import { policiesFor, policyLabel, policySentence, PRICE_MATCH_POLICIES, type PriceMatchPolicy } from './pricematch';
import { useTheme } from './useTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** Small chip beside a store: "Beats by 15%" or "Price match". */
export function PriceMatchBadge({ policy }: { policy: PriceMatchPolicy }) {
  const c = useTheme();
  const beat = policy.kind !== 'match';
  const fg = beat ? c.brandText : c.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], paddingVertical: 3, paddingHorizontal: space[2], borderRadius: radius.full, backgroundColor: beat ? c.brandSubtle : c.surfaceMuted, alignSelf: 'flex-start' }}>
      <ShieldCheck size={16} color={fg} />
      <Text style={[type.caption, { fontFamily: 'Inter_600SemiBold', color: fg }]}>{policyLabel(policy)}</Text>
    </View>
  );
}

/** The policy in full, without promising the outcome: sentence, conditions, last checked, store terms. */
export function PriceMatchNote({ policy, expanded = true }: { policy: PriceMatchPolicy; expanded?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ gap: space[2], paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: c.brandSubtle }}>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <ShieldCheck size={size.iconMd} color={c.brandText} />
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: c.ink }]}>{policySentence(policy)}</Text>
          {policy.kind === 'beat-fixed' && policy.fixed && <Text style={[type.body, { color: c.inkSecondary }]}>{policy.fixed}.</Text>}
        </View>
      </View>
      {expanded && (
        <View style={{ gap: 2, paddingLeft: space[8] }}>
          {policy.conditions.map((t) => <Text key={t} style={[type.body, { color: c.inkSecondary }]}>{`• ${t}`}</Text>)}
          {policy.priceDropRefundDays != null && <Text style={[type.body, { color: c.inkSecondary }]}>{`• Refunds the difference if its own price drops within ${policy.priceDropRefundDays} days`}</Text>}
        </View>
      )}
      {policy.note && (
        <Text style={[type.caption, { fontSize: 13, lineHeight: 18, color: c.warning, backgroundColor: c.warningSubtle, padding: space[2], borderRadius: radius.sm, overflow: 'hidden' }]}>{policy.note}</Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space[2] }}>
        <Text style={[type.caption, { color: c.inkSecondary }]}>{`Checked ${fmtDate(policy.checkedAt)}${policy.verified ? '' : ' · Check with the store before you buy'}`}</Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(policy.sourceUrl)} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[type.caption, { fontFamily: 'Inter_600SemiBold', color: c.brandText, textDecorationLine: 'underline' }]}>Store terms</Text>
          <ExternalLink size={14} color={c.brandText} />
        </Pressable>
      </View>
    </View>
  );
}

/** "Stores that price match": beat-by first; tap a store to see its conditions. */
export function PriceMatchList({ policies = PRICE_MATCH_POLICIES, title = 'Stores that price match' }: { policies?: PriceMatchPolicy[]; title?: string }) {
  const c = useTheme();
  const [open, setOpen] = React.useState<string | null>(null);
  const sorted = policiesFor(policies.map((p) => p.retailer), policies);
  return (
    <View style={{ gap: space[2] }}>
      <Text accessibilityRole="header" style={[type.h2, { color: c.ink }]}>{title}</Text>
      <Text style={[type.body, { color: c.inkSecondary, marginBottom: space[2] }]}>{`${sorted.length} NZ stores may match or beat a cheaper price. Conditions apply.`}</Text>
      {sorted.map((p) => {
        const isOpen = open === p.retailer;
        return (
          <View key={p.retailer} style={{ gap: space[2] }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${p.retailer}, ${policyLabel(p)}`}
              onPress={() => setOpen(isOpen ? null : p.retailer)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.tapTarget, paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: c.surface }}>
              <Text style={[type.bodyStrong, { flex: 1, fontSize: 15, color: c.ink }]}>{p.retailer}</Text>
              <PriceMatchBadge policy={p} />
              <ChevronDown size={size.iconSm} color={c.inkSecondary} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {isOpen && <PriceMatchNote policy={p} />}
          </View>
        );
      })}
    </View>
  );
}
