# Phase 5 — Month Dashboard & Analytics

Replicate the Excel sidebar: category totals, remaining balance, per-day budget, days remaining. This is the "at a glance" view that makes the app useful day-to-day.

## Status: Not Started

## Scope

Enhance `MonthDetailPage` with category breakdown, per-day calculations, and spending progress.

## Backend

### Enhanced Month Detail
- Extend `GET /v1/months/{id}` response to include:
  - `categoryBreakdown` — array of { categoryId, categoryNameEn, categoryNameLt, categoryName, total } sorted by total DESC
  - `daysRemaining` — days left in the month
  - `perDayBudget` — remaining / daysRemaining (0 if month is over)
  - Existing: salary, totalSpent, remaining

### Model Changes
- `MonthDetail` gains `CategoryBreakdown[]` and `DaysRemaining`, `PerDayBudget`
- `CategoryBreakdown` record — categoryId, nameEn, nameLt, name, total

### Service Changes
- `GetByIdAsync` runs a second query (or CTE) grouping expenses by category

## Frontend

### MonthDetailPage Enhancements
- **Summary cards** (already exist): salary, total spent, remaining
- **New cards**: days remaining, budget per day
- **Category breakdown panel**: table/list showing each category's total spend, sorted by amount
- **Progress bar**: visual indicator of spent vs salary percentage
- Spent percentage colour coding: green (<70%), amber (70-90%), red (>90%)

### i18n
- Add: `months.categoryBreakdown`, `months.noCategoryData`

## Definition of Done
- Month detail shows category-by-category spending totals
- Per-day budget and days remaining display correctly
- Spending progress bar with colour coding
- Manual verification in browser
