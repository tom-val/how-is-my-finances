# Phase 3 — Categories Management

Allow users to create, edit, and delete categories. All categories are user-owned copies (no system categories — `is_system` was removed in DB migration).

## Status: Done

## Scope

Full CRUD for user categories. The only protection is `ON DELETE RESTRICT` from the expenses and recurring_expenses FK constraints.

## Backend

### Domain (`Domain/CategoryEntity.cs`)
- `ValidateName(string name)` — returns `Result<CategoryEntity>`, rejects empty/whitespace, trims input

### Repository (`Domain/ICategoryRepository.cs`, `Infrastructure/Repositories/CategoryRepository.cs`)
- `CreateAsync(userId, request)` — INSERT with RETURNING
- `UpdateAsync(userId, categoryId, request)` — UPDATE with WHERE on id AND user_id, returns null if not found
- `DeleteAsync(userId, categoryId)` — DELETE, lets `PostgresException(23503)` propagate on FK violation

### Functions (`Functions/CategoryFunctions.cs`)
- `POST /v1/categories` — create category, returns 201
- `PUT /v1/categories/{id}` — update category name, returns 200 or 404
- `DELETE /v1/categories/{id}` — delete category, returns 204, 404, or 409 (FK violation)

### Models
- `CreateCategoryRequest(string Name)`
- `UpdateCategoryRequest(string Name)`

### Validation
- Name must not be empty or whitespace
- Delete fails with 409 Conflict if category has associated expenses

### Tests
- `CategoryEntityTests` — ValidateName: valid, trims whitespace, empty, whitespace-only
- `CategoryFunctionsTests` — Create valid (201), Create empty name (400), Update exists (200), Update not found (404), Update empty name (400), Delete exists (204), Delete not found (404), Delete with expenses (409)

## Frontend

### API (`api/categories.ts`)
- `createCategory`, `updateCategory`, `deleteCategory` functions

### Hooks (`features/categories/hooks/useCategories.ts`)
- `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` mutation hooks with categories query invalidation

### Components (`features/categories/components/`)
- `CreateCategoryDialog` — ResponsiveDialog with name input, Plus icon trigger button
- `EditCategoryDialog` — Controlled dialog, pre-filled name
- `DeleteCategoryDialog` — Confirmation dialog with destructive confirm, shows 409 error message
- `CategoryCard` — Category name with edit (Pencil) + delete (Trash2) buttons

### Page (`features/categories/pages/CategoriesPage.tsx`)
- Title, create button, grid of CategoryCards

### Routing & Navigation
- `/categories` route in `router.tsx`
- Bottom nav: Categories item with `Grid2x2` icon between Months and Recurring
- Header: Categories desktop nav link between Months and Recurring

### i18n
- `categories.*` keys (title, name, addCategory, editCategory, deleteCategory, confirmDelete, noCategories, nameRequired)
- `nav.categories` key
- Both English and Lithuanian translations

## Definition of Done
- Backend tests pass (75/75)
- Frontend typecheck, lint, and build pass
- Can create custom categories
- Can edit category names
- Can delete categories without expenses
- Delete blocked with error message if category has expenses
- Categories page accessible via nav on both mobile and desktop
- Manual verification in browser
