import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bankKeys,
  completeBankConnection,
  deleteBankConnection,
  getBankConnections,
  startBankConnection,
  updateBankAccount,
} from "@/api/bank";
import type {
  BankConnection,
  CompleteBankConnectionRequest,
  StartBankConnectionRequest,
} from "@shared/types/bank";
import { invalidateBank } from "./invalidate";

export function useBankConnections() {
  return useQuery({
    queryKey: bankKeys.connections,
    queryFn: getBankConnections,
    staleTime: 60 * 1000,
  });
}

export function useStartBankConnection() {
  return useMutation({
    mutationFn: (request: StartBankConnectionRequest) => startBankConnection(request),
  });
}

// One completion per state: on Android the auth session and the `finansai://bank/callback` deep
// link can both deliver the same redirect, and `complete` only accepts a state once.
const completions = new Map<string, Promise<BankConnection>>();

/** Calls `complete` once per `state`; a second caller gets the first call's promise. */
export function completeBankConnectionOnce(request: CompleteBankConnectionRequest): Promise<BankConnection> {
  const existing = completions.get(request.state);
  if (existing) return existing;
  const promise = completeBankConnection(request);
  completions.set(request.state, promise);
  // A failed attempt may be retried (e.g. after a network error).
  promise.catch(() => completions.delete(request.state));
  return promise;
}

export function useCompleteBankConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CompleteBankConnectionRequest) => completeBankConnectionOnce(request),
    onSettled: () => invalidateBank(queryClient),
  });
}

export function useDeleteBankConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBankConnection(id),
    onSuccess: () => invalidateBank(queryClient),
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => updateBankAccount(id, isEnabled),
    onSuccess: (account) => {
      queryClient.setQueryData<BankConnection[]>(bankKeys.connections, (connections) =>
        connections?.map((c) => ({
          ...c,
          accounts: c.accounts.map((a) => (a.id === account.id ? account : a)),
        })),
      );
      return invalidateBank(queryClient);
    },
  });
}
