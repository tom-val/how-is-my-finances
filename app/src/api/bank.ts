import type {
  AcceptBankTransactionRequest,
  AcceptBankTransactionResponse,
  AcceptBulkResponse,
  AiJobStatus,
  Aspsp,
  BankAccount,
  BankConnection,
  BankTransaction,
  CompleteBankConnectionRequest,
  PendingCount,
  StartBankConnectionRequest,
  StartBankConnectionResponse,
  SyncResult,
  UploadBankNotificationsRequest,
  UploadBankNotificationsResponse,
} from "@shared/types/bank";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

/** TanStack Query keys for bank data; invalidate `bankKeys.all` after anything that changes the inbox. */
export const bankKeys = {
  all: ["bank"] as const,
  aspsps: (country: string) => ["bank", "aspsps", country] as const,
  connections: ["bank", "connections"] as const,
  transactions: ["bank", "transactions"] as const,
  pendingCount: ["bank", "pendingCount"] as const,
};

export function getAspsps(country: string): Promise<Aspsp[]> {
  return apiGet<Aspsp[]>(`/v1/bank/aspsps?country=${encodeURIComponent(country)}`);
}

export function getBankConnections(): Promise<BankConnection[]> {
  return apiGet<BankConnection[]>("/v1/bank/connections");
}

export function startBankConnection(request: StartBankConnectionRequest): Promise<StartBankConnectionResponse> {
  return apiPost<StartBankConnectionResponse>("/v1/bank/connections", request);
}

export function completeBankConnection(request: CompleteBankConnectionRequest): Promise<BankConnection> {
  return apiPost<BankConnection>("/v1/bank/connections/complete", request);
}

export function deleteBankConnection(id: string): Promise<void> {
  return apiDelete(`/v1/bank/connections/${id}`);
}

export function updateBankAccount(id: string, isEnabled: boolean): Promise<BankAccount> {
  return apiPatch<BankAccount>(`/v1/bank/accounts/${id}`, { isEnabled });
}

export function syncBank(connectionId?: string): Promise<SyncResult> {
  return apiPost<SyncResult>("/v1/bank/sync", connectionId ? { connectionId } : {});
}

export function getAiJob(jobId: string): Promise<AiJobStatus> {
  return apiGet<AiJobStatus>(`/v1/bank/ai-jobs/${jobId}`);
}

export function getPendingBankTransactions(): Promise<BankTransaction[]> {
  return apiGet<BankTransaction[]>("/v1/bank/transactions?status=pending");
}

export function getPendingCount(): Promise<PendingCount> {
  return apiGet<PendingCount>("/v1/bank/transactions/pending-count");
}

export function acceptBankTransaction(
  id: string,
  request: AcceptBankTransactionRequest,
): Promise<AcceptBankTransactionResponse> {
  return apiPost<AcceptBankTransactionResponse>(`/v1/bank/transactions/${id}/accept`, request);
}

export function dismissBankTransaction(id: string): Promise<void> {
  return apiPost<void>(`/v1/bank/transactions/${id}/dismiss`, {});
}

export function linkBankTransaction(id: string, expenseId: string): Promise<void> {
  return apiPost<void>(`/v1/bank/transactions/${id}/link`, { expenseId });
}

export function acceptBulkBankTransactions(ids: string[]): Promise<AcceptBulkResponse> {
  return apiPost<AcceptBulkResponse>("/v1/bank/transactions/accept-bulk", { ids });
}

export function uploadBankNotifications(
  request: UploadBankNotificationsRequest,
): Promise<UploadBankNotificationsResponse> {
  return apiPost<UploadBankNotificationsResponse>("/v1/bank/notifications", request);
}
