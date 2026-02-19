import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
} from "@/api/incomes";
import type {
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from "@shared/types/income";

export function useIncomes(monthId: string) {
  return useQuery({
    queryKey: ["incomes", monthId],
    queryFn: () => getIncomes(monthId),
    enabled: !!monthId,
  });
}

export function useCreateIncome(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateIncomeRequest) =>
      createIncome(monthId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
    },
  });
}

export function useUpdateIncome(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateIncomeRequest;
    }) => updateIncome(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
    },
  });
}

export function useDeleteIncome(monthId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", monthId] });
      queryClient.invalidateQueries({ queryKey: ["months", monthId] });
    },
  });
}
