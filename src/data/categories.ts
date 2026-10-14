import { Baby, Car, Dumbbell, Fuel, HeartPulse, Home, PawPrint, Shirt, ShoppingBasket, Tv, type LucideIcon } from 'lucide-react-native';

/** Shopping categories. `tint` pairs are used for the illustrated category tiles (light, dark). */
export const CATEGORY_LIST: Array<{ id: string; label: string; icon: LucideIcon; tint: [string, string] }> = [
  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket, tint: ['#22c55e', '#15803d'] },
  { id: 'health-beauty', label: 'Health & Beauty', icon: HeartPulse, tint: ['#f472b6', '#be185d'] },
  { id: 'electronics', label: 'Electronics', icon: Tv, tint: ['#60a5fa', '#1d4ed8'] },
  { id: 'home-living', label: 'Home & Living', icon: Home, tint: ['#fbbf24', '#b45309'] },
  { id: 'baby-kids', label: 'Baby & Kids', icon: Baby, tint: ['#a78bfa', '#6d28d9'] },
  { id: 'pets', label: 'Pets', icon: PawPrint, tint: ['#fb923c', '#c2410c'] },
  { id: 'automotive', label: 'Automotive', icon: Car, tint: ['#94a3b8', '#334155'] },
  { id: 'sports-outdoors', label: 'Sports & Outdoors', icon: Dumbbell, tint: ['#2dd4bf', '#0f766e'] },
  { id: 'clothing', label: 'Clothing', icon: Shirt, tint: ['#f87171', '#b91c1c'] },
  { id: 'fuel-travel', label: 'Fuel & Travel', icon: Fuel, tint: ['#facc15', '#a16207'] },
];

/** Older category ids from earlier versions still resolve to a label. */
const LEGACY: Record<string, string> = { beauty: 'Health & Beauty', appliances: 'Home & Living', home: 'Home & Living', fashion: 'Clothing', petrol: 'Fuel & Travel' };

export const CATEGORY_LABELS: Record<string, string> = { ...LEGACY, ...Object.fromEntries(CATEGORY_LIST.map((c) => [c.id, c.label])) };
