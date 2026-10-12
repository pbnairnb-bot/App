// Generates supabase/seed.sql from the bundled sample data and price-match policies.
import { writeFileSync, mkdirSync } from 'fs';
import { SAMPLE_PRICES, SAMPLE_PRODUCTS, SAMPLE_STORES, sampleHistory } from '../src/data/sample';
import { PRICE_MATCH_POLICIES } from '../src/design/components/pricematch';

const q = (v: unknown): string => v == null ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : Array.isArray(v) ? `array[${v.map(q).join(',')}]::text[]` : `'${String(v).replace(/'/g, "''")}'`;
const rows = (t: string, cols: string[], data: unknown[][]) => `insert into public.${t} (${cols.join(',')}) values\n${data.map((r) => `(${r.map(q).join(',')})`).join(',\n')}\non conflict do nothing;\n`;

let sql = '-- Sample data: every row is flagged is_sample / source = sample and labelled in the app.\n';
sql += rows('stores', ['id','name','short','color','online','delivery_fee','is_sample'], SAMPLE_STORES.map((s) => [s.id, s.name, s.short, s.color, s.online, s.deliveryFee ?? null, true]));
sql += rows('store_branches', ['store_id','lat','lng'], SAMPLE_STORES.flatMap((s) => s.branches.map((b) => [s.id, b.lat, b.lng])));
sql += rows('products', ['id','barcode','name','size','unit_qty','unit','category','is_sample'], SAMPLE_PRODUCTS.map((p) => [p.id, p.barcode, p.name, p.size ?? null, p.unitQty ?? null, p.unit ?? null, p.category, true]));
sql += rows('prices', ['product_id','store_id','price','was_price','member_price','member_label','source','checked_at','ends_at','online_only'],
  SAMPLE_PRICES.map((p) => [p.productId, p.storeId, p.price, p.wasPrice ?? null, p.memberPrice ?? null, p.memberLabel ?? null, 'sample', p.checkedAt, p.endsAt ?? null, !!p.onlineOnly]));
const historySql = rows('price_history', ['product_id','day','price'], SAMPLE_PRODUCTS.flatMap((p) => sampleHistory(p.id).map((h) => [p.id, h.date, h.price])));
sql += rows('price_match_policies', ['retailer','kind','percent','fixed','conditions','price_drop_refund_days','source_url','checked_at','verified','note'],
  PRICE_MATCH_POLICIES.map((p) => [p.retailer, p.kind, p.percent ?? null, p.fixed ?? null, p.conditions, p.priceDropRefundDays ?? null, p.sourceUrl, p.checkedAt, p.verified, p.note ?? null]));
mkdirSync('supabase', { recursive: true });
writeFileSync('supabase/seed.sql', sql + historySql);
writeFileSync('supabase/seed-core.sql', sql);
console.log(sql.length, 'chars');
