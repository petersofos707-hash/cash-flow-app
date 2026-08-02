-- Cash Flow App initial schema. Monetary values are integer minor units (cents).
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  currency text not null default 'AUD', date_format text not null default 'DD/MM/YYYY', financial_year_start_month smallint not null default 7 check (financial_year_start_month between 1 and 12),
  appearance text not null default 'system' check (appearance in ('light','dark','system')), notification_settings jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id)
);
create table public.financial_institutions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'basiq', external_id text, name text not null, logo_url text, country_code text not null default 'AU', metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id, provider, external_id)
);
create table public.financial_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  institution_id uuid references public.financial_institutions(id) on delete set null, provider text not null default 'basiq', external_id text not null,
  provider_user_id text, status text not null default 'pending', consent_expires_at timestamptz, last_synced_at timestamptz, last_error_code text,
  encrypted_token_reference text, metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id, provider, external_id)
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  connection_id uuid references public.financial_connections(id) on delete set null, external_id text, name text not null, local_name text, institution_name text,
  account_type text not null, masked_number text, balance_cents bigint not null default 0, available_balance_cents bigint, currency text not null default 'AUD',
  include_in_net_worth boolean not null default true, include_in_cash_flow boolean not null default true, hidden_from_dashboard boolean not null default false,
  active boolean not null default true, archived boolean not null default false, source text not null default 'manual', last_synced_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id, connection_id, external_id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null, name text not null, classification text not null check (classification in ('income','essential','discretionary','transfer','wealth')),
  icon text, colour text, sort_order integer not null default 0, archived boolean not null default false, include_in_reports boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id, parent_id, name)
);
create table public.raw_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, connection_id uuid references public.financial_connections(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade, provider text not null, external_id text not null, payload jsonb not null,
  payload_hash text not null, pending boolean not null default false, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id, provider, external_id)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, raw_transaction_id uuid references public.raw_transactions(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade, category_id uuid references public.categories(id) on delete set null,
  original_description text not null, merchant_name text, amount_cents bigint not null, currency text not null default 'AUD', transaction_date date not null, posting_date date,
  direction text not null check (direction in ('debit','credit')), status text not null default 'posted' check (status in ('pending','posted')),
  notes text, tags text[] not null default '{}', recurring boolean not null default false, transfer boolean not null default false, reimbursement boolean not null default false,
  refund boolean not null default false, excluded_from_reports boolean not null default false, excluded_from_cash_flow boolean not null default false,
  needs_review boolean not null default false, manually_categorised boolean not null default false, rule_id uuid, source text not null default 'manual',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict, amount_cents bigint not null, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.categorisation_rules (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, name text not null,
  conditions jsonb not null, category_id uuid not null references public.categories(id) on delete restrict, priority integer not null default 100,
  enabled boolean not null default true, apply_to_existing boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.transactions add constraint transactions_rule_id_fkey foreign key (rule_id) references public.categorisation_rules(id) on delete set null;
create table public.transfer_links (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  source_transaction_id uuid not null references public.transactions(id) on delete cascade, destination_transaction_id uuid not null references public.transactions(id) on delete cascade,
  confidence numeric(4,3), confirmed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (source_transaction_id <> destination_transaction_id), unique(user_id, source_transaction_id, destination_transaction_id)
);
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, merchant text not null,
  expected_cents bigint not null, minimum_cents bigint, maximum_cents bigint, frequency text not null, custom_interval_days integer, next_expected_date date,
  category_id uuid references public.categories(id) on delete set null, account_id uuid references public.accounts(id) on delete set null, active boolean not null default true,
  cancelled boolean not null default false, last_observed_date date, confidence numeric(4,3), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, recurring_transaction_id uuid references public.recurring_transactions(id) on delete set null,
  merchant text not null, amount_cents bigint not null, previous_amount_cents bigint, frequency text not null, next_charge_date date,
  account_id uuid references public.accounts(id) on delete set null, category_id uuid references public.categories(id) on delete set null, last_observed_date date,
  trial_ends_at date, cancelled boolean not null default false, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, name text not null, description text,
  target_cents bigint not null check (target_cents > 0), current_cents bigint not null default 0 check (current_cents >= 0), target_date date, priority text not null default 'medium',
  contribution_frequency text, planned_contribution_cents bigint, notes text, status text not null default 'active', completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.goal_allocations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, goal_id uuid not null references public.savings_goals(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade, allocated_cents bigint not null check (allocated_cents >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(goal_id, account_id)
);
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, goal_id uuid not null references public.savings_goals(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null, amount_cents bigint not null check (amount_cents > 0), contribution_date date not null, source text not null default 'manual', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.investment_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, account_id uuid references public.accounts(id) on delete set null,
  platform text not null, name text not null, currency text not null default 'AUD', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.investment_holdings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, investment_account_id uuid references public.investment_accounts(id) on delete set null,
  asset_name text not null, ticker text, exchange text, asset_class text not null, units numeric(24,8) not null default 0,
  average_price_cents bigint, cost_basis_cents bigint, current_price_cents bigint, current_value_cents bigint, currency text not null default 'AUD', notes text,
  last_price_update timestamptz, archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, holding_id uuid not null references public.investment_holdings(id) on delete cascade,
  transaction_type text not null, trade_date date not null, units numeric(24,8), price_cents bigint, amount_cents bigint not null, brokerage_cents bigint not null default 0,
  currency text not null default 'AUD', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.market_prices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, ticker text not null, exchange text,
  price_cents bigint not null, currency text not null, provider text not null, price_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id, ticker, exchange, provider, price_at)
);
create table public.superannuation_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, fund_name text not null, balance_cents bigint not null,
  employer_contributions_cents bigint not null default 0, personal_contributions_cents bigint not null default 0, fees_cents bigint not null default 0, insurance_deductions_cents bigint not null default 0,
  investment_option text, notes text, last_updated date not null, include_in_net_worth boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.manually_valued_assets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, name text not null, asset_type text not null,
  value_cents bigint not null, currency text not null default 'AUD', liquid boolean not null default false, include_in_net_worth boolean not null default true, notes text, valued_at date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.liabilities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, account_id uuid references public.accounts(id) on delete set null,
  name text not null, liability_type text not null, balance_cents bigint not null check (balance_cents >= 0), interest_rate numeric(8,5), minimum_repayment_cents bigint,
  repayment_frequency text, due_date date, include_in_net_worth boolean not null default true, notes text, last_updated date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.monthly_spending_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, month date not null,
  overall_target_cents bigint not null, essential_target_cents bigint, discretionary_target_cents bigint, intended_savings_rate numeric(6,5), intended_savings_cents bigint,
  intended_investment_cents bigint, goal_contribution_target_cents bigint, target_mode text not null default 'fixed',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id, month)
);
create table public.spending_plan_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, plan_id uuid not null references public.monthly_spending_plans(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict, target_cents bigint not null, rollover boolean not null default false, rollover_cents bigint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(plan_id, category_id)
);
create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, snapshot_date date not null,
  assets_cents bigint not null, liabilities_cents bigint not null, net_worth_cents bigint not null, liquid_net_worth_cents bigint,
  superannuation_cents bigint, detail jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id, snapshot_date)
);
create table public.monthly_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, month date not null,
  summary jsonb not null default '{}', reflection text, unusual_spending_explanation text, next_month_priorities text, planned_changes text, income_notes text, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id, month)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, notification_type text not null,
  title text not null, message text not null, related_table text, related_id uuid, priority text not null default 'normal', read_at timestamptz, dismissed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, connection_id uuid references public.financial_connections(id) on delete cascade,
  trigger_source text not null, status text not null, attempt integer not null default 1, started_at timestamptz, completed_at timestamptz, cursor text, imported_count integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.sync_errors (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, sync_job_id uuid not null references public.sync_jobs(id) on delete cascade,
  safe_code text not null, safe_message text not null, retryable boolean not null default false, metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, event_type text not null,
  entity_type text, entity_id uuid, safe_metadata jsonb not null default '{}', ip_hash text, user_agent_hash text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.csv_import_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, import_type text not null, filename text not null,
  status text not null, column_mapping jsonb not null default '{}', total_rows integer not null default 0, imported_rows integer not null default 0, duplicate_rows integer not null default 0,
  error_rows integer not null default 0, rollback_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.export_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, export_type text not null, format text not null,
  status text not null, expires_at timestamptz, safe_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- Query paths used by dashboard, transaction review, sync and recurring processing.
create index accounts_user_active_idx on public.accounts(user_id, active) where deleted_at is null;
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc) where deleted_at is null;
create index transactions_user_account_idx on public.transactions(user_id, account_id, transaction_date desc) where deleted_at is null;
create index transactions_user_category_idx on public.transactions(user_id, category_id, transaction_date desc) where deleted_at is null;
create index transactions_review_idx on public.transactions(user_id, needs_review) where needs_review and deleted_at is null;
create index raw_transactions_account_idx on public.raw_transactions(user_id, account_id, last_seen_at desc);
create index recurring_next_idx on public.recurring_transactions(user_id, next_expected_date) where active and not cancelled and deleted_at is null;
create index subscriptions_next_idx on public.subscriptions(user_id, next_charge_date) where not cancelled and deleted_at is null;
create index sync_jobs_connection_idx on public.sync_jobs(user_id, connection_id, created_at desc);
create index audit_events_user_idx on public.audit_events(user_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.set_updated_at() from public, anon;
grant execute on function public.set_updated_at() to authenticated;

do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname = 'public' loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- RLS is enabled on every exposed table. Authenticated users can access only their own rows.
alter table public.users enable row level security;
create policy users_select_own on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_insert_own on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy users_delete_own on public.users for delete to authenticated using ((select auth.uid()) = id);

do $$ declare table_name text; begin
  for table_name in
    select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id' and table_name <> 'users'
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

-- Supabase projects created after April 2026 do not expose SQL-created tables automatically.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
