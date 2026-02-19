import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getVendors,
} from "@/api/expenses";
import type {
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from "@shared/types/expense";

export function useExpenses(monthId: string) {
  return useQuery({
    queryKey: ["expenses", monthId],
    queryFn: () => getExpenses(monthId),
    enabled: !!monthId,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExpense(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateExpenseRequest) =>
      createExpense(monthId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateExpense(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateExpenseRequest }) =>
      updateExpense(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteExpense(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
    },
  });
}
