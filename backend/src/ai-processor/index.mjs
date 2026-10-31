import pg from "pg";

// AI processor for the bank integration (docs/phases/phase-9-bank-integration.md, "AI Processor").
// Ported from how-is-my-food-planning/backend/src/ai-processor. Consumes SQS messages
// { jobId, type } sent by the .NET API and processes the matching ai_jobs row:
// - "categorise_bank_transactions": suggests a category and vendor for imported bank transactions;
// - "parse_bank_notifications": reads Android bank-app notifications into transactions (amount,
//   direction, counterparty, date) and suggests a category and vendor in the same call.
//
// Privacy: only category names, counterparty/description/MCC/amount (bank) or the notification
// title/text/post time are sent to OpenAI. Never IBANs, account names, balances or user ids.

export const CATEGORISE_MODEL = "gpt-6-luna";
export const CATEGORISE_MAX_OUTPUT_TOKENS = 8000;

// Defensive caps; the API already sends far fewer per job.
export const CATEGORISE_MAX_ITEMS = 200;
export const NOTIFICATIONS_MAX_ITEMS = 200;

export const JOB_CATEGORISE = "categorise_bank_transactions";
export const JOB_PARSE_NOTIFICATIONS = "parse_bank_notifications";

export const VENDOR_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 140;
const COUNTERPARTY_MAX_LENGTH = 140;
const NOTIFICATION_TITLE_MAX_LENGTH = 200;
const NOTIFICATION_TEXT_MAX_LENGTH = 1000;
const NOTIFICATION_DATE_WINDOW_DAYS = 7;
// NUMERIC(12, 2) holds at most 9 999 999 999.99.
const MAX_AMOUNT = 9_999_999_999.99;
// Bank-app notifications are for a Lithuanian bank, so "the day it was posted" is the Vilnius day.
const NOTIFICATION_TIME_ZONE = "Europe/Vilnius";

/**
 * Parse an Npgsql-style connection string into pg Pool config.
 * Format: "Host=...;Port=...;Database=...;Username=...;Password=...;SSL Mode=Require;..."
 */
export function parseNpgsqlConnectionString(connStr) {
  const params = {};
  for (const part of (connStr ?? "").split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const value = part.slice(eqIdx + 1).trim();
    params[key] = value;
  }

  return {
    host: params.host,
    port: parseInt(params.port || "5432", 10),
    database: params.database,
    user: params.username,
    password: params.password,
    ssl: params["ssl mode"]?.toLowerCase() === "require" ? { rejectUnauthorized: false } : false,
  };
}

export const COUNTERPARTY_KEY_MAX_LENGTH = 200;

/**
 * Normalised counterparty key, used to remember "this counterparty → this category/vendor"
 * in bank_counterparty_rules. A port of CounterpartyKey.Normalise in
 * backend/src/HowAreMyFinances.Api/Domain/CounterpartyKey.cs and it must stay identical (the sync
 * computes keys for bank rows, this computes them for notification rows, and rules match on both):
 * 1. trim and lower-case;
 * 2. replace card masks (digits around one or more "*": "*1234", "516793******1234") with a space;
 * 3. remove runs of 3 or more digits (store numbers, terminal ids, references) without a space,
 *    so "MAXIMA LT X123 VILNIUS" → "maxima lt x vilnius";
 * 4. collapse whitespace and trim;
 * 5. cap at 200 characters (trimming trailing whitespace).
 * Returns null when nothing is left. \p{Nd} matches .NET's Unicode-aware \d.
 */
export function counterpartyKey(name) {
  if (typeof name !== "string" || name.trim() === "") return null;
  let key = name
    .trim()
    .toLowerCase()
    .replace(/\p{Nd}*\*+\p{Nd}*/gu, " ")
    .replace(/\p{Nd}{3,}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (key === "") return null;
  if (key.length > COUNTERPARTY_KEY_MAX_LENGTH) key = key.slice(0, COUNTERPARTY_KEY_MAX_LENGTH).trimEnd();
  return key;
}

const CATEGORISE_SYSTEM_PROMPT = `You are a personal finance assistant. You assign bank card payments and transfers
to the user's own spending categories.

You will receive JSON with a list of categories and a list of transactions, each identified by a numeric index.
Each transaction has: direction ("debit" = money out, "credit" = money in), counterparty (merchant or payee name
as the bank shows it), description (bank remittance text), mcc (merchant category code, may be null) and amount in EUR.
Names may be in Lithuanian or English, abbreviated, or contain store numbers and city names.

For EVERY transaction:
- Choose the single category that fits best. Judge by what the merchant sells or what the payment is for,
  e.g. "MAXIMA", "IKI", "RIMI", "LIDL" are supermarkets; "CIRCLE K", "VIADA" are fuel stations; "BOLT" may be
  rides or food delivery. Use the description and mcc to disambiguate.
- If no category reasonably fits, use null. Do not force a poor match. Credits always get category null.
- Also return "vendor": a short, clean merchant name in its usual brand spelling (e.g. "Maxima", "Circle K"),
  or null if unclear.
- Refer to transactions and categories ONLY by their numeric index.

ALWAYS respond with valid JSON matching this exact schema:
{"assignments":[{"item":0,"category":2,"vendor":"Maxima"},{"item":1,"category":null,"vendor":null}]}

Rules:
- "item" must be a transaction index from the input; "category" a category index or null.
- "vendor" must be a string of at most 60 characters or null.
- Include each transaction exactly once.
- Always return valid JSON, nothing else`;

const NOTIFICATIONS_SYSTEM_PROMPT = `You are a personal finance assistant. You read push notifications from a Lithuanian bank's
mobile app and turn the ones that describe money movements into transactions.

You will receive JSON with a list of the user's spending categories and a list of notifications, each identified by
a numeric index. Each notification has: postedAt (when the phone received it, ISO 8601), title and text.
Notifications may be in Lithuanian or English.

For EVERY notification decide whether it describes a single completed or reserved money movement:
- Card payments, purchases, cash withdrawals, direct debits and outgoing transfers are "debit".
- Incoming transfers, refunds and salary are "credit".
- Login or confirmation codes, security alerts, marketing, balance-only messages, failed or declined payments
  are NOT transactions: return "isTransaction": false and nothing else is needed.

For each transaction return:
- "direction": "debit" or "credit";
- "amount": the amount as a positive number (use a dot for decimals, e.g. 12.5 for "12,50 EUR");
- "currency": the ISO 4217 code (e.g. "EUR");
- "counterparty": the merchant or payee/payer name exactly as written in the notification, or null;
- "date": the transaction date as "YYYY-MM-DD"; if the notification shows no date, use the postedAt date;
- "category": for debits, the index of the single best-fitting category, or null if none reasonably fits
  (do not force a poor match); always null for credits. Judge by what the merchant sells, e.g. "MAXIMA",
  "IKI", "RIMI", "LIDL" are supermarkets; "CIRCLE K", "VIADA" are fuel stations;
- "vendor": a short, clean brand name in its usual spelling (e.g. "Maxima", "Circle K"), or null if unclear.

Refer to notifications and categories ONLY by their numeric index.

ALWAYS respond with valid JSON matching this exact schema:
{"results":[{"item":0,"isTransaction":true,"direction":"debit","amount":12.5,"currency":"EUR","counterparty":"MAXIMA LT X123","date":"2026-10-30","category":2,"vendor":"Maxima"},{"item":1,"isTransaction":false}]}

Rules:
- "item" must be a notification index from the input; "category" a category index or null.
- "vendor" must be a string of at most 60 characters or null.
- Include each notification exactly once.
- Always return valid JSON, nothing else`;

/**
 * SQS handler. Each record is { jobId, type }; batch_size is 1 but every record is handled.
 * Errors are recorded on the job (failJob) rather than rethrown, so SQS does not redeliver.
 */
export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    let body;
    try {
      body = JSON.parse(record.body);
    } catch {
      console.error("[AiProcessor] Ignoring message with a malformed body.");
      continue;
    }

    const jobId = body?.jobId;
    const jobType = body?.type;
    if (typeof jobId !== "string" || jobId === "") {
      console.error("[AiProcessor] Ignoring message without a jobId.");
      continue;
    }
    console.log(`[AiProcessor] Processing job ${jobId} (type: ${jobType})`);

    const pool = new pg.Pool(parseNpgsqlConnectionString(process.env.DB_CONNECTION_STRING));

    try {
      if (jobType === JOB_CATEGORISE) {
        await processCategoriseJob(pool, jobId);
      } else if (jobType === JOB_PARSE_NOTIFICATIONS) {
        await processNotificationJob(pool, jobId);
      } else {
        throw new Error(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      console.error(`[AiProcessor] Job ${jobId} failed:`, error.message);
      await failJob(pool, jobId, error);
    } finally {
      await pool.end();
    }
  }
};

// ---------------------------------------------------------------------------------------------
// categorise_bank_transactions
// ---------------------------------------------------------------------------------------------

async function processCategoriseJob(pool, jobId) {
  const job = await loadPendingJob(pool, jobId, JOB_CATEGORISE);
  if (!job) return;

  const { categories, transactions } = readCategoriseRequest(job.request_body);

  if (categories.length === 0 || transactions.length === 0) {
    await completeJob(pool, jobId, { suggested: 0, rules: 0 });
    console.log(`[AiProcessor] Job ${jobId} completed: nothing to categorise.`);
    return;
  }

  const outputText = await callOpenAiJson({
    model: CATEGORISE_MODEL,
    instructions: CATEGORISE_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content:
          "Assign each transaction to the best-fitting category. Respond in JSON format.\n\n" +
          JSON.stringify(buildCategorisePromptInput(categories, transactions)),
      },
    ],
    maxOutputTokens: CATEGORISE_MAX_OUTPUT_TOKENS,
  });

  const assignments = parseAssignments(JSON.parse(extractJson(outputText)), categories, transactions);
  const { suggested, rules } = await saveSuggestions(pool, job.user_id, assignments);

  await completeJob(pool, jobId, { suggested, rules });
  console.log(
    `[AiProcessor] Job ${jobId} completed: ${suggested} of ${transactions.length} transactions suggested, ${rules} rules upserted.`,
  );
}

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isIndex = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

/** Trims, collapses whitespace and caps a string; anything else (or an empty result) → null. */
function cleanString(value, maxLength) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned === "") return null;
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function readCategories(requestBody) {
  return (Array.isArray(requestBody?.categories) ? requestBody.categories : [])
    .filter((c) => isNonEmptyString(c?.id) && isNonEmptyString(c?.name))
    .map((c) => ({ id: c.id, name: c.name.trim() }));
}

/**
 * Reads the categorise job request body
 * ({ categories: [{ id, name }], transactions: [{ id, counterpartyKey, direction, counterparty, description, mcc, amount }] }),
 * dropping malformed entries and capping the number of transactions.
 */
export function readCategoriseRequest(requestBody) {
  const categories = readCategories(requestBody);

  const transactions = (Array.isArray(requestBody?.transactions) ? requestBody.transactions : [])
    .filter((t) => isNonEmptyString(t?.id) && (t.direction === "debit" || t.direction === "credit"))
    .map((t) => ({
      id: t.id,
      counterpartyKey: isNonEmptyString(t.counterpartyKey) ? t.counterpartyKey : null,
      direction: t.direction,
      counterparty: cleanString(t.counterparty, COUNTERPARTY_MAX_LENGTH),
      description: cleanString(t.description, DESCRIPTION_MAX_LENGTH),
      mcc: cleanString(typeof t.mcc === "number" ? String(t.mcc) : t.mcc, 10),
      amount: typeof t.amount === "number" && Number.isFinite(t.amount) ? t.amount : null,
    }))
    .filter((t) => t.counterparty !== null || t.description !== null)
    .slice(0, CATEGORISE_MAX_ITEMS);

  return { categories, transactions };
}

/** The exact payload sent to OpenAI: names and transaction text only, referenced by index. */
export function buildCategorisePromptInput(categories, transactions) {
  return {
    categories: categories.map((c, index) => ({ index, name: c.name })),
    transactions: transactions.map((t, index) => ({
      index,
      direction: t.direction,
      counterparty: t.counterparty,
      description: t.description,
      mcc: t.mcc,
      amount: t.amount,
    })),
  };
}

/** A vendor is a trimmed string of at most VENDOR_MAX_LENGTH characters; anything else → null. */
function readVendor(value) {
  if (typeof value !== "string") return null;
  const vendor = value.replace(/\s+/g, " ").trim();
  return vendor === "" || vendor.length > VENDOR_MAX_LENGTH ? null : vendor;
}

/**
 * Strictly validates the model output ({"assignments":[{"item":0,"category":2,"vendor":"Maxima"}, ...]}).
 * Only integer indices in range are accepted ("category" may be null = no fit); anything else drops
 * the assignment. The first valid assignment per transaction wins. Credits never get a category.
 * An invalid vendor (not a string, empty, over 60 characters) becomes null but keeps the category.
 * Returns [{ id, categoryId | null, vendor | null }]; transactions the model skipped are absent.
 */
export function parseAssignments(parsed, categories, transactions) {
  const assignments = Array.isArray(parsed?.assignments) ? parsed.assignments : [];
  const seen = new Set();
  const result = [];

  for (const assignment of assignments) {
    if (!isIndex(assignment?.item, transactions.length)) continue;

    const category = assignment.category;
    if (category !== null && !isIndex(category, categories.length)) continue;

    const transaction = transactions[assignment.item];
    if (seen.has(transaction.id)) continue;
    seen.add(transaction.id);

    result.push({
      id: transaction.id,
      categoryId: category === null || transaction.direction !== "debit" ? null : categories[category].id,
      vendor: readVendor(assignment.vendor),
    });
  }

  return result;
}

/**
 * Writes the AI suggestions in a single statement:
 * - updates only the job user's rows that are still pending review and have no suggestion yet
 *   (a rule or a previous job may have filled them in meanwhile);
 * - a category is only used if it still exists for that user and is not archived (one may be
 *   deleted while the job runs; FOR KEY SHARE makes a concurrent delete either wait for us or be
 *   seen as gone), and only for debits;
 * - rows with neither a usable category nor a vendor are left untouched;
 * - upserts source='ai' counterparty rules from the updated rows (key and direction come from the
 *   row itself), never overwriting manual rules.
 * Returns { suggested, rules }.
 */
export async function saveSuggestions(db, userId, assignments) {
  if (assignments.length === 0) return { suggested: 0, rules: 0 };

  const result = await db.query(
    `WITH input AS (
       SELECT i.id, i.category_id, NULLIF(btrim(i.vendor), '') AS vendor
       FROM unnest($2::uuid[], $3::uuid[], $4::text[]) AS i(id, category_id, vendor)
     ),
     valid_categories AS (
       SELECT c.id
       FROM categories c
       WHERE c.user_id = $1::uuid
         AND c.is_archived = false
         AND c.id IN (SELECT category_id FROM input WHERE category_id IS NOT NULL)
       FOR KEY SHARE OF c
     ),
     resolved AS (
       SELECT input.id, vc.id AS category_id, input.vendor
       FROM input
       LEFT JOIN valid_categories vc ON vc.id = input.category_id
     ),
     updated AS (
       UPDATE bank_transactions bt
       SET suggested_category_id = CASE WHEN bt.direction = 'debit' THEN r.category_id END,
           suggested_vendor = r.vendor,
           suggestion_source = 'ai'
       FROM resolved r
       WHERE bt.id = r.id
         AND bt.user_id = $1::uuid
         AND bt.parse_status = 'parsed'
         AND bt.review_status = 'pending'
         AND bt.suggestion_source IS NULL
         AND ((bt.direction = 'debit' AND r.category_id IS NOT NULL) OR r.vendor IS NOT NULL)
       RETURNING bt.counterparty_key, bt.direction, bt.suggested_category_id, bt.suggested_vendor
     ),
     rules AS (
       INSERT INTO bank_counterparty_rules (user_id, counterparty_key, direction, category_id, vendor, source, updated_at)
       SELECT DISTINCT ON (u.counterparty_key, u.direction)
              $1::uuid, u.counterparty_key, u.direction, u.suggested_category_id, u.suggested_vendor, 'ai', now()
       FROM updated u
       WHERE u.counterparty_key IS NOT NULL
         AND u.counterparty_key <> ''
         AND ((u.direction = 'debit' AND u.suggested_category_id IS NOT NULL)
              OR (u.direction = 'credit' AND u.suggested_vendor IS NOT NULL))
       ORDER BY u.counterparty_key, u.direction
       ON CONFLICT (user_id, counterparty_key, direction) DO UPDATE
       SET category_id = EXCLUDED.category_id, vendor = EXCLUDED.vendor, source = 'ai', updated_at = now()
       WHERE bank_counterparty_rules.source <> 'manual'
       RETURNING 1
     )
     SELECT (SELECT count(*) FROM updated)::int AS suggested, (SELECT count(*) FROM rules)::int AS rules`,
    [
      userId,
      assignments.map((a) => a.id),
      assignments.map((a) => a.categoryId),
      assignments.map((a) => a.vendor),
    ],
  );

  return { suggested: result.rows[0].suggested, rules: result.rows[0].rules };
}

// ---------------------------------------------------------------------------------------------
// parse_bank_notifications
// ---------------------------------------------------------------------------------------------

async function processNotificationJob(pool, jobId) {
  const job = await loadPendingJob(pool, jobId, JOB_PARSE_NOTIFICATIONS);
  if (!job) return;

  const { categories, notifications } = readNotificationRequest(job.request_body);

  if (notifications.length === 0) {
    await completeJob(pool, jobId, { parsed: 0, notTransaction: 0, failed: 0 });
    console.log(`[AiProcessor] Job ${jobId} completed: no notifications to parse.`);
    return;
  }

  const outputText = await callOpenAiJson({
    model: CATEGORISE_MODEL,
    instructions: NOTIFICATIONS_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content:
          "Read each notification and categorise the transactions. Respond in JSON format.\n\n" +
          JSON.stringify(buildNotificationPromptInput(categories, notifications)),
      },
    ],
    maxOutputTokens: CATEGORISE_MAX_OUTPUT_TOKENS,
  });

  const results = parseNotificationResults(JSON.parse(extractJson(outputText)), categories, notifications);
  const summary = await saveNotificationResults(pool, job.user_id, results);

  await completeJob(pool, jobId, summary);
  console.log(
    `[AiProcessor] Job ${jobId} completed: ${summary.parsed} parsed, ${summary.notTransaction} not transactions, ${summary.failed} failed, ${summary.rules} rules upserted.`,
  );
}

/**
 * Reads the notification job request body
 * ({ categories: [{ id, name }], notifications: [{ id, postedAt, title, text }] }),
 * dropping malformed entries (no id, unparseable postedAt, no text at all) and capping the count.
 */
export function readNotificationRequest(requestBody) {
  const categories = readCategories(requestBody);

  const notifications = (Array.isArray(requestBody?.notifications) ? requestBody.notifications : [])
    .filter((n) => isNonEmptyString(n?.id) && typeof n.postedAt === "string" && !Number.isNaN(Date.parse(n.postedAt)))
    .map((n) => ({
      id: n.id,
      postedAt: new Date(n.postedAt).toISOString(),
      title: cleanString(n.title, NOTIFICATION_TITLE_MAX_LENGTH),
      text: cleanString(n.text, NOTIFICATION_TEXT_MAX_LENGTH),
    }))
    .filter((n) => n.title !== null || n.text !== null)
    .slice(0, NOTIFICATIONS_MAX_ITEMS);

  return { categories, notifications };
}

/** The exact payload sent to OpenAI: category names and notification content, referenced by index. */
export function buildNotificationPromptInput(categories, notifications) {
  return {
    categories: categories.map((c, index) => ({ index, name: c.name })),
    notifications: notifications.map((n, index) => ({
      index,
      postedAt: n.postedAt,
      title: n.title,
      text: n.text,
    })),
  };
}

/** The calendar day (YYYY-MM-DD) of an instant in the bank's time zone. */
export function localDate(isoInstant) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NOTIFICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoInstant));
}

/** Days since the epoch for a valid "YYYY-MM-DD" calendar date, else null. */
function epochDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return time / 86_400_000;
}

/** A positive amount with at most 2 decimals that fits NUMERIC(12, 2), as a "0.00" string; else null. */
function readAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) return null; // more than 2 decimals
  if (cents <= 0 || cents / 100 > MAX_AMOUNT) return null;
  return (cents / 100).toFixed(2);
}

function readCurrency(value) {
  if (typeof value !== "string") return "EUR";
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "EUR";
}

/**
 * Strictly validates the model output for a notification job and returns exactly one outcome per
 * input notification, in input order:
 * - { id, status: "parsed", direction, amount ("12.50"), currency, date, counterparty, counterpartyKey, categoryId, vendor }
 * - { id, status: "not_transaction" }
 * - { id, status: "failed" } — the model skipped it, or its answer was invalid.
 * Results with an out-of-range or non-integer "item" are ignored; the first one per notification wins.
 * The date must be a valid YYYY-MM-DD within ±7 days of the postedAt day, otherwise the postedAt day is used.
 * An invalid category index only drops the category; credits never get one.
 */
export function parseNotificationResults(parsed, categories, notifications) {
  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const outcomes = new Map();

  for (const entry of results) {
    if (!isIndex(entry?.item, notifications.length)) continue;
    const notification = notifications[entry.item];
    if (outcomes.has(notification.id)) continue;
    outcomes.set(notification.id, readNotificationOutcome(entry, notification, categories));
  }

  return notifications.map((n) => outcomes.get(n.id) ?? { id: n.id, status: "failed" });
}

function readNotificationOutcome(entry, notification, categories) {
  const failed = { id: notification.id, status: "failed" };

  if (entry.isTransaction === false) return { id: notification.id, status: "not_transaction" };
  if (entry.isTransaction !== true) return failed;

  const direction = entry.direction;
  if (direction !== "debit" && direction !== "credit") return failed;

  const amount = readAmount(entry.amount);
  if (amount === null) return failed;

  const postedDate = localDate(notification.postedAt);
  const day = epochDay(entry.date);
  const date =
    day !== null && Math.abs(day - epochDay(postedDate)) <= NOTIFICATION_DATE_WINDOW_DAYS ? entry.date : postedDate;

  const counterparty = cleanString(entry.counterparty, COUNTERPARTY_MAX_LENGTH);
  const categoryId =
    direction === "debit" && isIndex(entry.category, categories.length) ? categories[entry.category].id : null;

  return {
    id: notification.id,
    status: "parsed",
    direction,
    amount,
    currency: readCurrency(entry.currency),
    date,
    counterparty,
    counterpartyKey: counterpartyKey(counterparty),
    categoryId,
    vendor: readVendor(entry.vendor),
  };
}

/**
 * Saves notification outcomes in one transaction. Only the job user's notification rows that are
 * still parse_status = 'pending' are touched.
 * 1. parsed rows get the money fields and the AI suggestion (category only if it still exists for
 *    the user and is not archived; FOR KEY SHARE as in saveSuggestions);
 * 2. an existing MANUAL counterparty rule for the same key and direction beats the AI suggestion;
 * 3. possible_duplicate_expense_id = the user's closest expense with the same amount within ±3 days;
 * 4. source='ai' rules are upserted from rows that kept the AI suggestion (never over manual rules);
 * 5. other rows become 'not_transaction' or 'failed'.
 */
export async function saveNotificationResults(pool, userId, results) {
  const parsed = results.filter((r) => r.status === "parsed");
  const notTransactionIds = results.filter((r) => r.status === "not_transaction").map((r) => r.id);
  const failedIds = results.filter((r) => r.status === "failed").map((r) => r.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let parsedIds = [];
    if (parsed.length > 0) {
      const updated = await client.query(
        `WITH input AS (
           SELECT *
           FROM unnest($2::uuid[], $3::text[], $4::numeric[], $5::text[], $6::date[], $7::text[], $8::text[], $9::uuid[], $10::text[])
             AS i(id, direction, amount, currency, booking_date, counterparty_name, counterparty_key, category_id, vendor)
         ),
         valid_categories AS (
           SELECT c.id
           FROM categories c
           WHERE c.user_id = $1::uuid
             AND c.is_archived = false
             AND c.id IN (SELECT category_id FROM input WHERE category_id IS NOT NULL)
           FOR KEY SHARE OF c
         ),
         resolved AS (
           SELECT input.*, CASE WHEN input.direction = 'debit' THEN vc.id END AS valid_category_id
           FROM input
           LEFT JOIN valid_categories vc ON vc.id = input.category_id
         )
         UPDATE bank_transactions bt
         SET parse_status = 'parsed',
             direction = r.direction,
             amount = r.amount,
             currency = r.currency,
             booking_date = r.booking_date,
             counterparty_name = r.counterparty_name,
             counterparty_key = r.counterparty_key,
             suggested_category_id = r.valid_category_id,
             suggested_vendor = r.vendor,
             suggestion_source = CASE WHEN r.valid_category_id IS NOT NULL OR r.vendor IS NOT NULL THEN 'ai' END
         FROM resolved r
         WHERE bt.id = r.id
           AND bt.user_id = $1::uuid
           AND bt.source = 'notification'
           AND bt.parse_status = 'pending'
         RETURNING bt.id`,
        [
          userId,
          parsed.map((r) => r.id),
          parsed.map((r) => r.direction),
          parsed.map((r) => r.amount),
          parsed.map((r) => r.currency),
          parsed.map((r) => r.date),
          parsed.map((r) => r.counterparty),
          parsed.map((r) => r.counterpartyKey),
          parsed.map((r) => r.categoryId),
          parsed.map((r) => r.vendor),
        ],
      );
      parsedIds = updated.rows.map((row) => row.id);
    }

    let rules = 0;
    if (parsedIds.length > 0) {
      // Manual rules beat the AI. A manual rule pointing at an archived/deleted category keeps no category.
      await client.query(
        `UPDATE bank_transactions bt
         SET suggested_category_id = CASE WHEN bt.direction = 'debit' THEN c.id END,
             suggested_vendor = COALESCE(r.vendor, bt.suggested_vendor),
             suggestion_source = 'rule'
         FROM bank_counterparty_rules r
         LEFT JOIN categories c ON c.id = r.category_id AND c.user_id = r.user_id AND c.is_archived = false
         WHERE bt.id = ANY($2::uuid[])
           AND bt.user_id = $1::uuid
           AND r.user_id = bt.user_id
           AND r.counterparty_key = bt.counterparty_key
           AND r.direction = bt.direction
           AND r.source = 'manual'`,
        [userId, parsedIds],
      );

      await client.query(
        `UPDATE bank_transactions bt
         SET possible_duplicate_expense_id = (
           SELECT e.id
           FROM expenses e
           WHERE e.user_id = bt.user_id
             AND e.amount = bt.amount
             AND e.expense_date BETWEEN bt.booking_date - 3 AND bt.booking_date + 3
           ORDER BY abs(e.expense_date - bt.booking_date), e.created_at
           LIMIT 1
         )
         WHERE bt.id = ANY($2::uuid[])
           AND bt.user_id = $1::uuid
           AND bt.direction = 'debit'`,
        [userId, parsedIds],
      );

      const upserted = await client.query(
        `INSERT INTO bank_counterparty_rules (user_id, counterparty_key, direction, category_id, vendor, source, updated_at)
         SELECT DISTINCT ON (bt.counterparty_key, bt.direction)
                $1::uuid, bt.counterparty_key, bt.direction, bt.suggested_category_id, bt.suggested_vendor, 'ai', now()
         FROM bank_transactions bt
         WHERE bt.id = ANY($2::uuid[])
           AND bt.user_id = $1::uuid
           AND bt.suggestion_source = 'ai'
           AND bt.counterparty_key IS NOT NULL
           AND bt.counterparty_key <> ''
           AND ((bt.direction = 'debit' AND bt.suggested_category_id IS NOT NULL)
                OR (bt.direction = 'credit' AND bt.suggested_vendor IS NOT NULL))
         ORDER BY bt.counterparty_key, bt.direction, bt.notification_posted_at DESC
         ON CONFLICT (user_id, counterparty_key, direction) DO UPDATE
         SET category_id = EXCLUDED.category_id, vendor = EXCLUDED.vendor, source = 'ai', updated_at = now()
         WHERE bank_counterparty_rules.source <> 'manual'`,
        [userId, parsedIds],
      );
      rules = upserted.rowCount ?? 0;
    }

    const setStatus = async (status, ids) => {
      if (ids.length === 0) return 0;
      const res = await client.query(
        `UPDATE bank_transactions
         SET parse_status = $3
         WHERE id = ANY($2::uuid[])
           AND user_id = $1::uuid
           AND source = 'notification'
           AND parse_status = 'pending'`,
        [userId, ids, status],
      );
      return res.rowCount ?? 0;
    };
    const notTransaction = await setStatus("not_transaction", notTransactionIds);
    const failed = await setStatus("failed", failedIds);

    await client.query("COMMIT");
    return { parsed: parsedIds.length, notTransaction, failed, rules };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

async function loadPendingJob(pool, jobId, jobType) {
  const result = await pool.query(
    "SELECT id, user_id, request_body FROM ai_jobs WHERE id = $1 AND status = 'pending' AND job_type = $2",
    [jobId, jobType],
  );

  if (result.rows.length === 0) {
    console.log(`[AiProcessor] Job ${jobId} not found or not pending, skipping.`);
    return null;
  }
  return result.rows[0];
}

/**
 * Calls the OpenAI Responses API in JSON mode and returns the output text.
 */
async function callOpenAiJson({ model, instructions, input, maxOutputTokens }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: { format: { type: "json_object" } },
      max_output_tokens: maxOutputTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  if (data.status === "incomplete") {
    console.warn(`[AiProcessor] OpenAI response incomplete (${model}):`, data.incomplete_details?.reason);
  }

  const outputText = data.output_text ?? extractOutputText(data);

  if (!outputText) {
    throw new Error("Empty response from OpenAI.");
  }

  return outputText;
}

async function completeJob(pool, jobId, result) {
  await pool.query(
    "UPDATE ai_jobs SET status = 'completed', response_body = $1::jsonb, completed_at = now() WHERE id = $2",
    [JSON.stringify(result), jobId],
  );
}

async function failJob(pool, jobId, error) {
  await pool
    .query("UPDATE ai_jobs SET status = 'failed', error = $1, completed_at = now() WHERE id = $2 AND status = 'pending'", [
      String(error?.message ?? error).slice(0, 2000),
      jobId,
    ])
    .catch(() => {});
}

function extractOutputText(data) {
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (part.type === "output_text" && part.text) {
            return part.text;
          }
        }
      }
    }
  }
  return null;
}

/** Extracts the JSON object from model output that may be wrapped in a code fence or prose. */
export function extractJson(text) {
  const trimmed = text.trim();

  const jsonStart = trimmed.indexOf("```json");
  if (jsonStart >= 0) {
    const contentStart = trimmed.indexOf("\n", jsonStart) + 1;
    const contentEnd = trimmed.indexOf("```", contentStart);
    if (contentEnd > contentStart) return trimmed.slice(contentStart, contentEnd).trim();
  }

  const fenceStart = trimmed.indexOf("```");
  if (fenceStart >= 0) {
    const contentStart = trimmed.indexOf("\n", fenceStart) + 1;
    const contentEnd = trimmed.indexOf("```", contentStart);
    if (contentEnd > contentStart) return trimmed.slice(contentStart, contentEnd).trim();
  }

  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) return trimmed.slice(braceStart, braceEnd + 1);

  return trimmed;
}
