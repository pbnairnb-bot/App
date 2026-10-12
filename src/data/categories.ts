import { Fuel, Pill, PawPrint, Shirt, ShoppingCart, Sofa, Tv, Microwave, type LucideIcon } from 'lucide-react-native';

export const CATEGORY_LIST: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'beauty', label: 'Beauty & pharmacy', icon: Pill },
  { id: 'electronics', label: 'Electronics', icon: Tv },
  { id: 'appliances', label: 'Home appliances', icon: Microwave },
  { id: 'pets', label: 'Pet supplies', icon: PawPrint },
  { id: 'home', label: 'Home & garden', icon: Sofa },
  { id: 'fashion', label: 'Fashion & sport', icon: Shirt },
  { id: 'petrol', label: 'Petrol', icon: Fuel },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORY_LIST.map((c) => [c.id, c.label]));
