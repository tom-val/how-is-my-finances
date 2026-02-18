# Plan: Create Implementation Phase Documentation

## Task
Document all implementation phases and the Excel reference so future sessions can pick up any phase without re-analysing.

## Steps

1. **Analyse Excel file** (`Alga.xlsx`) — extract structure, patterns, categories, recurring expenses
2. **Write `docs/excel-reference.md`** — summary of Excel format, recurring expense patterns, categories, key observations
3. **Write 9 phase plan files** in `docs/phases/`:
   - Phase 1: PWA & Mobile (mobile-first design, install experience, touch UX)
   - Phase 2: Expenses CRUD (backend + frontend + categories read API)
   - Phase 3: Categories Management (custom category CRUD)
   - Phase 4: Recurring Expenses (templates + auto-generation)
   - Phase 5: Month Dashboard (category breakdown, per-day budget, progress)
   - Phase 6: Settings & Profile (language, currency, display name)
   - Phase 7: Notifications (spending threshold alerts)
   - Phase 8: Receipt OCR (premium — AI-powered receipt scanning)
   - Phase 9: Bank Integration (premium — OpenBanking auto-import)
4. **Update `CLAUDE.md`** — add phase table, update architecture section, add new directories to project structure
5. **Update `memory/MEMORY.md`** — record Lambda + Supabase learnings from infra work

## Files to Create
- `docs/excel-reference.md`
- `docs/phases/phase-1-pwa-mobile.md`
- `docs/phases/phase-2-expenses-crud.md`
- `docs/phases/phase-3-categories-management.md`
- `docs/phases/phase-4-recurring-expenses.md`
- `docs/phases/phase-5-month-dashboard.md`
- `docs/phases/phase-6-settings-profile.md`
- `docs/phases/phase-7-notifications.md`
- `docs/phases/phase-8-receipt-ocr.md`
- `docs/phases/phase-9-bank-integration.md`

## Files to Modify
- `CLAUDE.md` — phase overview table, architecture updates
- `memory/MEMORY.md` — new learnings
