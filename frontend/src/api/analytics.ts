import type { AnalyticsResponse } from "@shared/types/analytics";
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
