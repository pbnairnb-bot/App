/*
 * PriceMatch NZ — dynamic hero banner rules. Pure TypeScript, shared by the web
 * components (components/src) and the app (native/components/hero.ts — keep identical).
 */
export type HeroTemplate = 'countdown' | 'percent' | 'drop' | 'best' | 'spotlight';
export interface HeroContent { template: HeroTemplate; eyebrow: string; headline: string; accent?: string }
export interface HeroDeal {
  price: number;
  wasPrice?: number;
  lastPrice?: number;
  storesCompared?: number;
  endsAt?: string;
  headline?: string;
  label?: 'deal' | 'limited' | 'best' | 'save' | 'sample';
}

export const HERO_WIDTH = 328;
const nzd = (n: number) => `$${n.toFixed(2)}`;
const EYEBROW = { deal: 'Deal of the day', limited: 'Limited-time deal', best: 'Best price', save: 'Save more', sample: "Today's pick" } as const;

/** Time left until `endsAt`, as "5h 20m" / "42m" / "3 days"; null if unknown or passed. */
export function timeLeft(endsAt: string | undefined, now: number): string | null {
  if (!endsAt) return null;
  const ms = Date.parse(endsAt) - now;
  if (!(ms > 0)) return null;
  const mins = Math.floor(ms / 60000), h = Math.floor(mins / 60), m = mins % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d} day${d > 1 ? 's' : ''}`; }
  return h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}

/**
 * Picks the banner layout and copy from the deal's own data.
 * Every figure shown comes from a verified field; a template whose data is missing is skipped.
 * Returns null for expired deals, which must never be shown.
 */
export function heroContent(deal: HeroDeal, now: number = Date.now()): HeroContent | null {
  if (deal.endsAt && Date.parse(deal.endsAt) <= now) return null;
  const pct = deal.wasPrice != null && deal.wasPrice > deal.price ? Math.round((1 - deal.price / deal.wasPrice) * 100) : 0;
  const left = timeLeft(deal.endsAt, now);
  const within48h = deal.endsAt ? Date.parse(deal.endsAt) - now <= 48 * 3600e3 : false;
  if (left && within48h) {
    return { template: 'countdown', eyebrow: 'Limited-time deal', headline: deal.headline ?? `Ends in ${left}`, accent: pct >= 5 ? `${pct}% off` : undefined };
  }
  if (pct >= 15) {
    return { template: 'percent', eyebrow: deal.label === 'deal' ? 'Deal of the day' : 'Big saving', headline: deal.headline ?? `${pct}%`, accent: 'off' };
  }
  if (deal.lastPrice != null && deal.lastPrice > deal.price) {
    return { template: 'drop', eyebrow: 'Price drop', headline: deal.headline ?? `Down ${nzd(deal.lastPrice - deal.price)}`, accent: `was ${nzd(deal.lastPrice)}` };
  }
  if (deal.storesCompared != null && deal.storesCompared >= 2) {
    return { template: 'best', eyebrow: 'Best price', headline: deal.headline ?? `Lowest of ${deal.storesCompared} stores` };
  }
  return { template: 'spotlight', eyebrow: deal.label ? EYEBROW[deal.label] : "Today's pick", headline: deal.headline ?? nzd(deal.price) };
}
