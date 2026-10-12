import type { Listing } from '@/data/repo';

export function toCard(l: Listing) {
  return {
    id: l.id, name: `${l.product.name}${l.product.size ? ` ${l.product.size}` : ''}`, price: l.price, wasPrice: l.wasPrice, isSample: l.isSample,
    where: l.storeCount > 1 ? `${l.best.store.name} · lowest of ${l.storeCount}` : l.best.store.name,
    badge: l.storeCount > 1 && !l.wasPrice ? ('best' as const) : undefined,
  };
}

export function timeAgo(iso: string) {
  const m = (Date.now() - Date.parse(iso)) / 60000;
  if (m < 1) return 'Just now';
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}
