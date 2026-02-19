import type {
  Income,
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from "@shared/types/income";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function getIncomes(monthId: string): Promise<Income[]> {
  return apiGet<Income[]>(`/v1/months/${monthId}/incomes`);
}

export function createIncome(
  monthId: string,
  request: CreateIncomeRequest,
): Promise<Income> {
  return apiPost<Income>(`/v1/months/${monthId}/incomes`, request);
}

export function updateIncome(
  id: string,
  request: UpdateIncomeRequest,
): Promise<Income> {
  return apiPut<Income>(`/v1/incomes/${id}`, request);
}

export function deleteIncome(id: string): Promise<void> {
  return apiDelete(`/v1/incomes/${id}`);
}
