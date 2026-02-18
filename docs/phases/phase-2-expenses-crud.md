# Phase 2 — Expenses CRUD

The core feature. Without expenses, the app is useless.

## Status: Not Started

## Scope

Full expense management within a month: create, list, edit, delete expenses.

## Backend

### Models (`Models/Expense.cs`)
- `Expense` record — id, monthId, categoryId, itemName, amount, vendor, expenseDate, comment, isRecurringInstance, createdAt, updatedAt
- `ExpenseWithCategory` record — extends Expense with category name fields (nameEn, nameLt, name) for display
- `CreateExpenseRequest` — itemName, amount, categoryId, vendor?, expenseDate, comment?
- `UpdateExpenseRequest` — itemName?, amount?, categoryId?, vendor?, expenseDate?, comment?

### Service (`Services/IExpenseService.cs`, `Services/ExpenseService.cs`)
- `GetAllByMonthAsync(userId, monthId)` — returns expenses for a month with category info, ordered by expense_date DESC
- `GetByIdAsync(userId, expenseId)` — single expense with category info
- `CreateAsync(userId, monthId, request)` — insert, return with category
- `UpdateAsync(userId, expenseId, request)` — partial update, return with category
- `DeleteAsync(userId, expenseId)` — soft validation via row count

### Functions (`Functions/ExpenseFunctions.cs`)
- `GET /v1/months/{monthId}/expenses` — list all for month
- `POST /v1/months/{monthId}/expenses` — create expense in month
- `PUT /v1/expenses/{id}` — update expense
- `DELETE /v1/expenses/{id}` — delete expense

### Validation
- `amount > 0`
- `itemName` not empty
- `categoryId` must reference an existing category (system or user-owned)
- `expenseDate` must be a valid date
- Month must exist and belong to user

### Tests (`Functions/ExpenseFunctionsTests.cs`)
- GetAll returns expenses list
- Create with valid request returns 201
- Create with invalid amount returns 400
- Create with empty item name returns 400
- Update when exists returns 200
- Update when not found returns 404
- Delete when exists returns 204
- Delete when not found returns 404

## Frontend

### API Layer
- `api/expenses.ts` — fetchExpenses, createExpense, updateExpense, deleteExpense
- `features/expenses/hooks/useExpenses.ts` — TanStack Query hooks

### Components
- `ExpenseList` — table/list of expenses within MonthDetailPage
- `CreateExpenseDialog` — form: item name, amount, category (select), vendor, date, comment
- `EditExpenseDialog` — same form, pre-populated
- `ExpenseRow` — single row with inline edit/delete actions

### Pages
- No new pages. Expenses render inside `MonthDetailPage`.

### i18n
- Add: `expenses.editExpense`, `expenses.deleteExpense`, `expenses.confirmDelete`, `expenses.vendor`, `expenses.expenseDate`

## Categories API (read-only, needed for expense form)

### Backend
- `GET /v1/categories` — returns system categories + user's custom categories
- `ICategoryService.GetAllAsync(userId)` / `CategoryService`
- `CategoryFunctions.GetAll`

### Frontend
- `api/categories.ts` — fetchCategories
- `features/categories/hooks/useCategories.ts` — useCategories hook
- Category select component in expense form using `getCategoryDisplayName()`

## Definition of Done
- All backend unit tests pass
- `dotnet build` and `dotnet test` succeed
- Frontend builds without errors (`npm run build`, `npm run typecheck`, `npm run lint`)
- Expenses display in MonthDetailPage with category names
- Can create, edit, and delete expenses through the UI
- Category totals visible on month detail page
- Manual verification in browser
