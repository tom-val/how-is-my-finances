# Plan: Create Implementation Phase Documentation

## Task
Document all implementation phases and the Excel reference so future sessions can pick up any phase without re-analysing.

## Steps

1. **Analyse Excel file** (`Alga.xlsx`) — extract structure, patterns, categories, recurring expenses
2. **Write `docs/excel-reference.md`** — summary of Excel format, recurring expense patterns, categories, key observations
3. **Write 8 phase plan files** in `docs/phases/`:
   - Phase 1: Expenses CRUD (backend + frontend + categories read API)
   - Phase 2: Categories Management (custom category CRUD)
   - Phase 3: Recurring Expenses (templates + auto-generation)
   - Phase 4: Month Dashboard (category breakdown, per-day budget, progress)
   - Phase 5: Settings & Profile (language, currency, display name)
   - Phase 6: Notifications (spending threshold alerts)
   - Phase 7: Receipt OCR (premium — AI-powered receipt scanning)
   - Phase 8: Bank Integration (premium — OpenBanking auto-import)
4. **Update `CLAUDE.md`** — add phase table, update architecture section, add new directories to project structure
5. **Update `memory/MEMORY.md`** — record Lambda + Supabase learnings from infra work

## Files to Create
- `docs/excel-reference.md`
- `docs/phases/phase-1-expenses-crud.md`
- `docs/phases/phase-2-categories-management.md`
- `docs/phases/phase-3-recurring-expenses.md`
- `docs/phases/phase-4-month-dashboard.md`
- `docs/phases/phase-5-settings-profile.md`
- `docs/phases/phase-6-notifications.md`
- `docs/phases/phase-7-receipt-ocr.md`
- `docs/phases/phase-8-bank-integration.md`

## Files to Modify
- `CLAUDE.md` — phase overview table, architecture updates
- `memory/MEMORY.md` — new learnings
