# Phase 2 — Categories Management

Allow users to create, edit, and delete custom categories beyond the 25 system-seeded ones.

## Status: Not Started

## Scope

CRUD for user-created categories. System categories are read-only.

## Backend

### Service (`Services/ICategoryService.cs` — extend from Phase 1)
- `CreateAsync(userId, request)` — create user category (is_system = false, user_id = current user)
- `UpdateAsync(userId, categoryId, request)` — update name/icon, reject if is_system
- `DeleteAsync(userId, categoryId)` — delete if is_system = false, reject if category has expenses (RESTRICT FK)

### Functions (`Functions/CategoryFunctions.cs` — extend from Phase 1)
- `POST /v1/categories` — create custom category
- `PUT /v1/categories/{id}` — update custom category
- `DELETE /v1/categories/{id}` — delete custom category (fails if in use)

### Models
- `CreateCategoryRequest` — name (string)
- `UpdateCategoryRequest` — name? (string)

### Validation
- Cannot modify or delete system categories
- Name must not be empty
- Delete fails with 409 if category has associated expenses

### Tests
- Create returns 201
- Create with empty name returns 400
- Update system category returns 403
- Delete system category returns 403
- Delete category with expenses returns 409

## Frontend

### Components
- Categories management section (could be a page or within settings)
- `CreateCategoryDialog` — name input
- Category list showing system (read-only) and custom (editable/deletable)
- Delete confirmation with warning if category is in use

### i18n
- Add: `categories.title`, `categories.addCategory`, `categories.editCategory`, `categories.deleteCategory`, `categories.systemCategory`, `categories.cannotDeleteInUse`

## Definition of Done
- Backend tests pass
- Can create custom categories and use them in expenses
- Cannot modify/delete system categories
- Delete blocked if category has expenses
- Manual verification in browser
