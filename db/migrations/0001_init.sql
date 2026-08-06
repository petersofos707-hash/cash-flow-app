-- Cash Flow App: plain Postgres schema for a single-owner deployment
-- (no Supabase). Monetary values are integer cents (bigint). There is
-- exactly one user, so there is no user_id column and no RLS — ownership
-- is enforced by the app's auth layer (one approved email), not the DB.
create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('income', 'essential', 'discretionary', 'transfer', 'wealth')),
  colour text not null default '#6b88a4',
  icon text not null default 'circle',
  archived boolean not null default false,
  include_in_reports boolean not null default true
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution text not null,
  type text not null check (
    type in ('everyday', 'savings', 'credit_card', 'investment_cash', 'brokerage', 'superannuation', 'cash')
  ),
  masked_number text not null default '',
  balance_cents bigint not null default 0,
  available_balance_cents bigint,
  currency text not null default 'AUD',
  connected boolean not null default false,
  include_in_net_worth boolean not null default true,
  include_in_cash_flow boolean not null default true,
  hidden boolean not null default false,
  archived boolean not null default false,
  last_synced_at timestamptz,
  notes text not null default ''
);

create table if not exists categorisation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  field text not null check (field in ('merchant', 'description')),
  operator text not null check (operator in ('contains', 'equals')),
  value text not null,
  category_id uuid not null references categories (id) on delete cascade,
  priority integer not null default 100,
  enabled boolean not null default true
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  provider_id text,
  original_description text not null,
  merchant text not null default '',
  amount_cents bigint not null,
  currency text not null default 'AUD',
  transaction_date date not null,
  posting_date date not null,
  category_id uuid references categories (id) on delete set null,
  notes text not null default '',
  tags text[] not null default '{}',
  status text not null default 'posted' check (status in ('pending', 'posted')),
  source text not null default 'manual' check (source in ('demo-bank', 'csv', 'manual')),
  recurring boolean not null default false,
  transfer boolean not null default false,
  reimbursement boolean not null default false,
  refund boolean not null default false,
  excluded_from_reports boolean not null default false,
  excluded_from_cash_flow boolean not null default false,
  needs_review boolean not null default false,
  manually_categorised boolean not null default false,
  rule_id uuid references categorisation_rules (id) on delete set null,
  linked_transfer_id uuid,
  splits jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create index if not exists transactions_account_idx on transactions (account_id);
create index if not exists transactions_date_idx on transactions (transaction_date desc);
create index if not exists transactions_category_idx on transactions (category_id);

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  target_cents bigint not null check (target_cents > 0),
  current_cents bigint not null default 0,
  target_date date not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  linked_account_id uuid references accounts (id) on delete set null,
  allocated_cents bigint,
  contribution_frequency text not null check (contribution_frequency in ('weekly', 'fortnightly', 'monthly')),
  planned_contribution_cents bigint not null default 0,
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists investment_holdings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ticker text not null,
  exchange text not null,
  asset_class text not null,
  units numeric(20, 6) not null,
  average_price_cents bigint not null,
  current_price_cents bigint not null,
  platform text not null,
  currency text not null default 'AUD',
  notes text not null default '',
  last_price_update date not null,
  archived boolean not null default false
);

create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('credit_card', 'hecs_help', 'personal_loan', 'car_loan', 'bnpl', 'other')),
  balance_cents bigint not null,
  interest_rate numeric(6, 4),
  minimum_repayment_cents bigint,
  repayment_frequency text,
  due_date date,
  include_in_net_worth boolean not null default true,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists manual_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  value_cents bigint not null,
  include_in_net_worth boolean not null default true,
  liquid boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists spending_plans (
  month text primary key,
  overall_target_cents bigint not null,
  intended_savings_rate numeric(6, 4) not null default 0,
  intended_savings_cents bigint not null default 0,
  intended_investment_cents bigint not null default 0,
  categories jsonb not null default '[]'
);

create table if not exists recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  expected_cents bigint not null,
  min_cents bigint not null,
  max_cents bigint not null,
  frequency text not null check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annual', 'custom')),
  next_expected_date date not null,
  category_id uuid references categories (id) on delete set null,
  account_id uuid references accounts (id) on delete set null,
  active boolean not null default true,
  confidence numeric(4, 3) not null default 1,
  last_observed_date date
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  amount_cents bigint not null,
  frequency text not null check (frequency in ('monthly', 'quarterly', 'annual')),
  next_charge_date date,
  account_id uuid references accounts (id) on delete set null,
  category_id uuid references categories (id) on delete set null,
  previous_amount_cents bigint,
  last_observed_date date,
  cancelled boolean not null default false,
  notes text not null default ''
);

create table if not exists net_worth_snapshots (
  date date primary key,
  assets_cents bigint not null,
  liabilities_cents bigint not null,
  net_worth_cents bigint not null
);

create table if not exists pay_allocations (
  id uuid primary key default gen_random_uuid(),
  pay_date date not null,
  pay_cents bigint not null,
  cadence text not null check (cadence in ('weekly', 'fortnightly', 'monthly')),
  bills_cents bigint not null,
  investments_cents bigint not null,
  savings_cents bigint not null,
  discretionary_cents bigint not null,
  goal_splits jsonb not null default '[]',
  applied boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists monthly_reviews (
  month text primary key,
  reflection text not null default '',
  unusual_spending_explanation text not null default '',
  next_month_priorities text not null default '',
  planned_changes text not null default '',
  income_notes text not null default '',
  completed_at timestamptz not null default now()
);

create table if not exists app_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  level text not null check (level in ('info', 'review', 'success')),
  created_at timestamptz not null default now(),
  dismissed boolean not null default false,
  href text
);

-- Singleton tables: exactly one row each, enforced by a fixed boolean key.
create table if not exists user_preferences (
  id boolean primary key default true check (id),
  currency text not null default 'AUD',
  date_format text not null default 'DD/MM/YYYY',
  financial_year_starts_in_july boolean not null default true,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notifications jsonb not null default '{}'
);

create table if not exists bank_connection (
  id boolean primary key default true check (id),
  connection_id text not null default 'primary',
  institution text not null default '',
  status text not null default 'disconnected' check (status in ('connected', 'expired', 'disconnected')),
  last_synced_at timestamptz,
  environment text not null default 'live'
);

insert into user_preferences (id) values (true) on conflict (id) do nothing;
insert into bank_connection (id) values (true) on conflict (id) do nothing;
