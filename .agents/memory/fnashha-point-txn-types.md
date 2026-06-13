---
name: Fnashha Point Transaction Types
description: The point_transaction_type DB enum only has three values — using others causes runtime errors.
---

## Rule
The `point_transaction_type` PostgreSQL enum only has: `"credit"`, `"debit"`, `"commission"`.

There are NO `"reservation"` or `"release"` types.

## Design
- When a technician submits an offer: `technicianProfilesTable.reservedPoints` increases (no transaction written)
- When an offer is rejected/other tech selected: `reservedPoints` decreases (no transaction written)  
- When a request is completed: permanent deduction → write a `"commission"` transaction record

**Why:** The reservation/release cycle doesn't actually change the spendable balance (total stays the same); only the locked portion changes. Writing `"commission"` only at the point of real deduction keeps the ledger clean.

**How to apply:** Never insert into `pointTransactionsTable` with type `"reservation"` or `"release"` — it will throw a DB enum constraint error.
