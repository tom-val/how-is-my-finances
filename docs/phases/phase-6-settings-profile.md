# Phase 6 — Settings & Profile Page

Settings page for user preferences. Backend already has profile GET/PUT endpoints.

## Status: Not Started

## Scope

Frontend settings page with language, currency, and display name.

## Backend
- Already implemented: `GET /v1/profile`, `PUT /v1/profile`
- No backend changes needed

## Frontend

### Pages
- `SettingsPage` at `/settings`

### Components
- Display name input
- Language selector (en/lt) — saves to profile, syncs with i18n
- Currency selector (EUR default, extensible later)

### Router
- Add `/settings` route

### i18n
- Add: `settings.displayName`, `settings.languageDescription`, `settings.currencyDescription`, `settings.saved`

### Behaviour
- Language change updates both the profile (server) and the i18n instance (client)
- Show toast on successful save

## Definition of Done
- Settings page accessible from nav
- Language switch persists to profile and immediately changes UI language
- Display name editable
- Manual verification in browser
