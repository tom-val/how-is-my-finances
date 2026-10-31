import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORISE_MAX_ITEMS,
  buildCategorisePromptInput,
  buildNotificationPromptInput,
  counterpartyKey,
  extractJson,
  localDate,
  parseAssignments,
  parseNotificationResults,
  parseNpgsqlConnectionString,
  readCategoriseRequest,
  readNotificationRequest,
} from "./index.mjs";

const categories = [
  { id: "c-food", name: "Groceries" },
  { id: "c-fuel", name: "Fuel" },
  { id: "c-fun", name: "Entertainment" },
];

const tx = (id, overrides = {}) => ({
  id,
  counterpartyKey: `key ${id}`,
  direction: "debit",
  counterparty: `MERCHANT ${id}`,
  description: "Card payment",
  mcc: "5411",
  amount: 12.5,
  ...overrides,
});

describe("parseNpgsqlConnectionString", () => {
  test("parses the Supabase pooler connection string", () => {
    const config = parseNpgsqlConnectionString(
      "Host=aws-1-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.abc;Password=p=ss;SSL Mode=Require;Timeout=15;Pooling=false",
    );
    assert.deepEqual(config, {
      host: "aws-1-eu-central-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: "postgres.abc",
      password: "p=ss",
      ssl: { rejectUnauthorized: false },
    });
  });

  test("defaults the port and disables SSL when not required", () => {
    const config = parseNpgsqlConnectionString("Host=localhost;Database=postgres;Username=u;Password=p");
    assert.equal(config.port, 5432);
    assert.equal(config.ssl, false);
  });
});

describe("readCategoriseRequest", () => {
  test("keeps valid categories and transactions", () => {
    const { categories: cats, transactions } = readCategoriseRequest({ categories, transactions: [tx("t1")] });
    assert.deepEqual(cats, categories);
    assert.equal(transactions.length, 1);
    assert.deepEqual(transactions[0], tx("t1"));
  });

  test("drops malformed categories and transactions", () => {
    const { categories: cats, transactions } = readCategoriseRequest({
      categories: [{ id: "c1", name: "  " }, { id: "", name: "X" }, { name: "No id" }, null, { id: "c2", name: "Ok" }],
      transactions: [
        tx("t1"),
        { ...tx("t2"), id: "" },
        { ...tx("t3"), direction: "sideways" },
        { ...tx("t4"), counterparty: null, description: "   " },
        null,
        "nope",
      ],
    });
    assert.deepEqual(cats, [{ id: "c2", name: "Ok" }]);
    assert.deepEqual(
      transactions.map((t) => t.id),
      ["t1"],
    );
  });

  test("normalises optional fields and truncates long descriptions", () => {
    const { transactions } = readCategoriseRequest({
      categories,
      transactions: [
        tx("t1", { description: "a".repeat(500), mcc: 5411, amount: "12", counterparty: "  MAXIMA   LT  ", counterpartyKey: 7 }),
      ],
    });
    const t = transactions[0];
    assert.equal(t.description.length, 140);
    assert.equal(t.mcc, "5411");
    assert.equal(t.amount, null);
    assert.equal(t.counterparty, "MAXIMA LT");
    assert.equal(t.counterpartyKey, null);
  });

  test("caps the number of transactions", () => {
    const many = Array.from({ length: CATEGORISE_MAX_ITEMS + 50 }, (_, i) => tx(`t${i}`));
    const { transactions } = readCategoriseRequest({ categories, transactions: many });
    assert.equal(transactions.length, CATEGORISE_MAX_ITEMS);
  });

  test("handles a missing or non-object body", () => {
    assert.deepEqual(readCategoriseRequest(null), { categories: [], transactions: [] });
    assert.deepEqual(readCategoriseRequest({ categories: "x", transactions: {} }), { categories: [], transactions: [] });
  });

  test("the prompt input carries no ids or keys", () => {
    const { categories: cats, transactions } = readCategoriseRequest({
      categories,
      transactions: [tx("8d3f0b8e-uuid", { counterparty: "MAXIMA" })],
    });
    const input = buildCategorisePromptInput(cats, transactions);
    const json = JSON.stringify(input);
    assert.ok(!json.includes("c-food"));
    assert.ok(!json.includes("8d3f0b8e-uuid"));
    assert.ok(!json.includes("key "));
    assert.ok(!json.includes('"id"'));
    assert.deepEqual(input.transactions[0], {
      index: 0,
      direction: "debit",
      counterparty: "MAXIMA",
      description: "Card payment",
      mcc: "5411",
      amount: 12.5,
    });
  });
});

describe("parseAssignments", () => {
  const transactions = [tx("t0"), tx("t1"), tx("t2"), tx("t3", { direction: "credit" })];

  test("maps valid indices to ids", () => {
    const result = parseAssignments(
      {
        assignments: [
          { item: 0, category: 1, vendor: "Circle K" },
          { item: 1, category: 0, vendor: null },
        ],
      },
      categories,
      transactions,
    );
    assert.deepEqual(result, [
      { id: "t0", categoryId: "c-fuel", vendor: "Circle K" },
      { id: "t1", categoryId: "c-food", vendor: null },
    ]);
  });

  test("ignores out-of-range items and categories", () => {
    const result = parseAssignments(
      {
        assignments: [
          { item: 4, category: 0 },
          { item: -1, category: 0 },
          { item: 0, category: 3 },
          { item: 1, category: -1 },
        ],
      },
      categories,
      transactions,
    );
    assert.deepEqual(result, []);
  });

  test("ignores non-integer indices", () => {
    const result = parseAssignments(
      {
        assignments: [
          { item: "0", category: 0 },
          { item: 0.5, category: 0 },
          { item: 1, category: "1" },
          { item: 2, category: 1.2 },
          { item: 2 }, // category missing (undefined) is not null
        ],
      },
      categories,
      transactions,
    );
    assert.deepEqual(result, []);
  });

  test("the first valid assignment per transaction wins", () => {
    const result = parseAssignments(
      {
        assignments: [
          { item: 0, category: 9 }, // invalid, does not count
          { item: 0, category: 1, vendor: "First" },
          { item: 0, category: 2, vendor: "Second" },
        ],
      },
      categories,
      transactions,
    );
    assert.deepEqual(result, [{ id: "t0", categoryId: "c-fuel", vendor: "First" }]);
  });

  test("null category is allowed", () => {
    const result = parseAssignments({ assignments: [{ item: 2, category: null, vendor: "Bolt" }] }, categories, transactions);
    assert.deepEqual(result, [{ id: "t2", categoryId: null, vendor: "Bolt" }]);
  });

  test("an overlong or non-string vendor becomes null but keeps the category", () => {
    const result = parseAssignments(
      {
        assignments: [
          { item: 0, category: 0, vendor: "x".repeat(61) },
          { item: 1, category: 0, vendor: 42 },
          { item: 2, category: 0, vendor: "   " },
        ],
      },
      categories,
      transactions,
    );
    assert.deepEqual(result, [
      { id: "t0", categoryId: "c-food", vendor: null },
      { id: "t1", categoryId: "c-food", vendor: null },
      { id: "t2", categoryId: "c-food", vendor: null },
    ]);
  });

  test("a vendor of exactly 60 characters is kept, trimmed", () => {
    const vendor = "v".repeat(60);
    const result = parseAssignments({ assignments: [{ item: 0, category: null, vendor: `  ${vendor} ` }] }, categories, transactions);
    assert.equal(result[0].vendor, vendor);
  });

  test("credits never get a category", () => {
    const result = parseAssignments({ assignments: [{ item: 3, category: 0, vendor: "Employer" }] }, categories, transactions);
    assert.deepEqual(result, [{ id: "t3", categoryId: null, vendor: "Employer" }]);
  });

  test("tolerates a malformed response", () => {
    assert.deepEqual(parseAssignments(null, categories, transactions), []);
    assert.deepEqual(parseAssignments({ assignments: "nope" }, categories, transactions), []);
    assert.deepEqual(parseAssignments({ assignments: [null, 1, "x"] }, categories, transactions), []);
  });
});

describe("extractJson", () => {
  test("returns plain JSON unchanged", () => {
    assert.equal(extractJson('{"a":1}'), '{"a":1}');
  });

  test("unwraps a ```json fence", () => {
    assert.equal(extractJson('Here you go:\n```json\n{"a":1}\n```\nThanks'), '{"a":1}');
  });

  test("unwraps a bare ``` fence", () => {
    assert.equal(extractJson('```\n{"a":2}\n```'), '{"a":2}');
  });

  test("cuts the object out of surrounding prose", () => {
    assert.equal(extractJson('Sure! {"a":{"b":3}} hope this helps'), '{"a":{"b":3}}');
  });

  test("returns trimmed text when there is no object", () => {
    assert.equal(extractJson("  nothing here  "), "nothing here");
  });
});

describe("counterpartyKey", () => {
  test("matches the phase doc example", () => {
    assert.equal(counterpartyKey("MAXIMA LT X123 VILNIUS"), "maxima lt x vilnius");
  });

  test("lower-cases, trims and collapses whitespace", () => {
    assert.equal(counterpartyKey("  Circle   K\tKaunas  "), "circle k kaunas");
  });

  test("keeps Lithuanian letters", () => {
    assert.equal(counterpartyKey("UAB ŠVYTURYS-UTENOS ALUS"), "uab švyturys-utenos alus");
  });

  test("removes card masks", () => {
    assert.equal(counterpartyKey("IKI *1234 Vilnius"), "iki vilnius");
    assert.equal(counterpartyKey("Bolt **** 5678"), "bolt");
    assert.equal(counterpartyKey("RIMI 516793******1234 KAUNAS"), "rimi kaunas");
  });

  test("removes digit runs of 3 or more without leaving a space", () => {
    assert.equal(counterpartyKey("LIDL 1234567 KAUNAS"), "lidl kaunas");
    assert.equal(counterpartyKey("SHOP123NAME"), "shopname");
    assert.equal(counterpartyKey("VIADA 12"), "viada 12");
  });

  test("caps the key at 200 characters", () => {
    const key = counterpartyKey(`${"a".repeat(199)} ${"b".repeat(50)}`);
    assert.equal(key, "a".repeat(199));
    assert.equal(counterpartyKey("c".repeat(300)).length, 200);
  });

  test("returns null for empty or non-string input", () => {
    assert.equal(counterpartyKey(""), null);
    assert.equal(counterpartyKey("   "), null);
    assert.equal(counterpartyKey("*1234"), null);
    assert.equal(counterpartyKey(null), null);
    assert.equal(counterpartyKey(42), null);
  });

  test("is idempotent", () => {
    const once = counterpartyKey("MAXIMA LT X123 VILNIUS *4321");
    assert.equal(counterpartyKey(once), once);
  });
});

describe("readNotificationRequest", () => {
  test("keeps valid notifications and normalises postedAt", () => {
    const { categories: cats, notifications } = readNotificationRequest({
      categories,
      notifications: [
        { id: "n1", postedAt: "2026-10-30T18:15:00+02:00", title: "Swedbank", text: "Mokėjimas kortele 12,50 EUR MAXIMA" },
        { id: "", postedAt: "2026-10-30T18:15:00Z", title: "x", text: "y" },
        { id: "n3", postedAt: "not a date", title: "x", text: "y" },
        { id: "n4", postedAt: "2026-10-30T18:15:00Z", title: " ", text: null },
        { id: "n5", postedAt: 1730000000000, title: "x", text: "y" },
      ],
    });
    assert.equal(cats.length, 3);
    assert.deepEqual(notifications, [
      { id: "n1", postedAt: "2026-10-30T16:15:00.000Z", title: "Swedbank", text: "Mokėjimas kortele 12,50 EUR MAXIMA" },
    ]);
    const input = buildNotificationPromptInput(cats, notifications);
    assert.ok(!JSON.stringify(input).includes("n1"));
  });

  test("caps text length", () => {
    const { notifications } = readNotificationRequest({
      categories: [],
      notifications: [{ id: "n1", postedAt: "2026-10-30T10:00:00Z", title: "t", text: "a".repeat(5000) }],
    });
    assert.equal(notifications[0].text.length, 1000);
  });
});

describe("localDate", () => {
  test("uses the Vilnius calendar day", () => {
    assert.equal(localDate("2026-10-30T22:30:00Z"), "2026-10-31"); // 00:30 in Vilnius (EET)
    assert.equal(localDate("2026-07-15T12:00:00Z"), "2026-07-15");
  });
});

describe("parseNotificationResults", () => {
  const notifications = [
    { id: "n0", postedAt: "2026-10-30T10:00:00.000Z", title: "Swedbank", text: "Card payment 12,50 EUR MAXIMA LT X123" },
    { id: "n1", postedAt: "2026-10-30T11:00:00.000Z", title: "Swedbank", text: "Login code 123456" },
    { id: "n2", postedAt: "2026-10-30T12:00:00.000Z", title: "Swedbank", text: "Incoming 500 EUR" },
  ];

  const valid = (overrides = {}) => ({
    item: 0,
    isTransaction: true,
    direction: "debit",
    amount: 12.5,
    currency: "EUR",
    counterparty: "MAXIMA LT X123",
    date: "2026-10-30",
    category: 0,
    vendor: "Maxima",
    ...overrides,
  });

  const parseOne = (entry) => parseNotificationResults({ results: [entry] }, categories, notifications)[0];

  test("parses a debit, a non-transaction and a credit", () => {
    const results = parseNotificationResults(
      {
        results: [
          valid(),
          { item: 1, isTransaction: false },
          valid({ item: 2, direction: "credit", amount: 500, counterparty: "Jonas Jonaitis", category: 1, vendor: null }),
        ],
      },
      categories,
      notifications,
    );
    assert.deepEqual(results, [
      {
        id: "n0",
        status: "parsed",
        direction: "debit",
        amount: "12.50",
        currency: "EUR",
        date: "2026-10-30",
        counterparty: "MAXIMA LT X123",
        counterpartyKey: "maxima lt x",
        categoryId: "c-food",
        vendor: "Maxima",
      },
      { id: "n1", status: "not_transaction" },
      {
        id: "n2",
        status: "parsed",
        direction: "credit",
        amount: "500.00",
        currency: "EUR",
        date: "2026-10-30",
        counterparty: "Jonas Jonaitis",
        counterpartyKey: "jonas jonaitis",
        categoryId: null, // credits never get a category
        vendor: null,
      },
    ]);
  });

  test("notifications the model skipped are failed", () => {
    const results = parseNotificationResults({ results: [valid()] }, categories, notifications);
    assert.deepEqual(
      results.map((r) => r.status),
      ["parsed", "failed", "failed"],
    );
    assert.deepEqual(
      parseNotificationResults({}, categories, notifications).map((r) => r.status),
      ["failed", "failed", "failed"],
    );
  });

  test("invalid amounts fail the notification", () => {
    for (const amount of [0, -5, "12.50", null, undefined, Number.NaN, Infinity, 12.345, 1e12]) {
      assert.equal(parseOne(valid({ amount })).status, "failed", `amount ${String(amount)}`);
    }
  });

  test("amounts are rounded to cents", () => {
    assert.equal(parseOne(valid({ amount: 0.1 + 0.2 })).amount, "0.30");
    assert.equal(parseOne(valid({ amount: 9_999_999_999.99 })).amount, "9999999999.99");
  });

  test("missing or invalid required fields fail the notification", () => {
    assert.equal(parseOne(valid({ direction: undefined })).status, "failed");
    assert.equal(parseOne(valid({ direction: "out" })).status, "failed");
    assert.equal(parseOne(valid({ isTransaction: undefined })).status, "failed");
    assert.equal(parseOne(valid({ isTransaction: "true" })).status, "failed");
    assert.equal(parseOne({ item: 0 }).status, "failed");
  });

  test("dates outside ±7 days of postedAt fall back to the postedAt day", () => {
    assert.equal(parseOne(valid({ date: "2026-10-23" })).date, "2026-10-23");
    assert.equal(parseOne(valid({ date: "2026-11-06" })).date, "2026-11-06");
    assert.equal(parseOne(valid({ date: "2026-10-22" })).date, "2026-10-30");
    assert.equal(parseOne(valid({ date: "2026-11-07" })).date, "2026-10-30");
    assert.equal(parseOne(valid({ date: "2025-10-30" })).date, "2026-10-30");
  });

  test("invalid dates fall back to the postedAt day", () => {
    for (const date of [undefined, null, "", "30/10/2026", "2026-02-30", "2026-13-01", "2026-10-30T10:00:00Z", 20261030]) {
      assert.equal(parseOne(valid({ date })).date, "2026-10-30", `date ${String(date)}`);
    }
  });

  test("currency defaults to EUR and is upper-cased", () => {
    assert.equal(parseOne(valid({ currency: undefined })).currency, "EUR");
    assert.equal(parseOne(valid({ currency: "euro" })).currency, "EUR");
    assert.equal(parseOne(valid({ currency: " usd " })).currency, "USD");
  });

  test("an invalid category only drops the category", () => {
    for (const category of [3, -1, "0", 0.5, undefined]) {
      const result = parseOne(valid({ category }));
      assert.equal(result.status, "parsed");
      assert.equal(result.categoryId, null, `category ${String(category)}`);
    }
  });

  test("strings are trimmed and capped; overlong vendors dropped", () => {
    const result = parseOne(valid({ counterparty: `  ${"A".repeat(300)}  `, vendor: "v".repeat(61) }));
    assert.equal(result.counterparty.length, 140);
    assert.equal(result.vendor, null);
    const empty = parseOne(valid({ counterparty: "   ", vendor: "  Maxima " }));
    assert.equal(empty.counterparty, null);
    assert.equal(empty.counterpartyKey, null);
    assert.equal(empty.vendor, "Maxima");
  });

  test("ignores out-of-range items; the first result per notification wins", () => {
    const results = parseNotificationResults(
      {
        results: [
          valid({ item: 3 }),
          valid({ item: -1 }),
          valid({ item: "0" }),
          { item: 0, isTransaction: false },
          valid({ item: 0 }),
        ],
      },
      categories,
      notifications,
    );
    assert.equal(results[0].status, "not_transaction");
  });
});
