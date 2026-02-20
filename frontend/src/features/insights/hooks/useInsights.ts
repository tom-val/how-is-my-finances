import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/api/analytics";

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
