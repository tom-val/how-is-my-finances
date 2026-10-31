import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMonths, getMonth, createMonth, updateMonth, deleteMonth } from "@/api/months";
import type { CreateMonthRequest, UpdateMonthRequest } from "@shared/types/month";

export function useMonths() {
  return useQuery({
    queryKey: ["months"],
    queryFn: getMonths,
  });
}

export function useMonth(id: string) {
  return useQuery({
    queryKey: ["months", id],
    queryFn: () => getMonth(id),
    enabled: !!id,
  });
}

export function useCreateMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateMonthRequest) => createMonth(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["months"] });
    },
  });
}

export function useUpdateMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateMonthRequest }) =>
      updateMonth(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["months"] });
      queryClient.invalidateQueries({ queryKey: ["months", variables.id] });
    },
  });
}

export function useDeleteMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMonth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["months"] });
    },
  });
}
