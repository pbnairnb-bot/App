/*
 * Shopping assistant. Answers only from PriceMatch NZ's own price data, so it never invents a
 * price or a store offer. Works fully on the phone; when the optional AI service is switched on
 * (Supabase Edge Function "assistant" with an API key), the wording comes from the AI but the
 * products and prices shown still come from here.
 */
import { CATEGORY_LABELS } from './categories';
import { freshness, nzd, policiesForCategory, verdict } from './compare';
import { getHistory, getOffers, listings, policies, type Listing } from './repo';
import type { GeoPoint } from '@/design/components';
import { supabase } from '@/lib/supabase';

export interface AssistantAction { label: string; href: string }
export interface AssistantReply { text: string; products?: Listing[]; actions?: AssistantAction[]; basket?: BasketResult }
export interface BasketResult { items: Listing[]; missing: string[]; byStore: Array<{ store: string; total: number; count: number }>; bestSplit: number }

const STOP = new Set('a an the is are for of me my find show cheapest cheap cheaper best price prices where can i buy get what whats what\'s how much near nearby near-me compare comparing good deal deals today in at on to and please any some nz store stores lowest who which does do will match matches beat this that it a buy right now worth should under over than with without'.split(' '));

const CATEGORY_WORDS: Record<string, string> = {
  grocery: 'groceries', groceries: 'groceries', food: 'groceries', supermarket: 'groceries',
  beauty: 'beauty', pharmacy: 'beauty', chemist: 'beauty', skincare: 'beauty', vitamins: 'beauty',
  electronics: 'electronics', tech: 'electronics', tv: 'electronics', tvs: 'electronics', headphones: 'electronics', earbuds: 'electronics',
  appliances: 'appliances', appliance: 'appliances', kitchen: 'appliances', vacuum: 'appliances',
  pet: 'pets', pets: 'pets', dog: 'pets', cat: 'pets',
};

/** Everyday words shoppers use for products. */
const SYNONYMS: Record<string, string[]> = {
  bread: ['loaf', 'sourdough'], loaf: ['bread'], earphones: ['earbuds'], headphones: ['earbuds'], airpods: ['earbuds'],
  telly: ['tv'], television: ['tv'], sunblock: ['sunscreen'], sunscreen: ['spf'], moisturizer: ['moisturiser'],
  dishwashing: ['dishwasher'], tablets: ['tablets'], batteries: ['batteries'], coffee: ['coffee'], peanut: ['peanut'],
  vacuum: ['vacuum'], hoover: ['vacuum'], airfryer: ['air', 'fryer'], 'dog food': ['dog'], milk: ['milk'],
};

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9$.\s'-]/g, ' ').split(/\s+/).filter(Boolean);
const keywords = (s: string) => {
  const ks = words(s).filter((w) => !STOP.has(w) && w.length > 1);
  return Array.from(new Set(ks.flatMap((k) => [k, ...(SYNONYMS[k] ?? [])])));
};
const singular = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

function score(l: Listing, kws: string[]) {
  const hay = `${l.product.name} ${l.product.brand ?? ''} ${l.product.size ?? ''} ${CATEGORY_LABELS[l.category ?? ''] ?? ''}`.toLowerCase();
  return kws.reduce((n, k) => n + (hay.includes(k) ? 2 : k.length > 3 && hay.includes(singular(k)) ? 1 : 0), 0);
}

function findProducts(text: string, all: Listing[], limit = 3): Listing[] {
  const kws = keywords(text);
  if (!kws.length) return [];
  return all.map((l) => ({ l, s: score(l, kws) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.l.price - b.l.price).slice(0, limit).map((x) => x.l);
}

function categoryIn(text: string): string | undefined {
  return words(text).map((w) => CATEGORY_WORDS[w]).find(Boolean);
}

const line = (l: Listing) => `${l.product.name}${l.product.size ? ` ${l.product.size}` : ''}: ${nzd(l.price)} at ${l.best.store.name}${l.storeCount > 1 ? ` (lowest of ${l.storeCount} stores)` : ''}${l.best.stale ? ` (${freshness(l.best.checkedAt).toLowerCase()}, may have changed)` : ''}`;

/** On-device answer. */
export function answerLocally(question: string, at?: GeoPoint): AssistantReply {
  const q = question.trim();
  const lower = q.toLowerCase();
  const all = listings(at);
  const cat = categoryIn(q);

  // A shopping list: "milk, eggs and bread"
  const parts = lower.split(/,|\band\b|\+|\n/).map((s) => s.trim()).filter((s) => keywords(s).length);
  if (parts.length >= 2) {
    const items: Listing[] = []; const missing: string[] = [];
    parts.forEach((p) => { const f = findProducts(p, all, 1)[0]; if (f && !items.includes(f)) items.push(f); else if (!f) missing.push(p); });
    if (items.length >= 2) {
      const totals = new Map<string, { total: number; count: number }>();
      items.forEach((it) => getOffers(it.product.id, at).filter((o) => !o.stale).forEach((o) => {
        const t = totals.get(o.store.name) ?? { total: 0, count: 0 };
        totals.set(o.store.name, { total: t.total + o.total, count: t.count + 1 });
      }));
      const byStore = [...totals.entries()].map(([store, v]) => ({ store, ...v })).sort((a, b) => b.count - a.count || a.total - b.total);
      const bestSplit = items.reduce((n, it) => n + it.price, 0);
      const full = byStore.filter((s) => s.count === items.length);
      const text = full.length
        ? `For your ${items.length} items, the cheapest single store is ${full[0].store} at ${nzd(full[0].total)}. Buying each item where it's cheapest costs ${nzd(bestSplit)}${full[0].total - bestSplit > 0.5 ? `, saving ${nzd(full[0].total - bestSplit)}` : ''}.`
        : `Buying each item where it's cheapest comes to ${nzd(bestSplit)}. No single store has all ${items.length} items in our prices.`;
      return { text: text + (missing.length ? ` I couldn't find: ${missing.join(', ')}.` : ''), products: items, basket: { items, missing, byStore, bestSplit } };
    }
  }

  // "Is coffee a good price?"
  if (/good price|good deal|worth|should i buy|is .* cheap|right time/.test(lower)) {
    const p = findProducts(q, all, 1)[0];
    if (p) {
      const v = verdict(getHistory(p.product.id), p.price);
      return {
        text: v ? `${line(p)}. ${v.label}: ${v.detail}${v.tone === 'high' ? ' It may be worth waiting for a special.' : v.tone === 'good' ? ' Good time to buy.' : ''}` : `${line(p)}. We don't have enough price history yet to judge.`,
        products: [p], actions: [{ label: 'See price history', href: `/product/${p.product.id}` }],
      };
    }
  }

  // "Who price matches TVs?"
  if (/price ?match|matches|beat|match it/.test(lower)) {
    const p = findProducts(q, all, 1)[0];
    const c = p?.category ?? cat;
    const list = c ? policiesForCategory(c, policies) : policies.slice(0, 5);
    return {
      text: list.length
        ? `These stores may match or beat a cheaper price${c ? ` on ${CATEGORY_LABELS[c]?.toLowerCase() ?? c}` : ''}: ${list.map((x) => x.retailer).join(', ')}. Always check with the store before you buy.`
        : 'Here are the NZ stores with price-match promises.',
      products: p ? [p] : undefined,
      actions: [{ label: 'Stores that price match', href: '/stores' }, ...(p ? [{ label: 'Get it matched', href: `/match/${p.product.id}` }] : [])],
    };
  }

  // "Any deals on electronics?"
  if (/deal|special|sale|discount|on sale|save/.test(lower)) {
    const pool = all.filter((l) => l.wasPrice && l.wasPrice > l.price && (!cat || l.category === cat)).sort((a, b) => (b.wasPrice! - b.price) / b.wasPrice! - (a.wasPrice! - a.price) / a.wasPrice!);
    if (pool.length) return { text: `Top deals${cat ? ` in ${CATEGORY_LABELS[cat]}` : ''} right now:`, products: pool.slice(0, 3), actions: [{ label: 'All deals', href: '/search?sort=biggest-saving' }] };
    return { text: `No verified deals${cat ? ` in ${CATEGORY_LABELS[cat]}` : ''} right now. Check back later today.` };
  }

  // Default: find the product and its cheapest store.
  const found = findProducts(q, all, 3);
  if (found.length) {
    const top = found[0];
    return {
      text: `The best price I can find: ${line(top)}.${found.length > 1 ? ' Here are some close matches too.' : ''}`,
      products: found,
      actions: [{ label: 'Compare all stores', href: `/product/${top.product.id}` }],
    };
  }
  if (cat) {
    const inCat = all.filter((l) => l.category === cat).sort((a, b) => a.price - b.price).slice(0, 3);
    if (inCat.length) return { text: `Here are some ${CATEGORY_LABELS[cat]?.toLowerCase()} prices:`, products: inCat, actions: [{ label: `Browse ${CATEGORY_LABELS[cat]}`, href: `/search?category=${cat}` }] };
  }
  return {
    text: "I couldn't find that in our prices yet. Try another name, type its barcode number, or tell us a price you've seen so everyone can compare it.",
    actions: [{ label: 'Share a price', href: `/report?name=${encodeURIComponent(q)}` }],
  };
}

/**
 * Asks the AI service when it's switched on, giving it only the matching PriceMatch prices.
 * Falls back to the on-device answer if it's off, slow or offline.
 */
export async function ask(question: string, history: Array<{ role: 'user' | 'assistant'; text: string }>, at?: GeoPoint): Promise<AssistantReply> {
  const local = answerLocally(question, at);
  const facts = (local.products ?? []).map((l) => ({
    product: `${l.product.name}${l.product.size ? ` ${l.product.size}` : ''}`, best: `${nzd(l.price)} at ${l.best.store.name}`,
    stores: getOffers(l.product.id, at).map((o) => `${o.store.name} ${nzd(o.total)}${o.stale ? ' (old)' : ''}`),
  }));
  try {
    const call = supabase.functions.invoke('assistant', { body: { question, history: history.slice(-6), facts, localAnswer: local.text } });
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 9000));
    const res = (await Promise.race([call, timeout])) as { data?: { text?: string } } | null;
    const text = res?.data?.text?.trim();
    if (text) return { ...local, text };
  } catch { /* use the on-device answer */ }
  return local;
}
