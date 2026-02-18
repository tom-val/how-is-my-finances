# Phase 6 — Spending Notifications

Alert users when spending hits a percentage threshold (total or per-category). DB schema already exists.

## Status: Not Started

## Scope

Notification preferences CRUD + in-app alerts when thresholds are exceeded.

## Backend

### Models
- `NotificationPreference` — id, userId, thresholdType (total/category), categoryId?, thresholdPercentage, isEnabled
- `CreateNotificationPreferenceRequest` — thresholdType, categoryId?, thresholdPercentage
- `UpdateNotificationPreferenceRequest` — thresholdPercentage?, isEnabled?

### Service & Functions
- `GET /v1/notification-preferences` — list user's preferences
- `POST /v1/notification-preferences` — create threshold
- `PUT /v1/notification-preferences/{id}` — update threshold/enabled
- `DELETE /v1/notification-preferences/{id}` — delete

### Alert Check
- When an expense is created/updated, check if any thresholds are breached
- Return breach info in the expense creation response (or as a separate field in month detail)
- No push notifications for now — in-app only (visual indicators on month detail)

## Frontend

### Components
- Notification preferences section in settings (or dedicated page)
- Add threshold form: type (total/category), category select (if category type), percentage slider
- Visual indicator on month detail when threshold breached (e.g. warning banner)

### i18n
- Add notification-related keys

## Definition of Done
- Can set spending thresholds (total and per-category)
- Month detail shows warnings when thresholds are exceeded
- Manual verification in browser
