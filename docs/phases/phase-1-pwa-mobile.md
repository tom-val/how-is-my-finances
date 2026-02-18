# Phase 1 — PWA & Mobile-Friendly Design

Optimise the app for mobile use and ensure PWA features work properly. This is a cross-cutting concern that improves all other features.

## Status: Not Started

## Scope

Mobile-first responsive design, PWA install experience, offline indicators, touch-friendly interactions.

## PWA Features

### Service Worker & Caching
- Verify `vite-plugin-pwa` generates correct service worker
- Cache static assets (JS, CSS, images) for instant loads
- Network-first strategy for API calls (always fresh data when online)
- Offline indicator banner when network is unavailable

### Install Experience
- App manifest with correct name, icons, theme colour, background colour
- "Add to Home Screen" prompt
- Splash screen configuration for iOS and Android
- Standalone display mode (no browser chrome)

### Icons & Branding
- App icon set (192x192, 512x512 minimum)
- Apple touch icon
- Favicon

## Mobile-Friendly Design

### Layout
- Mobile-first responsive design (mobile → tablet → desktop)
- Bottom navigation bar on mobile (months, recurring, settings)
- Top header simplified on mobile
- Full-width cards on mobile, grid on desktop
- Touch-friendly tap targets (minimum 44x44px)

### Expense Entry (Critical Path)
- Quick-add expense form optimised for one-handed use
- Numeric keyboard for amount input (`inputmode="decimal"`)
- Date picker with sensible defaults (today)
- Category selector with search/filter for long lists
- Swipe to delete/edit on expense rows

### Month Detail
- Collapsible category breakdown section
- Summary cards that scroll horizontally on narrow screens
- Pull-to-refresh for data reload

### Forms & Dialogs
- Full-screen dialogs on mobile (bottom sheet style)
- Form inputs with proper `inputmode` attributes
- Keyboard-aware layout (forms don't get hidden behind keyboard)

## Testing
- Test on iOS Safari (PWA install, standalone mode)
- Test on Android Chrome (PWA install, standalone mode)
- Test responsive breakpoints (320px, 375px, 414px, 768px, 1024px)
- Lighthouse PWA audit score

## Definition of Done
- App installable as PWA on iOS and Android
- Mobile layout is comfortable for one-handed expense entry
- Lighthouse PWA score > 90
- Offline indicator shows when disconnected
- Bottom navigation on mobile screens
