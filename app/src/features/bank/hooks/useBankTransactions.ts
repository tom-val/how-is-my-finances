import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptBankTransaction,
  acceptBulkBankTransactions,
  bankKeys,
  dismissBankTransaction,
  getPendingBankTransactions,
  getPendingCount,
  linkBankTransaction,
} from "@/api/bank";
import type { AcceptBankTransactionRequest } from "@shared/types/bank";
import { invalidateAfterReview, invalidateBank } from "./invalidate";

export function useBankTransactions() {
  return useQuery({
    queryKey: bankKeys.transactions,
    queryFn: getPendingBankTransactions,
    staleTime: 30 * 1000,
  });
}

/**
 * Pending suggestions for the Inbox badge. Refreshes every minute while the app is in the
 * foreground, and every few seconds while uploaded notifications are still being read.
 */
export function usePendingCount() {
  return useQuery({
    queryKey: bankKeys.pendingCount,
    queryFn: getPendingCount,
    staleTime: 30 * 1000,
    refetchInterval: (query) => ((query.state.data?.parsing ?? 0) > 0 ? 5 * 1000 : 60 * 1000),
  });
}

export function useAcceptBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AcceptBankTransactionRequest }) =>
      acceptBankTransaction(id, request),
    onSuccess: () => invalidateAfterReview(queryClient),
    // A 409 means someone (another device) already reviewed it: refresh either way.
    onError: () => invalidateBank(queryClient),
  });
}

export function useDismissBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissBankTransaction(id),
    onSettled: () => invalidateAfterReview(queryClient),
  });
}

export function useLinkBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expenseId }: { id: string; expenseId: string }) => linkBankTransaction(id, expenseId),
    onSettled: () => invalidateAfterReview(queryClient),
  });
}

export function useAcceptBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => acceptBulkBankTransactions(ids),
    onSettled: () => invalidateAfterReview(queryClient),
  });
}
