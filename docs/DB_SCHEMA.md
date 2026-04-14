# STEPS Database Schema (Supabase Postgres)

This project uses **Supabase (Postgres)**. The SQL lives in:
- `supabase/schema.sql`
- `supabase/migrations/20260209_0001_add_admin_investments_receipts.sql`
- `supabase/migrations/20260209_0002_alter_investment_accounts.sql`

## Core Tables

### `profiles`
User profile (1 row per auth user).
- `id` (uuid, PK, references `auth.users`)
- `email` (text, unique)
- `full_name` (text)
- `phone` (text)
- `role` (enum `user_role`: member/chairman/accountant)
- `approved` (boolean)
- `created_at` (timestamptz)

### `user_preferences`
UI settings.
- `user_id` (uuid, PK -> profiles.id)
- `language` (text: en/bn)
- `theme` (text: light/dark)
- `updated_at`

### `notification_prefs` (migration 0001)
Notification toggles.
- `user_id` (uuid, PK)
- `email_notifications` (bool)
- `whatsapp_notifications` (bool)

### `contribution_rules`
Admin-controlled contribution amount rules (year-based with optional month overrides).
- `year` (int, unique)
- `default_monthly_amount` (numeric)
- `overrides` (jsonb array)
- audit fields: created_by/updated_by + timestamps

### `contributions`
Member payment records.
- `user_id` (uuid -> profiles.id)
- `year`, `month`
- `amount`
- `payment_method` (enum: cash/bank/bkash/nagad/rocket)
- `paid_to` (text)  **required in UI for cash**
- `deposit_slip` (text) **required in UI for bank**
- `reference` (text)
- approval fields: `approved`, `approved_by`, `approved_at`

### `receipts` (migration 0001)
Receipt vault (PDF link + invoice number).
- `contribution_id` (uuid -> contributions.id)
- `invoice_no` (bigint, unique)
- `year`, `month`
- `pdf_url`
- `created_at`

### `invoice_counters` (migration 0001)
Single-row counter to guarantee invoice uniqueness.
- `next_invoice_no`
- Function `next_invoice_no()` returns an atomic new invoice number.

### `loan_applications`
Loan applications (privacy enforced via RLS).
- `borrower_id` (uuid -> profiles.id)
- `amount`
- `status` (pending/approved/rejected/repaid)
- `created_at`

### `investment_accounts`
Current code uses this table for investments.
- `investment_type` (DPS/FDR/SHARE/BUSINESS/LAND/OTHER)
- bank + asset fields (see migration 0002)

> **Your requested model:** “one investments table with a type/sector field”
> 
> The repo also includes a newer `investments` table (migration 0001) with `sector` (BANK/SHARE/MUTUAL_FUND/GOLD/BUSINESS/OTHER). If you want **exact types** like `BANK_DPS`, `BANK_FDR`, `SHARE`, `MUTUAL_FUND`, `GOLD`, `BUSINESS`, `OTHER`, I recommend standardizing on a single table (either replace `investment_accounts`, or migrate code to `investments`).

### `investments` (migration 0001)
Multi-sector investments.
- `sector` (BANK/SHARE/MUTUAL_FUND/GOLD/BUSINESS/OTHER)
- `invested_amount`, `expected_return`, dates, status
- `meta` jsonb for type-specific fields

### `charity_records`
- `amount`, `month`, `year`, `description`, `created_at`

### `contract_files`
- `name`, `url`, `uploaded_by`, `uploaded_at`

### `community_join_requests`
- `user_id` unique
- `status` (pending/approved/rejected)
- decided fields

### `app_settings`
Key/value store (used for WhatsApp community URL).

### `audit_logs`
Admin audit trail.

### `support_messages`
Member support tickets.

### `admin_profiles` (migration 0001)
Public profiles for chairman/accountant.
- `photo_url`, `bio`, etc.

## RLS Notes (privacy)
- Loans are readable only by borrower, chairman, accountant.
- Admin-only tables: audit_logs, charity, investments (per policies).

