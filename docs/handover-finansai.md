# Handover — Convert to React Native app "Finansai"

## Goal
Convert the Vite + React PWA in `frontend/` into a full Expo / React Native app called **Finansai** (iOS, Android, Web from one codebase).
- `https://finances.valiunas.dev` must serve the **web build** of the new app (replacing the PWA).
- GitHub pipelines: same setup as **Medelis** (`tom-val/kindergarten`): native builds via EAS (`.github/workflows/eas-build.yml`, manual) and OTA via EAS Update (`eas-update.yml` + the deploy workflows).
- Will be published to the App Store / Play Store eventually (store rather than TestFlight). Use `tom-val/how-is-my-coffee` as the reference: it was recently converted from a PWA to RN and went through store setup.
- Use subagents: Opus for architecture, native modules, pipelines and review; Sonnet for mechanical screen/component ports. Review their output before accepting it.
- Test in the iOS Simulator, the Android emulator and on Web.
- User preference: **do not commit**; the user commits.

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

## Decisions still open (ask the user)
- Bundle id / package name (e.g. `com.tomval.finansai`) and Expo account owner (Medelis uses `smikis`)
- Styling: StyleSheet like Medelis vs NativeWind (keeps Tailwind classes, eases the port)
- Charts library (`react-native-gifted-charts` vs Victory Native, must work on web)
- Keep `frontend/` until the new app reaches parity, then delete; web deploy switches from the Vite build to `expo export --platform web` → existing S3 + CloudFront (`infra/modules/s3-frontend`, `cloudfront`)

## Related plans in this repo
- `docs/phases/phase-9-bank-integration.md`: Enable Banking (Phase 10) plan. Manual sync button; `gpt-6-luna` categorisation via SQS + Node AI processor (ported from `how-is-my-food-planning`); private key as a base64 Lambda env var.
- Enable Banking app "Personal finances" is registered in PRODUCTION, restricted mode, with the user's two Swedbank LT accounts linked. Redirect URLs: `https://finances.valiunas.dev/bank/callback`, `https://localhost:6173/bank/callback`. The user is requesting unrestricted access (his wife's accounts need it).
- Notification listener (Android, after the RN conversion): local Expo Module (Kotlin) `NotificationListenerService` filtered to the Swedbank app → local queue → `POST /v1/bank/notifications` on app open → regex parser with `gpt-6-luna` fallback → same inbox. Sideloaded builds need "Allow restricted settings" on Android 13+. Needs 5–10 real anonymised Swedbank notification samples. `bank_transactions` gets `source` (`enable_banking` | `notification`) and a nullable `bank_account_id`; merge notification + booked transaction by amount ±2 days + merchant.
