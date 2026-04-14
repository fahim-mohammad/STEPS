# STEPS — Canonical Contribution & Dues Model (Locked)

This project intentionally uses a **hybrid** model with **one canonical source for dues status**.

## Canonical Rules (Do not deviate)

### 1) Dues status / eligibility (canonical)
**`expected_dues`** is the single source of truth for:

- which months are due/unpaid/paid
- missing contributors per month
- member dues summary

If a feature needs to answer: *“Is month X due for user Y?”* → it must read `expected_dues`.

### 2) Contribution amount (canonical)
**`contribution_rules`** is the single source of truth for the amount to charge:

- yearly default amount
- per-month overrides

Submit UI and submit API must always compute `amount` via:

`getMonthlyContributionAmount(year, month)`

### 3) Payments (records)
**`contributions`** stores payment attempts/records:

- insert with `status='pending'`
- approve sets `status='approved'`
- reject sets `status='rejected'`

### 4) Approval effects (must be consistent)
When an admin approves contributions:

1. Update contributions → `approved`
2. Mark matching expected_dues rows → `paid`
3. Generate receipt(s) and email

### 5) DB constraints (must remain)

- Unique constraint: `(user_id, year, month)` on `contributions` prevents double-submit.
- Casing: **lowercase only** for:
  - `contributions.status`: `pending | approved | rejected`
  - `contributions.payment_method`: `cash | bank | bkash` (and other allowed values)
  - `fines.status`: `active | waived | paid`

## Why this model

- `expected_dues` lets you generate/track dues reliably (including future months) without guessing from contributions.
- `contribution_rules` keeps the amount logic centralized.
- `contributions` remains the audit/payment record.

If you ever switch to a different model, it must be done as a deliberate migration and all dependent features must be updated.

---

Last updated: 2026-02-21
