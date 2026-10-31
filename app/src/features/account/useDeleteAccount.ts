import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { deleteAccount } from "@/api/account";
import { setTransactionSource } from "@/features/notifications/transactionSource";
import { acknowledge, getPending } from "../../../modules/bank-notifications";
import { supabase } from "@/lib/supabase";

/**
 * Deletes the account on the server, then forgets everything on this device: the session, cached
 * queries, and (Android) the notification capture and any notifications still queued for upload.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      setTransactionSource("bank");
      const pending = getPending();
      if (pending.length > 0) acknowledge(pending.map((n) => n.externalId));
      queryClient.clear();
      // The user no longer exists server-side, so only drop the local session.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      router.replace("/login");
    },
  });
}
