// Bank integration API contract (Phase 10). The .NET records in
// backend/src/HowAreMyFinances.Api/Models/Bank.cs serialise to exactly these shapes (camelCase).

export type BankConnectionStatus = "pending" | "active" | "expired" | "revoked" | "failed";
export type BankReviewStatus = "pending" | "accepted" | "dismissed" | "linked";
export type BankTransactionSource = "enable_banking" | "notification";
export type BankDirection = "debit" | "credit";
export type BookingStatus = "booked" | "pending";
export type SuggestionSource = "rule" | "ai";
export type AiJobState = "pending" | "completed" | "failed";
export type BankClient = "web" | "native";

/** GET /v1/bank/aspsps?country=LT */
export interface Aspsp {
  name: string;
  country: string;
  logo: string | null;
  /** Longest consent the bank allows, in days (null if the bank doesn't say). */
  maximumConsentDays: number | null;
}

export interface BankAccount {
  id: string;
  ibanMasked: string | null;
  name: string | null;
  currency: string;
  isEnabled: boolean;
  syncedUntil: string | null; // YYYY-MM-DD
}

/** GET /v1/bank/connections */
export interface BankConnection {
  id: string;
  aspspName: string;
  aspspCountry: string;
  status: BankConnectionStatus;
  consentExpiresAt: string | null; // ISO timestamp
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  accounts: BankAccount[];
}

/** POST /v1/bank/connections */
export interface StartBankConnectionRequest {
  aspspName: string;
  aspspCountry: string;
  client: BankClient;
}

export interface StartBankConnectionResponse {
  /** Bank authorisation page to open (window.location on web, auth session on native). */
  redirectUrl: string;
}

/** POST /v1/bank/connections/complete — 200 with the BankConnection */
export interface CompleteBankConnectionRequest {
  code: string;
  state: string;
}

/** PATCH /v1/bank/accounts/{id} */
export interface UpdateBankAccountRequest {
  isEnabled: boolean;
}

/** POST /v1/bank/sync */
export interface SyncRequest {
  connectionId?: string;
}

/** 200 (no AI job) or 202 (jobId set). */
export interface SyncResult {
  imported: number;
  skipped: number;
  categorisedByRule: number;
  jobId: string | null;
  /** Connections skipped because they synced less than 5 minutes ago. */
  cooldown: boolean;
  /** Connections whose consent expired during this sync. */
  expiredConnections: number;
  /** Connections whose bank answered with an error; the message is on the connection (lastSyncError). */
  failedConnections: number;
  /** A bank answered with its rate limit; try again in a few hours. */
  rateLimited: boolean;
}

/** GET /v1/bank/ai-jobs/{jobId} */
export interface AiJobStatus {
  status: AiJobState;
  error: string | null;
}

/** GET /v1/bank/transactions?status=pending — only parse_status = 'parsed' rows */
export interface BankTransaction {
  id: string;
  source: BankTransactionSource;
  bankAccountId: string | null;
  direction: BankDirection;
  amount: number;
  currency: string;
  bookingDate: string; // YYYY-MM-DD
  bookingStatus: BookingStatus;
  counterpartyName: string | null;
  description: string | null;
  reviewStatus: BankReviewStatus;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  suggestedVendor: string | null;
  suggestionSource: SuggestionSource | null;
  possibleDuplicateExpenseId: string | null;
  possibleDuplicate: PossibleDuplicate | null;
}

export interface PossibleDuplicate {
  expenseId: string;
  itemName: string;
  amount: number;
  expenseDate: string;
}

/** GET /v1/bank/transactions/pending-count */
export interface PendingCount {
  count: number;
  /** Notifications uploaded but not yet read by the AI. */
  parsing: number;
}

/**
 * POST /v1/bank/transactions/{id}/accept
 * Debits create an expense (itemName + categoryId required); credits create an income (source required).
 */
export interface AcceptBankTransactionRequest {
  itemName?: string;
  categoryId?: string;
  vendor?: string;
  comment?: string;
  /** Defaults to bookingDate. */
  date?: string;
  /** Income source for credits. */
  source?: string;
}

export interface AcceptBankTransactionResponse {
  expenseId: string | null;
  incomeId: string | null;
  monthId: string;
}

/** POST /v1/bank/transactions/{id}/link */
export interface LinkBankTransactionRequest {
  expenseId: string;
}

/** POST /v1/bank/transactions/accept-bulk — accepts only ids that have a suggested category. */
export interface AcceptBulkRequest {
  ids: string[];
}

export interface AcceptBulkResponse {
  accepted: number;
  skipped: number;
}

/** POST /v1/bank/notifications (Android "Bank notifications" source) */
export interface BankNotificationInput {
  /** Stable id from the device: hash of the Android notification key + post time. */
  externalId: string;
  postedAt: string; // ISO timestamp
  title: string | null;
  text: string;
}

export interface UploadBankNotificationsRequest {
  notifications: BankNotificationInput[]; // at most 50, text at most 1000 chars
}

export interface UploadBankNotificationsResponse {
  received: number;
  jobId: string | null;
}
