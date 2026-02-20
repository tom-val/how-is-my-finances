# Phase 6 — Settings & Profile Page

Settings page for user preferences. Backend already has profile GET/PUT endpoints.

## Status: Done

## Scope

Frontend settings page with language, currency, display name, theme toggle, and accent colour picker.

## Backend
- Already implemented: `GET /v1/profile`, `PUT /v1/profile`
- No backend changes needed

## Frontend

### Pages
- `SettingsPage` at `/settings` — two card sections (Appearance + Profile)

### Components
- **Appearance section**: Theme selector (light/dark/system via `next-themes`), accent colour picker (6 OKLCH presets)
- **Profile section**: Language selector (en/lt), display name input, currency selector (EUR), save button
- `ProfileForm` — extracted child component keyed by profile ID for clean state initialisation

### Hooks
- `useProfile()` — TanStack Query hook for `GET /v1/profile`
- `useUpdateProfile()` — mutation hook for `PUT /v1/profile`
- `useAccentColour()` — localStorage-backed accent colour with OKLCH presets and MutationObserver for theme class changes

### Shared Types
- `shared/types/profile.ts` — `Profile` and `UpdateProfileRequest` interfaces

### API
- `frontend/src/api/profile.ts` — `getProfile()`, `updateProfile()` functions

### Router
- Added `/settings` route

### i18n
- Added settings keys: `appearance`, `profile`, `displayName`, `languageDescription`, `currencyDescription`, `saved`, `theme`, `themeDescription`, `themeLight`, `themeDark`, `themeSystem`, `accentColour`, `accentColourDescription`

### ThemeProvider
- Wired `next-themes` ThemeProvider in `App.tsx` with `attribute="class"` and `defaultTheme="system"`
- `AccentColourProvider` component applies saved accent colour on app init

### LanguageSwitcher
- Updated header toggle to persist language change to backend via `useUpdateProfile`

### Behaviour
- Language change updates both the profile (server) and the i18n instance (client) immediately
- Theme persists via `next-themes` localStorage
- Accent colour persists via localStorage, re-applied on theme toggle via MutationObserver
- Show toast on successful save

## Definition of Done
- ✅ Settings page accessible from header nav and bottom nav (mobile)
- ✅ Language switch persists to profile and immediately changes UI language
- ✅ Display name editable with save button
- ✅ Theme toggle (light/dark/system) works across all pages
- ✅ Accent colour picker changes primary colour across the interface
- ✅ All settings persist across page refresh
- ✅ Mobile-responsive layout
- ✅ Frontend checks pass (typecheck, lint, build)
- ✅ Manual verification in browser
