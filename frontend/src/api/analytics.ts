import type {
  AnalyticsResponse,
  ExpenseSummary,
} from "@shared/types/analytics";
import { apiGet } from "./client";

export function getAnalytics(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Promise<AnalyticsResponse> {
  return apiGet<AnalyticsResponse>(
    `/v1/analytics?startYear=${startYear}&startMonth=${startMonth}&endYear=${endYear}&endMonth=${endMonth}`,
  );
}

export function getAnalyticsExpenses(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  categoryId?: string,
  vendor?: string,
): Promise<ExpenseSummary[]> {
  const params = new URLSearchParams({
    startYear: String(startYear),
    startMonth: String(startMonth),
    endYear: String(endYear),
    endMonth: String(endMonth),
  });
  if (categoryId) params.set("categoryId", categoryId);
  if (vendor) params.set("vendor", vendor);
  return apiGet<ExpenseSummary[]>(`/v1/analytics/expenses?${params}`);
}
