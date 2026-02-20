import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHiddenVendors, setHiddenVendors } from "@/api/vendors";

export function useHiddenVendors() {
  return useQuery({
    queryKey: ["hiddenVendors"],
    queryFn: getHiddenVendors,
  });
}

export function useSetHiddenVendors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setHiddenVendors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiddenVendors"] });
      // Also invalidate the active vendors list so the combobox updates
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
