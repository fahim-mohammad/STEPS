drop table if exists public.year_counters;

create table public.year_counters (
  year integer primary key,
  counter bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.year_counters (year, counter)
values (extract(year from now())::integer, 0)
on conflict (year) do nothing;


create or replace function public.get_next_year_counter(p_year integer)
returns bigint
language plpgsql
as $$
declare
  next_value bigint;
begin
  insert into public.year_counters (year, counter)
  values (p_year, 0)
  on conflict (year) do nothing;

  update public.year_counters
  set counter = counter + 1,
      updated_at = now()
  where year = p_year
  returning counter into next_value;

  return next_value;
end;
$$;

alter table public.profit_distributions
add column if not exists profit_amount numeric(12,2) not null default 0;

alter table public.profit_distributions
add column if not exists note text;

alter table public.profit_distributions
add column if not exists proof_urls text[] default '{}';

alter table public.profit_distributions
add column if not exists source_type text;

alter table public.profit_distributions
add column if not exists investment_id uuid;

alter table public.profit_distributions
add column if not exists created_at timestamptz not null default now();

alter table public.profit_distributions
add column if not exists updated_at timestamptz not null default now();







alter table public.certificates
add column if not exists ai_message text;

alter table public.certificates
add column if not exists ai_message text,
add column if not exists language text,
add column if not exists certificate_type text,
add column if not exists role_title text,
add column if not exists recipient_name text,
add column if not exists recipient_email text,
add column if not exists issue_date date,
add column if not exists status text,
add column if not exists pdf_path text,
add column if not exists verification_code text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();



alter table public.certificates
add column if not exists issued_by_user_id uuid;

alter table public.certificates
add column if not exists ai_message text,
add column if not exists issued_by_user_id uuid,
add column if not exists language text,
add column if not exists certificate_type text,
add column if not exists role_title text,
add column if not exists recipient_name text,
add column if not exists recipient_email text,
add column if not exists issue_date date,
add column if not exists status text,
add column if not exists pdf_path text,
add column if not exists verification_code text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

alter table public.certificates
add column if not exists pdf_storage_key text;

alter table public.certificates
add column if not exists ai_message text,
add column if not exists issued_by_user_id uuid,
add column if not exists pdf_storage_key text,
add column if not exists language text,
add column if not exists certificate_type text,
add column if not exists role_title text,
add column if not exists recipient_name text,
add column if not exists recipient_email text,
add column if not exists issue_date date,
add column if not exists status text,
add column if not exists pdf_path text,
add column if not exists verification_code text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

ALTER TABLE expenses
ADD COLUMN covered_by uuid,
ADD COLUMN reimbursed_amount numeric DEFAULT 0;

CREATE TABLE expense_reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid,
  admin_id uuid,
  amount numeric,
  created_at timestamp DEFAULT now()
);

-- 🔥 NEW TABLE FOR TRACKING
create table if not exists expense_logs (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid,
  admin_id uuid,
  amount numeric,
  created_at timestamp default now()
);

-- Add fields to expenses
alter table expenses
add column if not exists member_id uuid,
add column if not exists paid_by uuid,
add column if not exists type text default 'general';

-- Add bkash fee config table
create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  value text
);

-- Insert default bkash fee
insert into system_settings (key, value)
values ('bkash_fee_percent', '1.25')
on conflict (key) do nothing;