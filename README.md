# PriceMatch NZ — mobile app (Stage 1)

Free price comparison and price-match helper for New Zealand shoppers. Expo (SDK 57) + Expo Router + TypeScript.

## Try it on your phone
1. Install **Expo Go** from the App Store or Google Play.
2. On a computer with Node.js 20+: unzip this folder, then run
   `npm install` and `npx expo start`
3. Scan the QR code with your phone camera (iPhone) or the Expo Go app (Android).

## What's in Stage 1
- Animated splash, 3-screen onboarding, no forced sign-up
- Home: location, alerts, search, recent scans, dynamic deal banners, best prices, categories, price-match stores
- Barcode scanner with first-time guide, torch, type-the-number fallback and sample barcodes
- Real barcode lookups via Open Food Facts (product name and photo)
- Product compare: best price first, "Is this a good price?" verdict, 90-day history, every store with unit price, member price, delivery and freshness
- "Get it matched" card to show at the counter, plus which stores may match or beat
- Search with filters and sorting, categories, favourites, scan history (delete one with Undo, or clear all)
- Profile: area, alert choices with quiet hours, privacy controls
- Light and dark mode, reduced motion, 48px tap targets

## Backend (Supabase, project `pricematch-nz`, Sydney)
- Tables: stores, store_branches, products, prices, price_history, price_match_policies, favourites, scan_history, price_reports, admins
- Row-level security: anyone can read the catalogue; only admins can change it; shoppers only see their own favourites, scans and reports
- The app loads the catalogue on launch and falls back to the bundled copy when offline
- Sign-in: 6-digit email code (Supabase Auth), then optional fingerprint / Face ID unlock
- Shopper price reports go to `price_reports` as `pending`; approve them in the Supabase Table Editor
- Make yourself an admin: add your user id to the `admins` table
- Sample rows are flagged (`is_sample`, `source = 'sample'`) and a cron job keeps their timestamps current every 6 hours

All sample prices are clearly labelled until real data sources (licensed feeds, approved shopper reports) are connected.

## Where things live
- `src/app/` — screens (Expo Router)
- `src/design/` — the PriceMatch NZ design system (theme + components)
- `src/data/repo.ts` — the only place screens get data from; swap to Supabase in Stage 2
- `src/data/sample.ts` — sample data
- `src/state/app-state.tsx` — on-device settings, favourites and scan history
- `app.json` — app name, icons, permissions

## Checks
`npx tsc --noEmit` (type-check)
