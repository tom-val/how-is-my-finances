import type { QueryClient } from "@tanstack/react-query";
import { bankKeys } from "@/api/bank";

/** Refresh the inbox, pending count and connections. */
export function invalidateBank(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: bankKeys.all });
}

/** After a suggestion becomes (or links to) an expense or income: the inbox and everything it feeds. */
export function invalidateAfterReview(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: bankKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["months"] }),
    queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    queryClient.invalidateQueries({ queryKey: ["incomes"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics"] }),
    queryClient.invalidateQueries({ queryKey: ["visibleVendors"] }),
    queryClient.invalidateQueries({ queryKey: ["vendors"] }),
  ]);
}
