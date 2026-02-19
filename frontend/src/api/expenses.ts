import type {
  ExpenseWithCategory,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from "@shared/types/expense";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

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

export function deleteExpense(id: string): Promise<void> {
  return apiDelete(`/v1/expenses/${id}`);
}

export function getVendors(): Promise<string[]> {
  return apiGet<string[]>("/v1/expenses/vendors");
}
