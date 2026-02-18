# Phase 9 — Bank Integration (Premium)

Connect to bank via OpenBanking to automatically import transactions.

## Status: Not Started

## Scope

OpenBanking provider integration, automatic transaction import, expense matching.

## Architecture
- Use an OpenBanking aggregator (e.g. GoCardless Bank Account Data, Nordigen/Enablebanking)
- User authorises bank access via OAuth redirect flow
- Backend periodically fetches transactions and creates pending expenses
- User reviews and categorises imported transactions

## Backend
- `POST /v1/bank-connections` — initiate bank connection (redirect URL)
- `GET /v1/bank-connections` — list active connections
- `DELETE /v1/bank-connections/{id}` — revoke connection
- `POST /v1/bank-connections/{id}/sync` — trigger manual sync
- Auto-categorisation based on merchant name matching

## Frontend
- Bank connection setup wizard
- Transaction import review screen
- Match imported transactions to existing expenses (deduplication)

## Infrastructure
- OpenBanking provider API keys
- Scheduled Lambda or cron for periodic sync
- Encrypted token storage

## Definition of Done
- Can connect a Lithuanian bank account
- Transactions import automatically
- Imported transactions can be reviewed and categorised
- Duplicate detection prevents double-counting
