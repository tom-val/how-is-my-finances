# Handover — Convert to React Native app "Finansai"

## Goal
Convert the Vite + React PWA in `frontend/` into a full Expo / React Native app called **Finansai** (iOS, Android, Web from one codebase).
- `https://finances.valiunas.dev` must serve the **web build** of the new app (replacing the PWA).
- GitHub pipelines: same setup as **Medelis** (`tom-val/kindergarten`): native builds via EAS (`.github/workflows/eas-build.yml`, manual) and OTA via EAS Update (`eas-update.yml` + the deploy workflows).
- Will be published to the App Store / Play Store eventually (store rather than TestFlight). Use `tom-val/how-is-my-coffee` as the reference: it was recently converted from a PWA to RN and went through store setup.
- Use subagents: Opus for architecture, native modules, pipelines and review; Sonnet for mechanical screen/component ports. Review their output before accepting it.
- Test in the iOS Simulator, the Android emulator and on Web.

## Why
Reading Swedbank push notifications to suggest expenses needs Android's `NotificationListenerService`, which a PWA can't use. iOS doesn't allow reading other apps' notifications at all. Enable Banking (Phase 10) is the other import source; both feed the same suggestions inbox.

## Current frontend (to port)
- ~8k lines, 71 `.tsx` files. Features: auth (login/register/forgot/reset), months list/detail/breakdown, expenses, incomes, categories, recurring, insights (8 chart components, recharts), settings (theme light/dark/system, 6 OKLCH accent colours, language, currency, display name), vendor settings, admin import.
- Web-only dependencies that need replacements: shadcn/ui + radix-ui, Tailwind v4, recharts, react-router 7, sonner, cmdk, next-themes, lucide-react, vite-plugin-pwa.
- Reusable mostly as-is: `frontend/src/api/*` (fetch wrapper with Supabase JWT), TanStack Query hooks, `shared/types/*`, i18n JSON (`en`, `lt`), zod schemas, date-fns.
- Auth: Supabase Auth (supabase-js). In RN, store the session with `expo-secure-store`/AsyncStorage (Medelis uses better-auth, so its auth code doesn't transfer).

## Reference setups
- **Medelis** (`kindergarten/app`): Expo SDK 57, expo-router (typed routes, React Compiler), StyleSheet + own `ui.tsx`/`theme/`, i18next, expo-updates with `runtimeVersion`, EAS profiles `development` / `preview` / `production`, Sentry, web output `single`. Workflows: `eas-build.yml` (manual build), `eas-update.yml`, `deploy.yml` / `deploy-prod.yml`, `pr-checks.yml`.
- **how-is-my-coffee**: most recent PWA→RN conversion; check its structure, web deploy and store submission config first.

## Decisions (settled 2026-10-31)
- Bundle id / package `com.tomval.finansai`, scheme `finansai`, EAS project `@smikis/finansai` (owner `smikis`, project id in `app/app.json`).
- Styling: NativeWind v4 (Tailwind v3 classes), keeping the PWA's shadcn neutral look. Tokens in `app/src/theme/palette.ts`.
- Charts: `react-native-gifted-charts` (SVG; works on iOS, Android and web).
- `frontend/` stays until the app is verified at parity, then is deleted. The deploy already ships the Expo web export (`app/dist`) to the existing S3 + CloudFront; `app/public/sw.js` is a kill switch that unregisters the old PWA service worker.
- The user is fine with Claude committing.
- Store goal: publish with Android notification reading eventually, but the conversion ships first and Open Banking (Enable Banking) comes before the notification listener.
- Bank redirect: web and native both return through `https://finances.valiunas.dev/bank/callback`; native via a bounce to `finansai://bank/callback` (details in the bank plan, "Redirect round-trip").

## Related plans in this repo
- `docs/phases/phase-9-bank-integration.md`: Enable Banking (Phase 10) plan. Manual sync button; `gpt-6-luna` categorisation via SQS + Node AI processor (ported from `how-is-my-food-planning`); private key as a base64 Lambda env var.
- Enable Banking app "Personal finances" is registered in PRODUCTION, restricted mode, with the user's two Swedbank LT accounts linked. Redirect URLs: `https://finances.valiunas.dev/bank/callback`, `https://localhost:6173/bank/callback`. The user is requesting unrestricted access (his wife's accounts need it).
- Notification listener (Android, after the RN conversion): local Expo Module (Kotlin) `NotificationListenerService` filtered to the Swedbank app → local queue → `POST /v1/bank/notifications` on app open → regex parser with `gpt-6-luna` fallback → same inbox. Sideloaded builds need "Allow restricted settings" on Android 13+. Needs 5–10 real anonymised Swedbank notification samples. `bank_transactions` gets `source` (`enable_banking` | `notification`) and a nullable `bank_account_id`; merge notification + booked transaction by amount ±2 days + merchant.

## Store review notes for the notification listener (later)
Not built yet; this is for when it is. Google's current wording on notification-listener access wasn't confirmed (Oct 2026), so check the Play Console restricted-permissions policy before submitting. Third-party guidance and other expense apps point the same way:
- Notification access gets extra scrutiny. It must back a core, clearly described feature: suggesting expenses from bank notifications.
- Show an in-app prominent disclosure before sending the user to the system "Notification access" screen. Say what is read (only the Swedbank app's notifications), what leaves the device (parsed amount, merchant and date, not the raw notification) and why.
- Filter to the Swedbank package inside the service, drop everything else immediately, and declare it in the Data safety form ("Financial info", collected, not shared).
- The first store release can ship without the listener (conversion + Enable Banking). Add it in a later release so a rejection doesn't block the app.
- iOS has no equivalent API. The iOS build simply doesn't offer the feature.
