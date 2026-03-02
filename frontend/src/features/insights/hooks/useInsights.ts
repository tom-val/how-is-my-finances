import { useQuery } from "@tanstack/react-query";
import { getAnalytics, getAnalyticsExpenses } from "@/api/analytics";

export function useAnalytics(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  return useQuery({
    queryKey: ["analytics", startYear, startMonth, endYear, endMonth],
    queryFn: () => getAnalytics(startYear, startMonth, endYear, endMonth),
  });
}

export function useAnalyticsExpenses(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  categoryId?: string,
  vendor?: string,
) {
  return useQuery({
    queryKey: [
      "analyticsExpenses",
      startYear,
      startMonth,
      endYear,
      endMonth,
      categoryId,
      vendor,
    ],
    queryFn: () =>
      getAnalyticsExpenses(
        startYear,
        startMonth,
        endYear,
        endMonth,
        categoryId,
        vendor,
      ),
    enabled: categoryId !== undefined || vendor !== undefined,
  });
}
