import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from "@/api/recurringExpenses";
import type {
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
} from "@shared/types/recurringExpense";

export function useRecurringExpenses() {
  return useQuery({
    queryKey: ["recurringExpenses"],
    queryFn: getRecurringExpenses,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRecurringExpenseRequest) =>
      createRecurringExpense(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringExpenses"] });
    },
  });
}

export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateRecurringExpenseRequest;
    }) => updateRecurringExpense(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringExpenses"] });
    },
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecurringExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringExpenses"] });
    },
  });
}
