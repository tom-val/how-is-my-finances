import { getAiJob } from "@/api/bank";
import { ApiError } from "@/api/client";

export const AI_JOB_POLL_INTERVAL_MS = 2000;
export const AI_JOB_POLL_TIMEOUT_MS = 2 * 60 * 1000;

/** How an AI job ended from the client's point of view. */
export type AiJobOutcome = "completed" | "failed" | "timeout";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls `GET /v1/bank/ai-jobs/{jobId}` every 2 s for up to 2 minutes (the food app's useAiSort loop).
 * Keeps polling through network blips and server errors; stops on a client error (unknown job,
 * forbidden), which counts as "failed". Never throws.
 */
export async function pollAiJob(
  jobId: string,
  { intervalMs = AI_JOB_POLL_INTERVAL_MS, timeoutMs = AI_JOB_POLL_TIMEOUT_MS } = {},
): Promise<AiJobOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(intervalMs);
    try {
      const job = await getAiJob(jobId);
      if (job.status === "completed") return "completed";
      if (job.status === "failed") {
        if (job.error) console.warn("AI job failed:", job.error);
        return "failed";
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : null;
      if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return "failed";
      }
    }
  }
  return "timeout";
}
