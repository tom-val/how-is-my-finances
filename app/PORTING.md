# Porting screens from `frontend/` (PWA) to `app/` (Expo)

Working notes for the PWA → Expo port. Delete once `frontend/` is removed.

## Ground rules

- Port **behaviour and content 1:1** (same queries, mutations, validation, i18n keys, error handling).
  Keep the look close to the PWA (shadcn neutral theme) — NativeWind classes mostly carry over.
- Same component names and props as the web file where possible. Web `pages/X.tsx` → `screens/XScreen.tsx`
  (route files in `src/app` re-export these; they already exist). Components keep their folder.
- Hooks in `features/*/hooks` and `src/api/*` are already copied and work unchanged. Don't edit them
  unless something web-only is in them.
- Do **not** edit `src/i18n/*/translation.json`, `src/components/ui/*`, `src/theme/*`, `src/app/*`
  or another feature's folder. If you need a new key or a UI-kit change, say so in your report.
- British English in code and comments.

## Mapping cheat sheet

| Web | App |
|---|---|
| `<div>` | `<View>` (flex column by default; add `flex-row` for rows) |
| any text (`<p>`, `<span>`, bare strings) | `<Text>` from `@/components/ui/text` — **every string must be inside Text** |
| `lucide-react` `<Pencil className="h-4 w-4" />` | `<Icon as={Pencil} />` (`lucide-react-native`); size via `size={14}` or `className="size-5"`, colour via `text-*` class |
| `Button` (`onClick`, `asChild`) | `Button` from `@/components/ui/button` (`onPress`, `loading`, `variant`, `size`, `textClassName`) |
| `Card*`, `Input`, `Label`, `Switch`, `Progress` | same names under `@/components/ui/*` (`Input` uses `onChangeText`; `Switch` keeps `checked`/`onCheckedChange`) |
| `ResponsiveDialog*` (forms) | `<Dialog open onOpenChange title>` from `@/components/ui/dialog` — body is already a ScrollView with `gap-4` |
| Delete/confirm dialogs | `<ConfirmDialog … destructive />` from `@/components/ui/dialog` (children for extra lines / errors) |
| `<form onSubmit>` | plain `View` + `Button onPress={handleSubmit}`; `onSubmitEditing` on the last input |
| `Select` | `<Select value onValueChange options={[{value,label}]} placeholder />` from `@/components/ui/select` |
| Combobox (Popover/Command/ComboboxDrawer) | `ComboboxTrigger` + `BottomSheet` (with `search`) + `SheetItem` / `SheetEmpty` from `@/components/ui/*` |
| `<Input type="date">` | `<DateInput value onChange />` (`YYYY-MM-DD`) |
| `MoneyInput` | `@/components/shared/MoneyInput` (same props) |
| `<input type="number">` | `Input` with `keyboardType="number-pad"`/`inputMode="numeric"` |
| `toast` from sonner | `toast` from `@/components/ui/toast` (`success` / `error`) |
| page wrapper / `<main>` | `<Screen onRefresh={refetch} refreshing={isRefetching}>` from `@/components/ui/screen` (scrolls; `gap-6` between children) |
| `useNavigate` / `<Link to>` | `router.push("/months/" + id)` / `<Link href>` from `expo-router`; params via `useLocalSearchParams<{ monthId: string }>()` |
| back links (`ArrowLeft`) | keep them: `router.back()` if `router.canGoBack()`, else `router.replace(parent)` |
| `hover:` | `web:hover:` (native has `active:` for press feedback) |
| `truncate` | `numberOfLines={1}` on the Text |
| `space-y-*`, `divide-*`, `grid grid-cols-2` | `gap-*`; borders per item; `flex-row` + `flex-1` children |
| `hidden sm:inline` | works (`hidden sm:flex`); breakpoints follow window width on native too |
| `animate-spin` `Loader2` | `<ActivityIndicator />` |
| `localStorage` | `getItem`/`setItem` from `@/lib/storage` |
| `useIsMobile()` | `!useIsWide()` from `@/hooks/useIsWide` |
| `window.confirm`, `alert` | `ConfirmDialog` |
| colours needed as values (charts, icons props) | `useTheme().colours[token]` / `useTheme().chartColours` |

Text does not inherit styles from a parent `View`. Inside `Button`/`Card` the kit passes text colour
via `TextClassContext`, so plain `<Text>` and `<Icon>` there pick it up automatically.

## Checks

`cd app && npx tsc --noEmit && npx expo lint`. Errors in files you didn't touch may come from another
port in progress — ignore those. Don't start dev servers or native builds, and don't commit.
