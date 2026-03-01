import type {
  ExpenseWithCategory,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from "@shared/types/expense";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./client";

export function getExpenses(monthId: string): Promise<ExpenseWithCategory[]> {
  return apiGet<ExpenseWithCategory[]>(`/v1/months/${monthId}/expenses`);
}

export function createExpense(
  monthId: string,
  request: CreateExpenseRequest,
): Promise<ExpenseWithCategory> {
  return apiPost<ExpenseWithCategory>(
    `/v1/months/${monthId}/expenses`,
    request,
  );
}

export function updateExpense(
  id: string,
  request: UpdateExpenseRequest,
): Promise<ExpenseWithCategory> {
  return apiPut<ExpenseWithCategory>(`/v1/expenses/${id}`, request);
}

export function toggleExpenseComplete(
  id: string,
): Promise<ExpenseWithCategory> {
  return apiPatch<ExpenseWithCategory>(
    `/v1/expenses/${id}/toggle-complete`,
    {},
  );
}

export function deleteExpense(id: string): Promise<void> {
  return apiDelete(`/v1/expenses/${id}`);
}
