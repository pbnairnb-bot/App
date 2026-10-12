/*
 * PriceMatch NZ — store price-match and price-beat policies.
 * Pure TypeScript, shared by the web components (components/src) and the app
 * (native/components/pricematch.ts — keep identical). In production this list comes
 * from the database, where an admin confirms each policy on the store's own terms page.
 */

export type PolicyKind = 'beat-percent' | 'beat-difference' | 'beat-fixed' | 'match';

export interface PriceMatchPolicy {
  retailer: string;
  kind: PolicyKind;
  /** For beat-percent / beat-difference: the percentage. */
  percent?: number;
  /** For beat-fixed: a short description of the amounts. */
  fixed?: string;
  /** Short, plain conditions shown under the policy. */
  conditions: string[];
  /** Also refunds the difference if the store's own price drops (days). */
  priceDropRefundDays?: number;
  /** Where the policy was read. */
  sourceUrl: string;
  /** ISO date the policy was last checked. */
  checkedAt: string;
  /** True only once confirmed on the store's own terms page. Unconfirmed policies show "Check with store". */
  verified: boolean;
  /** Optional caution shown to shoppers, e.g. a regulator's case. */
  note?: string;
}

/** Short label for badges: "Beats by 15%", "Price match". */
export function policyLabel(p: PriceMatchPolicy): string {
  switch (p.kind) {
    case 'beat-percent': return `Beats by ${p.percent}%`;
    case 'beat-difference': return `Beats by ${p.percent}% of the difference`;
    case 'beat-fixed': return 'Beats by a fixed amount';
    default: return 'Price match';
  }
}

/** One sentence for a shopper who has found a cheaper price elsewhere. Never promises the outcome. */
export function policySentence(p: PriceMatchPolicy): string {
  const how = p.kind === 'match' ? 'may match' : `may ${policyLabel(p).toLowerCase().replace('beats', 'beat')}`;
  return `${p.retailer} ${how} a cheaper price from another NZ store.`;
}

/** Policies for the retailers in a comparison, beat policies first. */
export function policiesFor(retailers: string[], all: PriceMatchPolicy[] = PRICE_MATCH_POLICIES): PriceMatchPolicy[] {
  const rank: Record<PolicyKind, number> = { 'beat-percent': 0, 'beat-difference': 1, 'beat-fixed': 2, match: 3 };
  return all.filter((p) => retailers.includes(p.retailer)).sort((a, b) => rank[a.kind] - rank[b.kind] || (b.percent ?? 0) - (a.percent ?? 0));
}

const CONSUMER = 'https://www.consumer.org.nz/shopping/deals-and-savings/we-ll-beat-it-by-15-our-guide-to-price-guarantees';
const WIKI = 'https://www.cheapies.nz/wiki/pricematch';
const COMMON = ['Identical item, in stock at both stores', 'Current price from an NZ retailer', 'Show proof, such as a screenshot'];

/** Starting list from public sources (checked 12 Oct 2026). All unverified until confirmed on each store's terms page. */
export const PRICE_MATCH_POLICIES: PriceMatchPolicy[] = [
  { retailer: 'Bunnings', kind: 'beat-percent', percent: 15, conditions: [...COMMON, 'Like-for-like for own brands'], sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Mitre 10', kind: 'beat-percent', percent: 15, conditions: COMMON, sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Briscoes', kind: 'beat-percent', percent: 10, conditions: COMMON, priceDropRefundDays: 14, sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Rebel Sport', kind: 'beat-percent', percent: 10, conditions: COMMON, priceDropRefundDays: 14, sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Chemist Warehouse', kind: 'beat-difference', percent: 10, conditions: ['NZ pharmacies or retailers with NZ stores', 'One of each product', 'Not promotional or online-only offers'], sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Supercheap Auto', kind: 'beat-fixed', fixed: '50c under prices up to $50, $1 under $50–$500, $10 over $500', conditions: COMMON, sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'JB Hi-Fi', kind: 'match', conditions: [...COMMON, 'May exclude online-only retailers'], sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Noel Leeming', kind: 'match', conditions: COMMON, sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false, note: 'The Commerce Commission filed charges about this promise in July 2025; Noel Leeming disputes them.' },
  { retailer: 'The Warehouse', kind: 'match', conditions: [...COMMON, 'Excludes clearance, auction and overseas sellers'], sourceUrl: CONSUMER, checkedAt: '2026-10-12', verified: false },
  { retailer: 'PB Tech', kind: 'match', conditions: ['Identical, new and in stock', 'Ask before you buy', "At PB Tech's discretion"], sourceUrl: 'https://newzealandreport.nz/tech/pb-tech-price-match/', checkedAt: '2026-10-12', verified: false },
  { retailer: 'Harvey Norman', kind: 'match', conditions: ['No official policy', 'Usually excludes online-only retailers'], sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Kmart', kind: 'match', conditions: COMMON, sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Mighty Ape', kind: 'match', conditions: COMMON, sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Torpedo7', kind: 'match', conditions: COMMON, sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'OfficeMax', kind: 'match', conditions: COMMON, sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
  { retailer: 'Warehouse Stationery', kind: 'match', conditions: [...COMMON, 'Same exclusions as The Warehouse'], sourceUrl: WIKI, checkedAt: '2026-10-12', verified: false },
];
