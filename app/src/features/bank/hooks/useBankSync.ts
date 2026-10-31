import { useSyncExternalStore } from "react";
import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { syncBank } from "@/api/bank";
import { toast } from "@/components/ui/toast";
import type { SyncResult } from "@shared/types/bank";
import { invalidateBank } from "./invalidate";
import { pollAiJob, type AiJobOutcome } from "./pollAiJob";

export type BankSyncPhase = "idle" | "syncing" | "categorising";

const SYNC_MUTATION_KEY = ["bank", "sync"] as const;

// The phase lives outside React so it survives the Inbox unmounting mid-sync (tab switches), the
// same way useIsMutating keeps the busy state.
let currentPhase: Exclude<BankSyncPhase, "idle"> = "syncing";
const listeners = new Set<() => void>();
function setPhase(phase: Exclude<BankSyncPhase, "idle">) {
  currentPhase = phase;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const getPhase = () => currentPhase;

interface BankSyncOutcome {
  result: SyncResult;
  ai: AiJobOutcome | null;
}

/**
 * Syncs every enabled bank account, then waits for the AI to categorise what's new (the food app's
 * useAiSort). Runs as a mutation with a fixed key so it carries on, and the busy state shows, after
 * the user leaves the Inbox.
 */
export function useBankSync() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const runningCount = useIsMutating({ mutationKey: SYNC_MUTATION_KEY, exact: true });
  const runningPhase = useSyncExternalStore(subscribe, getPhase, getPhase);

  const mutation = useMutation({
    mutationKey: SYNC_MUTATION_KEY,
    mutationFn: async (connectionId?: string): Promise<BankSyncOutcome> => {
      setPhase("syncing");
      const result = await syncBank(connectionId);
      // New rows show straight away, uncategorised; the AI fills them in.
      void invalidateBank(queryClient);
      if (!result.jobId) return { result, ai: null };
      setPhase("categorising");
      const ai = await pollAiJob(result.jobId);
      return { result, ai };
    },
    onSuccess: ({ result, ai }) => {
      if (result.rateLimited) toast.error(t("bank.rateLimited"));
      if (result.expiredConnections > 0) toast.error(t("bank.connectionExpired"));
      if (result.failedConnections > 0) toast.error(t("bank.syncFailed"));
      if (ai === "failed" || ai === "timeout") toast.error(t("bank.aiFailed"));

      if (result.imported > 0) toast.success(t("bank.syncDone", { count: result.imported }));
      else if (result.cooldown) toast.success(t("bank.syncCooldown"));
      else if (!result.rateLimited && result.expiredConnections === 0 && result.failedConnections === 0)
        toast.success(t("bank.syncNothingNew"));
    },
    onError: (err) => {
      console.warn("Bank sync failed:", err);
      toast.error(t("common.error"));
    },
    onSettled: () => {
      setPhase("syncing");
      return invalidateBank(queryClient);
    },
  });

  const isRunning = runningCount > 0 || mutation.isPending;
  const phase: BankSyncPhase = isRunning ? runningPhase : "idle";

  const start = (connectionId?: string) => {
    // Read the mutation cache directly so a fast double tap (before the next render) can't start a
    // second sync.
    if (queryClient.isMutating({ mutationKey: SYNC_MUTATION_KEY, exact: true }) > 0) return;
    mutation.mutate(connectionId);
  };

  return { start, isRunning, phase };
}
