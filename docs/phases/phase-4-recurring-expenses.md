# Phase 4 — Recurring Expenses

Templates that auto-generate expenses when a new month is created. Matches the Excel pattern where fixed costs (rent, phone, internet, insurance) appear at the top of every month.

## Status: Done

## Scope

CRUD for recurring expense templates + auto-generation when creating a month.

## Backend

### Models (`Models/RecurringExpense.cs`)
- `RecurringExpense` record — id, userId, categoryId, itemName, amount, vendor, comment, dayOfMonth, isActive, createdAt, updatedAt
- `RecurringExpenseWithCategory` — extends with category name fields
- `CreateRecurringExpenseRequest` — itemName, amount, categoryId, vendor?, comment?, dayOfMonth
- `UpdateRecurringExpenseRequest` — itemName?, amount?, categoryId?, vendor?, comment?, dayOfMonth?, isActive?

### Service (`Services/IRecurringExpenseService.cs`, `Services/RecurringExpenseService.cs`)
- `GetAllAsync(userId)` — list all templates for user
- `CreateAsync(userId, request)` — create template
- `UpdateAsync(userId, id, request)` — partial update
- `DeleteAsync(userId, id)` — delete template

### Functions (`Functions/RecurringExpenseFunctions.cs`)
- `GET /v1/recurring-expenses` — list all
- `POST /v1/recurring-expenses` — create
- `PUT /v1/recurring-expenses/{id}` — update
- `DELETE /v1/recurring-expenses/{id}` — delete

### Auto-Generation
- When a month is created (`MonthService.CreateAsync`), query active recurring templates and insert them as expenses with `is_recurring_instance = true` and `recurring_expense_id` set
- Expense date = month start date (or `dayOfMonth` within that month)

### Validation
- `amount > 0`
- `dayOfMonth` between 1 and 28
- `itemName` not empty

### Tests
- CRUD tests (similar pattern to months/expenses)
- Auto-generation: creating a month with active templates creates corresponding expenses

## Frontend

### Pages
- `RecurringExpensesPage` — list of recurring templates (linked from nav)

### Components
- `RecurringExpenseCard` — shows template details with edit/delete/toggle active
- `CreateRecurringExpenseDialog` — form with category select, day of month input
- Active/inactive toggle

### Router
- Add `/recurring` route

### i18n
- Add: `recurring.title`, `recurring.addRecurring`, `recurring.dayOfMonth`, `recurring.active`, `recurring.inactive`, `recurring.noRecurring`

## Definition of Done
- Backend tests pass
- CRUD for recurring templates works via UI
- Creating a new month auto-generates expenses from active templates
- Recurring expenses display with a visual indicator in the expense list
- Manual verification in browser
