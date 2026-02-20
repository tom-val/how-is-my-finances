# Phase 5 — Month Dashboard & Analytics

Replicate the Excel sidebar: category totals, remaining balance, days remaining. This is the "at a glance" view that makes the app useful day-to-day.

## Status: Done

## Scope

Enhance `MonthDetailPage` with category breakdown, days remaining, and spending progress.

## Backend

### Enhanced Month Detail
- Extended `GET /v1/months/{id}` response to include:
  - `categoryBreakdown` — array of { categoryId, categoryName, total } sorted by total DESC
  - `daysRemaining` — days left in the month (0 if past, total days if future)
  - Existing: salary, totalSpent, plannedSpent, totalIncome, remaining

### Model Changes
- `MonthDetail` gained `CategoryBreakdown` (IReadOnlyList<CategoryBreakdownItem>) and `DaysRemaining` (int)
- `CategoryBreakdownItem` record — CategoryId, CategoryName, Total

### Repository Changes
- `GetByIdAsync` runs a second query grouping expenses by category
- `CalculateDaysRemaining` computed in C# for past/current/future month logic

## Frontend

### MonthDetailPage Enhancements
- **Summary cards** (existing): salary, total spent, recurring, extra income, remaining
- **New card**: days remaining
- **Category breakdown panel**: list showing each category's total spend with mini bars, sorted by amount
- **Progress bar**: visual indicator of spent vs salary percentage
- Spent percentage colour coding: green (<70%), amber (70-90%), red (>90%)

### New Components
- `SpendingProgressBar` — colour-coded spending progress bar
- `CategoryBreakdown` — category spending list with percentage bars

### i18n
- Added: `months.categoryBreakdown`, `months.noCategoryData`
- Existing: `months.daysRemaining`

## Definition of Done
- ✅ Month detail shows category-by-category spending totals
- ✅ Days remaining displays correctly (past=0, future=total days, current=remaining days)
- ✅ Spending progress bar with colour coding
- ✅ Manual verification in browser
