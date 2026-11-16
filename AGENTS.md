# Architecture rules

- After saving a company's initial Ata balance, call the admin-only reconciliation RPC before invalidating cached balances; existing approved distributions must be deducted idempotently.
- Calculate the balance from the initial amount plus net distribution movements and company transfers, including reversal entries, to avoid double deductions.