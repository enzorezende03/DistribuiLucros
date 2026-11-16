# Architecture rules

- After saving a company's initial Ata balance, call the admin-only reconciliation RPC before invalidating cached balances; existing approved distributions must be deducted idempotently.
- Calculate the balance from the initial amount plus net distribution movements and company transfers, including reversal entries, to avoid double deductions.
- Keep analysis queries under their source cache prefixes and refresh the selected company's report sources on entry, focus, reconnect and every 15 seconds while visible; preserve cached content to avoid loading screens during background updates.
- Separate posted Ata deductions from excess awaiting approval; deadline projections use unrounded monthly averages and disclose their end-of-month cutoff and assumed pending approvals, never mutate ledger data to match projections.