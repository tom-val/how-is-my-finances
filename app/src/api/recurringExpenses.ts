import type {
  RecurringExpenseWithCategory,
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
} from "@shared/types/recurringExpense";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function getRecurringExpenses(): Promise<
  RecurringExpenseWithCategory[]
> {
  return apiGet<RecurringExpenseWithCategory[]>("/v1/recurring-expenses");
}

export function createRecurringExpense(
  request: CreateRecurringExpenseRequest,
): Promise<RecurringExpenseWithCategory> {
  return apiPost<RecurringExpenseWithCategory>(
    "/v1/recurring-expenses",
    request,
  );
}

export function updateRecurringExpense(
  id: string,
  request: UpdateRecurringExpenseRequest,
): Promise<RecurringExpenseWithCategory> {
  return apiPut<RecurringExpenseWithCategory>(
    `/v1/recurring-expenses/${id}`,
    request,
  );
}

export function deleteRecurringExpense(id: string): Promise<void> {
  return apiDelete(`/v1/recurring-expenses/${id}`);
}
