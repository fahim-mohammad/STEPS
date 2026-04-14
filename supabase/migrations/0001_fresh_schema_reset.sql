-- STEPS fresh database reset placeholder
-- Old migration history removed intentionally.
-- Rebuild the new schema from zero to match the final codebase.
-- Add the new production schema here before first deployment.

begin;

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================

do $$ begin
  create type public.app_role as enum ('member', 'chairman', 'accountant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loan_status as enum ('pending', 'approved', 'rejected', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_status as enum ('covered', 'uncovered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.community_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.correction_status as enum ('pending', 'resolved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.announcement_severity as enum ('info', 'success', 'warning', 'danger');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.warning_status as enum ('draft', 'sent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.investment_type as enum (
    'BANK_DPS',
    'BANK_FDR',
    'SHARE',
    'MUTUAL_FUND',
    'GOLD',
    'BUSINESS',
    'OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.certificate_status as enum ('active', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.suggestion_status as enum ('open', 'reviewing', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_kind as enum ('contribution', 'approval_followup', 'maturity', 'warning');
exception when duplicate_object then null; end $$;

-- =========================
-- HELPERS
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.approved = true
      and p.role in ('chairman', 'accountant')
  );
$$;

-- =========================
-- CORE USER TABLES
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role public.app_role not null default 'member',
  approved boolean not null default false,
  suspended boolean not null default false,
  banned boolean not null default false,
  photo_url text,
  bio text,
  signature_url text,
  chairman_signature_url text,
  accountant_signature_url text,
  profile_completed boolean not null default false,
  kyc_status text,
  nid_number text,
  nid_front_url text,
  nid_back_url text,
  current_institution text,
  current_subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'en' check (language in ('en','bn')),
  theme text not null default 'light' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create table if not exists public.user_notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_receipts boolean not null default true,
  email_reminders boolean not null default true,
  email_warnings boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_notification_prefs_updated_at
before update on public.user_notification_prefs
for each row execute function public.set_updated_at();

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_notification_prefs_updated_at
before update on public.notification_prefs
for each row execute function public.set_updated_at();

-- =========================
-- HOMEPAGE / LEADERSHIP / FOUNDERS
-- =========================

create table if not exists public.leadership_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  photo_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_profiles_role_chk check (role in ('chairman', 'accountant'))
);

create trigger trg_leadership_profiles_updated_at
before update on public.leadership_profiles
for each row execute function public.set_updated_at();

create table if not exists public.leadership_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  role public.app_role not null,
  note text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_history_role_chk check (role in ('chairman', 'accountant'))
);

create trigger trg_leadership_history_updated_at
before update on public.leadership_history
for each row execute function public.set_updated_at();

create table if not exists public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 1,
  full_name text not null,
  photo_url text,
  institution text,
  subject text,
  badge_title text not null default 'Founder',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_founder_profiles_updated_at
before update on public.founder_profiles
for each row execute function public.set_updated_at();

-- =========================
-- SETTINGS / AGREEMENT / PAYMENT
-- =========================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create table if not exists public.payment_gateways (
  id uuid primary key default gen_random_uuid(),
  gateway_type text not null, -- cash/bank/bkash
  label text not null,
  account_name text,
  account_number text,
  bank_name text,
  active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_payment_gateways_updated_at
before update on public.payment_gateways
for each row execute function public.set_updated_at();

-- =========================
-- CONTRIBUTIONS / RULES / DUES / FINES
-- =========================

create table if not exists public.contribution_rules (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique check (year >= 2025),
  default_monthly_amount numeric(12,2) not null default 0,
  overrides jsonb not null default '[]'::jsonb,
  set_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_contribution_rules_updated_at
before update on public.contribution_rules
for each row execute function public.set_updated_at();

create table if not exists public.expected_dues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null check (year >= 2025),
  month integer not null check (month between 1 and 12),
  expected_amount numeric(12,2) not null default 0,
  status text not null default 'due' check (status in ('due','paid','partial','waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, month)
);

create trigger trg_expected_dues_updated_at
before update on public.expected_dues
for each row execute function public.set_updated_at();

create table if not exists public.fine_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  rate_percent numeric(8,2) not null default 5,
  grace_days integer not null default 0,
  auto_apply boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_fine_settings_updated_at
before update on public.fine_settings
for each row execute function public.set_updated_at();

create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer,
  month integer check (month is null or month between 1 and 12),
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'active' check (status in ('active','paid','waived')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_fines_updated_at
before update on public.fines
for each row execute function public.set_updated_at();

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  invoice_no bigint generated by default as identity unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null check (year >= 2025),
  month integer not null check (month between 1 and 12),
  amount numeric(12,2) not null,
  fines_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (amount + fines_amount) stored,
  payment_method text not null check (payment_method in ('cash','bank','bkash')),
  paid_to text,
  bank_name text,
  bkash_number text,
  slip_path text,
  slip_url text,
  note text,
  status public.approval_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  receipt_path text,
  receipt_url text,
  receipt_qr_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, month, status) deferrable initially immediate
);

create index if not exists idx_contributions_user on public.contributions(user_id);
create index if not exists idx_contributions_status on public.contributions(status);
create index if not exists idx_contributions_period on public.contributions(year, month);

create trigger trg_contributions_updated_at
before update on public.contributions
for each row execute function public.set_updated_at();

-- =========================
-- LOANS
-- =========================

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  status public.loan_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  due_date date,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_loan_applications_user on public.loan_applications(user_id);
create index if not exists idx_loan_applications_status on public.loan_applications(status);

create trigger trg_loan_applications_updated_at
before update on public.loan_applications
for each row execute function public.set_updated_at();

-- =========================
-- INVESTMENTS
-- =========================

create table if not exists public.investment_accounts (
  id uuid primary key default gen_random_uuid(),
  investment_type public.investment_type not null,
  bank_name text,
  account_name text,
  principal_amount numeric(14,2) not null default 0,
  monthly_amount numeric(14,2),
  expected_return numeric(14,2) not null default 0,
  expected_yearly_interest numeric(14,2),
  start_date date,
  maturity_date date,
  status text not null default 'active' check (status in ('active','matured','closed','pending')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_investment_accounts_updated_at
before update on public.investment_accounts
for each row execute function public.set_updated_at();

create table if not exists public.investment_proofs (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investment_accounts(id) on delete cascade,
  file_name text,
  mime_type text,
  storage_path text,
  storage_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================
-- CHARITY
-- =========================

create table if not exists public.charity_records (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  organization_name text,
  amount numeric(14,2) not null default 0,
  charity_date date,
  received_from text,
  given_to text,
  record_type text not null default 'outflow' check (record_type in ('inflow','outflow')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_charity_records_updated_at
before update on public.charity_records
for each row execute function public.set_updated_at();

create table if not exists public.charity_proofs (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charity_records(id) on delete cascade,
  file_name text,
  mime_type text,
  storage_path text,
  url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.charity_incomes (
  id uuid primary key default gen_random_uuid(),
  title text,
  source_name text,
  amount numeric(14,2) not null default 0,
  note text,
  received_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.charity_pool (
  id uuid primary key default gen_random_uuid(),
  total_bank_interest numeric(14,2) not null default 0,
  total_used_for_operations numeric(14,2) not null default 0,
  total_available_for_charity numeric(14,2) not null default 0,
  total_charity_pool numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_charity_pool_updated_at
before update on public.charity_pool
for each row execute function public.set_updated_at();

insert into public.charity_pool (id)
select gen_random_uuid()
where not exists (select 1 from public.charity_pool);

-- =========================
-- EXPENSES / HARAM POOL
-- =========================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(14,2) not null,
  note text,
  expense_date date,
  proof_url text,
  covered boolean not null default false,
  status public.expense_status not null default 'uncovered',
  covered_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create table if not exists public.fund_operation_balances (
  id uuid primary key default gen_random_uuid(),
  halal_profit numeric(14,2) not null default 0,
  haram_profit numeric(14,2) not null default 0,
  costs_covered numeric(14,2) not null default 0,
  uncovered_costs numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_fund_operation_balances_updated_at
before update on public.fund_operation_balances
for each row execute function public.set_updated_at();

insert into public.fund_operation_balances (id)
select gen_random_uuid()
where not exists (select 1 from public.fund_operation_balances);

create table if not exists public.fund_operations (
  id uuid primary key default gen_random_uuid(),
  op_type text not null,
  amount numeric(14,2) not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_operation_offsets (
  id uuid primary key default gen_random_uuid(),
  fund_operation_id uuid references public.fund_operations(id) on delete cascade,
  source_type text,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_operation_settlements (
  id uuid primary key default gen_random_uuid(),
  title text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_operation_settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid references public.fund_operation_settlements(id) on delete cascade,
  item_type text,
  item_id uuid,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

-- =========================
-- COMMUNITY
-- =========================

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.community_request_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create trigger trg_community_join_requests_updated_at
before update on public.community_join_requests
for each row execute function public.set_updated_at();

-- =========================
-- MESSAGES / ANNOUNCEMENTS / READS
-- =========================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity public.announcement_severity not null default 'info',
  target text not null default 'all',
  target_user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create table if not exists public.chairman_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target text not null default 'all',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chairman_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

-- =========================
-- CORRECTIONS / WARNINGS / REMINDERS
-- =========================

create table if not exists public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete set null,
  requested_year integer,
  requested_month integer check (requested_month is null or requested_month between 1 and 12),
  requested_amount numeric(12,2),
  reason text not null,
  status public.correction_status not null default 'pending',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_correction_requests_updated_at
before update on public.correction_requests
for each row execute function public.set_updated_at();

create table if not exists public.warning_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  days_to_pay integer not null default 7,
  message text not null,
  status public.warning_status not null default 'draft',
  email_id text,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  status text not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_settings (
  id uuid primary key default gen_random_uuid(),
  remind_before_days integer not null default 3,
  remind_after_days integer not null default 7,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_reminder_settings_updated_at
before update on public.reminder_settings
for each row execute function public.set_updated_at();

create table if not exists public.sla_settings (
  id uuid primary key default gen_random_uuid(),
  pending_contribution_followup_days integer not null default 3,
  pending_member_followup_days integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_sla_settings_updated_at
before update on public.sla_settings
for each row execute function public.set_updated_at();

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind public.reminder_kind not null,
  title text,
  message text,
  due_at timestamptz,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

create table if not exists public.pending_followup_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  followed_up_at timestamptz not null default now(),
  note text
);

-- =========================
-- CERTIFICATES
-- =========================

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique,
  recipient_name text not null,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  certificate_type text not null,
  role_title text,
  short_message text,
  issue_date date not null default current_date,
  issued_by uuid references public.profiles(id) on delete set null,
  pdf_path text,
  pdf_url text,
  qr_verify_url text,
  status public.certificate_status not null default 'active',
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_certificates_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

create table if not exists public.certificate_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- PROFITS
-- =========================

create table if not exists public.profit_distributions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  total_profit numeric(14,2) not null default 0,
  proof_urls text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profit_distributions_updated_at
before update on public.profit_distributions
for each row execute function public.set_updated_at();

create table if not exists public.profit_distribution_items (
  id uuid primary key default gen_random_uuid(),
  profit_distribution_id uuid not null references public.profit_distributions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  basis_note text,
  created_at timestamptz not null default now()
);

-- =========================
-- SUGGESTIONS / EXPORT / FAILURES / AUDIT
-- =========================

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  message text not null,
  status public.suggestion_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_suggestions_updated_at
before update on public.suggestions
for each row execute function public.set_updated_at();

create table if not exists public.admin_exports (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  export_type text not null,
  file_path text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.email_failures (
  id uuid primary key default gen_random_uuid(),
  context text,
  entity_type text,
  entity_id uuid,
  recipient_email text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- REPORT / VIEW SUPPORT
-- =========================

create or replace function public.get_top_contributors(limit_count integer default 10)
returns table(name text, total numeric)
language sql
stable
as $$
  select
    coalesce(p.full_name, 'Unknown') as name,
    coalesce(sum(c.amount), 0)::numeric as total
  from public.contributions c
  join public.profiles p on p.id = c.user_id
  where c.status = 'approved'
  group by p.full_name
  order by total desc, name asc
  limit greatest(limit_count, 1)
$$;

create or replace function public.get_user_contribution_rank(p_user_id uuid)
returns table(rank bigint, total numeric)
language sql
stable
as $$
  with totals as (
    select
      c.user_id,
      coalesce(sum(c.amount), 0)::numeric as total
    from public.contributions c
    where c.status = 'approved'
    group by c.user_id
  ),
  ranked as (
    select
      user_id,
      total,
      dense_rank() over (order by total desc, user_id asc) as rank
    from totals
  )
  select r.rank, r.total
  from ranked r
  where r.user_id = p_user_id
$$;

create or replace function public.get_haram_pool_summary()
returns table(
  total_haram_profit numeric,
  total_covered_expenses numeric,
  uncovered_expenses numeric
)
language sql
stable
as $$
  with bal as (
    select
      coalesce(sum(haram_profit), 0)::numeric as total_haram_profit,
      coalesce(sum(costs_covered), 0)::numeric as total_covered_expenses,
      coalesce(sum(uncovered_costs), 0)::numeric as uncovered_expenses
    from public.fund_operation_balances
  )
  select
    total_haram_profit,
    total_covered_expenses,
    uncovered_expenses
  from bal
$$;

-- =========================
-- BASIC RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_notification_prefs enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.leadership_profiles enable row level security;
alter table public.leadership_history enable row level security;
alter table public.founder_profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.payment_gateways enable row level security;
alter table public.contribution_rules enable row level security;
alter table public.expected_dues enable row level security;
alter table public.fine_settings enable row level security;
alter table public.fines enable row level security;
alter table public.contributions enable row level security;
alter table public.loan_applications enable row level security;
alter table public.investment_accounts enable row level security;
alter table public.investment_proofs enable row level security;
alter table public.charity_records enable row level security;
alter table public.charity_proofs enable row level security;
alter table public.charity_incomes enable row level security;
alter table public.charity_pool enable row level security;
alter table public.expenses enable row level security;
alter table public.community_join_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.chairman_messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.correction_requests enable row level security;
alter table public.warning_notices enable row level security;
alter table public.warnings enable row level security;
alter table public.reminder_settings enable row level security;
alter table public.sla_settings enable row level security;
alter table public.reminders enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_events enable row level security;
alter table public.profit_distributions enable row level security;
alter table public.profit_distribution_items enable row level security;
alter table public.suggestions enable row level security;
alter table public.admin_exports enable row level security;
alter table public.email_failures enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_events enable row level security;

-- profiles
create policy "profiles_select_self_or_admin_or_public_fields"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_update_self_or_admin"
on public.profiles for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_insert_self"
on public.profiles for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

-- self tables
create policy "user_preferences_self_all"
on public.user_preferences for all
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "user_notification_prefs_self_all"
on public.user_notification_prefs for all
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "notification_prefs_self_all"
on public.notification_prefs for all
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "fines_self_or_admin"
on public.fines for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "contributions_self_or_admin_select"
on public.contributions for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "contributions_self_insert"
on public.contributions for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "contributions_admin_update"
on public.contributions for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "loan_self_or_admin"
on public.loan_applications for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "loan_self_insert"
on public.loan_applications for insert
with check (auth.uid() = user_id);

create policy "loan_admin_update"
on public.loan_applications for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "community_self_or_admin"
on public.community_join_requests for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "community_self_insert"
on public.community_join_requests for insert
with check (auth.uid() = user_id);

create policy "community_admin_update"
on public.community_join_requests for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "correction_self_or_admin"
on public.correction_requests for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "correction_self_insert"
on public.correction_requests for insert
with check (auth.uid() = user_id);

create policy "correction_admin_update"
on public.correction_requests for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "warning_notices_self_or_admin"
on public.warning_notices for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "warning_notices_admin_all"
on public.warning_notices for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "message_reads_self"
on public.message_reads for all
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "suggestions_self_or_admin"
on public.suggestions for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "suggestions_self_insert"
on public.suggestions for insert
with check (auth.uid() = user_id);

create policy "suggestions_admin_update"
on public.suggestions for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- admin tables
create policy "admin_full_contribution_rules"
on public.contribution_rules for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admin_full_expected_dues"
on public.expected_dues for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admin_full_fine_settings"
on public.fine_settings for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admin_full_investment_accounts"
on public.investment_accounts for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admin_full_investment_proofs"
on public.investment_proofs for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "charity_records_public_select_admin_write"
on public.charity_records for select
using (true);

create policy "charity_records_admin_write"
on public.charity_records for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "charity_proofs_public_select_admin_write"
on public.charity_proofs for select
using (true);

create policy "charity_proofs_admin_write"
on public.charity_proofs for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "charity_pool_select_all_admin_write"
on public.charity_pool for select
using (true);

create policy "charity_pool_admin_write"
on public.charity_pool for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "expenses_select_all_admin_write"
on public.expenses for select
using (true);

create policy "expenses_admin_write"
on public.expenses for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "leadership_profiles_public_select_admin_write"
on public.leadership_profiles for select
using (true);

create policy "leadership_profiles_admin_write"
on public.leadership_profiles for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "leadership_history_public_select_admin_write"
on public.leadership_history for select
using (true);

create policy "leadership_history_admin_write"
on public.leadership_history for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "founder_profiles_public_select_admin_write"
on public.founder_profiles for select
using (true);

create policy "founder_profiles_admin_write"
on public.founder_profiles for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "app_settings_public_select_admin_write"
on public.app_settings for select
using (true);

create policy "app_settings_admin_write"
on public.app_settings for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "payment_gateways_public_select_admin_write"
on public.payment_gateways for select
using (true);

create policy "payment_gateways_admin_write"
on public.payment_gateways for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "announcements_public_select_admin_write"
on public.announcements for select
using (true);

create policy "announcements_admin_write"
on public.announcements for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "chairman_messages_public_select_admin_write"
on public.chairman_messages for select
using (true);

create policy "chairman_messages_admin_write"
on public.chairman_messages for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "certificates_public_select_admin_write"
on public.certificates for select
using (true);

create policy "certificates_admin_write"
on public.certificates for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "certificate_events_admin_only"
on public.certificate_events for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "reminder_settings_admin_only"
on public.reminder_settings for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "sla_settings_admin_only"
on public.sla_settings for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "reminders_self_or_admin"
on public.reminders for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "reminders_admin_write"
on public.reminders for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "profit_distributions_public_select_admin_write"
on public.profit_distributions for select
using (true);

create policy "profit_distributions_admin_write"
on public.profit_distributions for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "profit_distribution_items_self_or_admin_select"
on public.profit_distribution_items for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profit_distribution_items_admin_write"
on public.profit_distribution_items for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admin_exports_admin_only"
on public.admin_exports for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "email_failures_admin_only"
on public.email_failures for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "audit_logs_admin_only"
on public.audit_logs for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "activity_events_admin_only"
on public.activity_events for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =========================
-- SEED SETTINGS
-- =========================

insert into public.app_settings(key, value)
values
  ('community_whatsapp_url', to_jsonb('https://chat.whatsapp.com/GnevniYgNpHJer3G5D34En'::text)),
  ('agreement_view_enabled', 'true'::jsonb),
  ('agreement_download_enabled', 'true'::jsonb)
on conflict (key) do nothing;

insert into public.payment_gateways(gateway_type, label, account_name, account_number, bank_name, sort_order)
values
  ('bank', 'PRIME Bank', null, null, 'PRIME Bank', 1),
  ('bank', 'Islami Bank', null, null, 'Islami Bank', 2),
  ('bank', 'IFIC Bank', null, null, 'IFIC Bank', 3),
  ('bank', 'NRBC Bank', null, null, 'NRBC Bank', 4),
  ('bank', 'Asia Bank', null, null, 'Asia Bank', 5),
  ('bkash', 'Fahim', 'Fahim', '01947458916', null, 6),
  ('bkash', 'Fahim', 'Fahim', '01690098083', null, 7),
  ('bkash', 'Rony', 'Rony', '01888616923', null, 8)
on conflict do nothing;

commit;