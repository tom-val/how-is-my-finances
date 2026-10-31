import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { bankKeys, uploadBankNotifications } from "@/api/bank";
import { pollAiJob } from "@/features/bank/hooks/pollAiJob";
import type { BankNotificationInput } from "@shared/types/bank";
import * as BankNotifications from "../../../modules/bank-notifications";
import { getTransactionSource, isNotificationSourceSupported } from "./transactionSource";

const CHUNK_SIZE = 50;
const MAX_TEXT_LENGTH = 1000;

/**
 * Uploads bank notifications captured by the Android listener whenever the app becomes active
 * (including when it's opened from the "Payment detected" notification). Renders nothing.
 *
 * Each chunk is acknowledged only after the server accepts it, so a failed upload stays queued on
 * the device and is retried the next time the app comes to the foreground.
 */
export function NotificationUploader() {
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android" || !isNotificationSourceSupported()) return;

    // Keep the native capture flag in line with the stored choice (e.g. after an app update).
    BankNotifications.setCaptureEnabled(getTransactionSource() === "notifications");

    async function upload() {
      if (running.current) return;
      if (getTransactionSource() !== "notifications") return;
      if (!BankNotifications.isPermissionGranted()) return;

      running.current = true;
      try {
        const jobIds: string[] = [];
        let uploaded = false;

        const pending = BankNotifications.getPending();
        for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
          const chunk = pending.slice(i, i + CHUNK_SIZE);
          const notifications: BankNotificationInput[] = chunk.map((item) => ({
            externalId: item.externalId,
            postedAt: item.postedAt,
            title: item.title,
            text: item.text.slice(0, MAX_TEXT_LENGTH),
          }));

          const response = await uploadBankNotifications({ notifications });
          BankNotifications.acknowledge(chunk.map((item) => item.externalId));
          uploaded = true;
          if (response.jobId) jobIds.push(response.jobId);
        }

        if (!uploaded) return;
        // Show the "reading notifications" state straight away, then the parsed rows once the AI is done.
        await queryClient.invalidateQueries({ queryKey: bankKeys.all });
        if (jobIds.length > 0) {
          await Promise.all(jobIds.map((jobId) => pollAiJob(jobId)));
          await queryClient.invalidateQueries({ queryKey: bankKeys.all });
        }
      } catch (error) {
        // Left on the device queue; retried next time the app becomes active.
        console.warn("Bank notification upload failed", error);
      } finally {
        running.current = false;
      }
    }

    void upload();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void upload();
    });
    return () => subscription.remove();
  }, [queryClient]);

  return null;
}
