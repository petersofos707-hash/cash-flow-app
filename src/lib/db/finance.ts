import "server-only";
import { db } from "./client";
import type {
  Account,
  AppNotification,
  Category,
  CategorisationRule,
  FinanceState,
  InvestmentHolding,
  Liability,
  ManualAsset,
  MonthlyReview,
  NetWorthSnapshot,
  PayAllocation,
  RecurringTransaction,
  SavingsGoal,
  SpendingPlan,
  Subscription,
  Transaction,
} from "@/lib/domain/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function dateStr(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value);
}

function isoOrUndefined(value: unknown): string | undefined {
  return value ? new Date(value as string).toISOString() : undefined;
}

// --- Row -> domain mappers --------------------------------------------------

function toCategory(row: Row): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    colour: row.colour,
    icon: row.icon,
    archived: row.archived,
    includeInReports: row.include_in_reports,
  };
}

function toAccount(row: Row): Account {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    maskedNumber: row.masked_number,
    balanceCents: row.balance_cents,
    availableBalanceCents: row.available_balance_cents ?? undefined,
    currency: row.currency,
    connected: row.connected,
    includeInNetWorth: row.include_in_net_worth,
    includeInCashFlow: row.include_in_cash_flow,
    hidden: row.hidden,
    archived: row.archived,
    lastSyncedAt: isoOrUndefined(row.last_synced_at),
    notes: row.notes,
  };
}

function toRule(row: Row): CategorisationRule {
  return {
    id: row.id,
    name: row.name,
    field: row.field,
    operator: row.operator,
    value: row.value,
    categoryId: row.category_id,
    priority: row.priority,
    enabled: row.enabled,
  };
}

function toTransaction(row: Row): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    providerId: row.provider_id ?? undefined,
    originalDescription: row.original_description,
    merchant: row.merchant,
    amountCents: row.amount_cents,
    currency: row.currency,
    transactionDate: dateStr(row.transaction_date),
    postingDate: dateStr(row.posting_date),
    categoryId: row.category_id,
    notes: row.notes,
    tags: row.tags ?? [],
    status: row.status,
    source: row.source,
    recurring: row.recurring,
    transfer: row.transfer,
    reimbursement: row.reimbursement,
    refund: row.refund,
    excludedFromReports: row.excluded_from_reports,
    excludedFromCashFlow: row.excluded_from_cash_flow,
    needsReview: row.needs_review,
    manuallyCategorised: row.manually_categorised,
    ruleId: row.rule_id ?? undefined,
    linkedTransferId: row.linked_transfer_id ?? undefined,
    splits: row.splits ?? [],
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toGoal(row: Row): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetCents: row.target_cents,
    currentCents: row.current_cents,
    targetDate: dateStr(row.target_date),
    priority: row.priority,
    linkedAccountId: row.linked_account_id ?? undefined,
    allocatedCents: row.allocated_cents ?? undefined,
    contributionFrequency: row.contribution_frequency,
    plannedContributionCents: row.planned_contribution_cents,
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    completedAt: isoOrUndefined(row.completed_at),
  };
}

function toHolding(row: Row): InvestmentHolding {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    exchange: row.exchange,
    assetClass: row.asset_class,
    units: Number(row.units),
    averagePriceCents: row.average_price_cents,
    currentPriceCents: row.current_price_cents,
    platform: row.platform,
    currency: row.currency,
    notes: row.notes,
    lastPriceUpdate: dateStr(row.last_price_update),
    archived: row.archived,
  };
}

function toLiability(row: Row): Liability {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balanceCents: row.balance_cents,
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : undefined,
    minimumRepaymentCents: row.minimum_repayment_cents ?? undefined,
    repaymentFrequency: row.repayment_frequency ?? undefined,
    dueDate: row.due_date ? dateStr(row.due_date) : undefined,
    includeInNetWorth: row.include_in_net_worth,
    notes: row.notes,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toAsset(row: Row): ManualAsset {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    valueCents: row.value_cents,
    includeInNetWorth: row.include_in_net_worth,
    liquid: row.liquid,
    notes: row.notes,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toPlan(row: Row): SpendingPlan {
  return {
    month: row.month,
    overallTargetCents: row.overall_target_cents,
    intendedSavingsRate: Number(row.intended_savings_rate),
    intendedSavingsCents: row.intended_savings_cents,
    intendedInvestmentCents: row.intended_investment_cents,
    categories: row.categories ?? [],
  };
}

function toRecurring(row: Row): RecurringTransaction {
  return {
    id: row.id,
    merchant: row.merchant,
    expectedCents: row.expected_cents,
    minCents: row.min_cents,
    maxCents: row.max_cents,
    frequency: row.frequency,
    nextExpectedDate: dateStr(row.next_expected_date),
    categoryId: row.category_id,
    accountId: row.account_id,
    active: row.active,
    confidence: Number(row.confidence),
    lastObservedDate: row.last_observed_date ? dateStr(row.last_observed_date) : "",
  };
}

function toSubscription(row: Row): Subscription {
  return {
    id: row.id,
    merchant: row.merchant,
    amountCents: row.amount_cents,
    frequency: row.frequency,
    nextChargeDate: row.next_charge_date ? dateStr(row.next_charge_date) : "",
    accountId: row.account_id,
    categoryId: row.category_id,
    previousAmountCents: row.previous_amount_cents ?? undefined,
    lastObservedDate: row.last_observed_date ? dateStr(row.last_observed_date) : "",
    cancelled: row.cancelled,
    notes: row.notes,
  };
}

function toSnapshot(row: Row): NetWorthSnapshot {
  return {
    date: dateStr(row.date),
    assetsCents: row.assets_cents,
    liabilitiesCents: row.liabilities_cents,
    netWorthCents: row.net_worth_cents,
  };
}

function toPayAllocation(row: Row): PayAllocation {
  return {
    id: row.id,
    payDate: dateStr(row.pay_date),
    payCents: row.pay_cents,
    cadence: row.cadence,
    billsCents: row.bills_cents,
    investmentsCents: row.investments_cents,
    savingsCents: row.savings_cents,
    discretionaryCents: row.discretionary_cents,
    goalSplits: row.goal_splits ?? [],
    applied: row.applied,
    appliedAt: isoOrUndefined(row.applied_at),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toReview(row: Row): MonthlyReview {
  return {
    month: row.month,
    reflection: row.reflection,
    unusualSpendingExplanation: row.unusual_spending_explanation,
    nextMonthPriorities: row.next_month_priorities,
    plannedChanges: row.planned_changes,
    incomeNotes: row.income_notes,
    completedAt: new Date(row.completed_at).toISOString(),
  };
}

function toNotification(row: Row): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    level: row.level,
    createdAt: new Date(row.created_at).toISOString(),
    dismissed: row.dismissed,
    href: row.href ?? undefined,
  };
}

// --- Full state load ---------------------------------------------------------

export async function loadFinanceState(): Promise<FinanceState> {
  const sql = db();
  const [
    categories,
    accounts,
    rules,
    transactions,
    goals,
    holdings,
    liabilities,
    assets,
    plans,
    recurring,
    subscriptions,
    snapshots,
    payAllocations,
    reviews,
    notifications,
    preferencesRows,
    connectionRows,
  ] = await Promise.all([
    sql`select * from categories order by name`,
    sql`select * from accounts order by name`,
    sql`select * from categorisation_rules order by priority`,
    sql`select * from transactions order by transaction_date desc, updated_at desc`,
    sql`select * from savings_goals order by created_at`,
    sql`select * from investment_holdings order by name`,
    sql`select * from liabilities order by name`,
    sql`select * from manual_assets order by name`,
    sql`select * from spending_plans order by month desc`,
    sql`select * from recurring_transactions order by next_expected_date`,
    sql`select * from subscriptions order by next_charge_date nulls last`,
    sql`select * from net_worth_snapshots order by date`,
    sql`select * from pay_allocations order by pay_date desc, created_at desc`,
    sql`select * from monthly_reviews order by month desc`,
    sql`select * from app_notifications order by created_at desc`,
    sql`select * from user_preferences limit 1`,
    sql`select * from bank_connection limit 1`,
  ]);
  const preferences = preferencesRows[0];
  const connection = connectionRows[0];
  return {
    fictional: false,
    categories: categories.map(toCategory),
    accounts: accounts.map(toAccount),
    transactions: transactions.map(toTransaction),
    rules: rules.map(toRule),
    goals: goals.map(toGoal),
    holdings: holdings.map(toHolding),
    liabilities: liabilities.map(toLiability),
    assets: assets.map(toAsset),
    plans: plans.map(toPlan),
    recurring: recurring.map(toRecurring),
    subscriptions: subscriptions.map(toSubscription),
    netWorthSnapshots: snapshots.map(toSnapshot),
    payAllocations: payAllocations.map(toPayAllocation),
    reviews: reviews.map(toReview),
    notifications: notifications.map(toNotification),
    preferences: {
      currency: preferences.currency,
      dateFormat: preferences.date_format,
      financialYearStartsInJuly: preferences.financial_year_starts_in_july,
      theme: preferences.theme,
      notifications: preferences.notifications ?? {},
    },
    bankConnection: {
      id: connection.connection_id,
      institution: connection.institution,
      status: connection.status,
      lastSyncedAt: connection.last_synced_at
        ? new Date(connection.last_synced_at).toISOString()
        : "",
      environment: "live",
    },
  };
}

// --- Mutations ---------------------------------------------------------------
// Every function below performs one write. Callers (the /api/finance/action
// route) reload the full state afterwards with loadFinanceState(), so these
// intentionally return void rather than trying to patch the client's copy.

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

export async function dbUpdateTransaction(id: string, patch: Partial<Transaction>) {
  const sql = db();
  const current = (await sql`select * from transactions where id = ${id}`)[0];
  if (!current) return;
  const next = { ...toTransaction(current), ...patch };
  await sql`
    update transactions set
      account_id = ${next.accountId},
      provider_id = ${next.providerId ?? null},
      original_description = ${next.originalDescription},
      merchant = ${next.merchant},
      amount_cents = ${next.amountCents},
      currency = ${next.currency},
      transaction_date = ${next.transactionDate},
      posting_date = ${next.postingDate},
      category_id = ${next.categoryId},
      notes = ${next.notes},
      tags = ${next.tags},
      status = ${next.status},
      source = ${next.source},
      recurring = ${next.recurring},
      transfer = ${next.transfer},
      reimbursement = ${next.reimbursement},
      refund = ${next.refund},
      excluded_from_reports = ${next.excludedFromReports},
      excluded_from_cash_flow = ${next.excludedFromCashFlow},
      needs_review = ${next.needsReview},
      manually_categorised = ${next.manuallyCategorised},
      rule_id = ${next.ruleId ?? null},
      linked_transfer_id = ${next.linkedTransferId ?? null},
      splits = ${json(next.splits)}::jsonb,
      updated_at = now()
    where id = ${id}
  `;
}

export async function dbAddTransaction(transaction: Omit<Transaction, "id" | "updatedAt">) {
  const sql = db();
  await sql`
    insert into transactions (
      account_id, provider_id, original_description, merchant, amount_cents, currency,
      transaction_date, posting_date, category_id, notes, tags, status, source, recurring,
      transfer, reimbursement, refund, excluded_from_reports, excluded_from_cash_flow,
      needs_review, manually_categorised, rule_id, linked_transfer_id, splits
    ) values (
      ${transaction.accountId}, ${transaction.providerId ?? null}, ${transaction.originalDescription},
      ${transaction.merchant}, ${transaction.amountCents}, ${transaction.currency},
      ${transaction.transactionDate}, ${transaction.postingDate}, ${transaction.categoryId},
      ${transaction.notes}, ${transaction.tags}, ${transaction.status}, ${transaction.source},
      ${transaction.recurring}, ${transaction.transfer}, ${transaction.reimbursement},
      ${transaction.refund}, ${transaction.excludedFromReports}, ${transaction.excludedFromCashFlow},
      ${transaction.needsReview}, ${transaction.manuallyCategorised}, ${transaction.ruleId ?? null},
      ${transaction.linkedTransferId ?? null}, ${json(transaction.splits)}::jsonb
    )
  `;
}

export async function dbBulkCategorise(ids: string[], categoryId: string) {
  const sql = db();
  await sql`
    update transactions
    set category_id = ${categoryId}, manually_categorised = true, needs_review = false, updated_at = now()
    where id in ${sql(ids)}
  `;
}

export async function dbSplitTransaction(id: string, categoryIds: [string, string]) {
  const sql = db();
  const current = (await sql`select amount_cents from transactions where id = ${id}`)[0];
  if (!current) return;
  const amountCents = current.amount_cents as number;
  const first = Math.trunc(amountCents / 2);
  const splits = [
    { id: crypto.randomUUID(), categoryId: categoryIds[0], amountCents: first },
    { id: crypto.randomUUID(), categoryId: categoryIds[1], amountCents: amountCents - first },
  ];
  await sql`
    update transactions
    set splits = ${json(splits)}::jsonb, manually_categorised = true, updated_at = now()
    where id = ${id}
  `;
}

export async function dbAddRule(rule: Omit<CategorisationRule, "id">) {
  const sql = db();
  await sql`
    insert into categorisation_rules (name, field, operator, value, category_id, priority, enabled)
    values (${rule.name}, ${rule.field}, ${rule.operator}, ${rule.value}, ${rule.categoryId}, ${rule.priority}, ${rule.enabled})
  `;
}

export async function dbUpdateRule(id: string, patch: Partial<CategorisationRule>) {
  const sql = db();
  const current = (await sql`select * from categorisation_rules where id = ${id}`)[0];
  if (!current) return;
  const next = { ...toRule(current), ...patch };
  await sql`
    update categorisation_rules set
      name = ${next.name}, field = ${next.field}, operator = ${next.operator}, value = ${next.value},
      category_id = ${next.categoryId}, priority = ${next.priority}, enabled = ${next.enabled}
    where id = ${id}
  `;
}

export async function dbAddGoal(goal: Omit<SavingsGoal, "id" | "createdAt">) {
  const sql = db();
  await sql`
    insert into savings_goals (
      name, description, target_cents, current_cents, target_date, priority, linked_account_id,
      allocated_cents, contribution_frequency, planned_contribution_cents, notes, status, completed_at
    ) values (
      ${goal.name}, ${goal.description}, ${goal.targetCents}, ${goal.currentCents}, ${goal.targetDate},
      ${goal.priority}, ${goal.linkedAccountId ?? null}, ${goal.allocatedCents ?? null},
      ${goal.contributionFrequency}, ${goal.plannedContributionCents}, ${goal.notes}, ${goal.status},
      ${goal.completedAt ?? null}
    )
  `;
}

export async function dbUpdateGoal(id: string, patch: Partial<SavingsGoal>) {
  const sql = db();
  const current = (await sql`select * from savings_goals where id = ${id}`)[0];
  if (!current) return;
  const next = { ...toGoal(current), ...patch };
  await sql`
    update savings_goals set
      name = ${next.name}, description = ${next.description}, target_cents = ${next.targetCents},
      current_cents = ${next.currentCents}, target_date = ${next.targetDate}, priority = ${next.priority},
      linked_account_id = ${next.linkedAccountId ?? null}, allocated_cents = ${next.allocatedCents ?? null},
      contribution_frequency = ${next.contributionFrequency},
      planned_contribution_cents = ${next.plannedContributionCents}, notes = ${next.notes},
      status = ${next.status}, completed_at = ${next.completedAt ?? null}
    where id = ${id}
  `;
}

export async function dbContributeToGoal(id: string, cents: number) {
  const sql = db();
  const current = (await sql`select * from savings_goals where id = ${id}`)[0];
  if (!current) return;
  const goal = toGoal(current);
  const currentCents = Math.min(goal.currentCents + cents, goal.targetCents);
  const completed = currentCents >= goal.targetCents;
  await sql`
    update savings_goals set
      current_cents = ${currentCents},
      status = ${completed ? "completed" : goal.status},
      completed_at = ${completed ? new Date().toISOString() : (goal.completedAt ?? null)}
    where id = ${id}
  `;
}

export async function dbRecordPayAllocation(allocation: Omit<PayAllocation, "id" | "createdAt">) {
  const sql = db();
  await sql`
    insert into pay_allocations (
      pay_date, pay_cents, cadence, bills_cents, investments_cents, savings_cents,
      discretionary_cents, goal_splits, applied, applied_at
    ) values (
      ${allocation.payDate}, ${allocation.payCents}, ${allocation.cadence}, ${allocation.billsCents},
      ${allocation.investmentsCents}, ${allocation.savingsCents}, ${allocation.discretionaryCents},
      ${json(allocation.goalSplits)}::jsonb, ${allocation.applied}, ${allocation.appliedAt ?? null}
    )
  `;
  if (allocation.applied) {
    for (const split of allocation.goalSplits) {
      await dbContributeToGoal(split.goalId, split.cents);
    }
  }
}

export async function dbRemovePayAllocation(id: string) {
  await db()`delete from pay_allocations where id = ${id}`;
}

export async function dbAddHolding(holding: Omit<InvestmentHolding, "id" | "archived">) {
  const sql = db();
  await sql`
    insert into investment_holdings (
      name, ticker, exchange, asset_class, units, average_price_cents, current_price_cents,
      platform, currency, notes, last_price_update
    ) values (
      ${holding.name}, ${holding.ticker}, ${holding.exchange}, ${holding.assetClass}, ${holding.units},
      ${holding.averagePriceCents}, ${holding.currentPriceCents}, ${holding.platform}, ${holding.currency},
      ${holding.notes}, ${holding.lastPriceUpdate}
    )
  `;
}

export async function dbUpdateHolding(id: string, patch: Partial<InvestmentHolding>) {
  const sql = db();
  const current = (await sql`select * from investment_holdings where id = ${id}`)[0];
  if (!current) return;
  const next = { ...toHolding(current), ...patch };
  await sql`
    update investment_holdings set
      name = ${next.name}, ticker = ${next.ticker}, exchange = ${next.exchange},
      asset_class = ${next.assetClass}, units = ${next.units},
      average_price_cents = ${next.averagePriceCents}, current_price_cents = ${next.currentPriceCents},
      platform = ${next.platform}, currency = ${next.currency}, notes = ${next.notes},
      last_price_update = ${next.lastPriceUpdate}, archived = ${next.archived}
    where id = ${id}
  `;
}

export async function dbAddAccount(account: Omit<Account, "id">) {
  const sql = db();
  await sql`
    insert into accounts (
      name, institution, type, masked_number, balance_cents, available_balance_cents, currency,
      connected, include_in_net_worth, include_in_cash_flow, hidden, archived, last_synced_at, notes
    ) values (
      ${account.name}, ${account.institution}, ${account.type}, ${account.maskedNumber},
      ${account.balanceCents}, ${account.availableBalanceCents ?? null}, ${account.currency},
      ${account.connected}, ${account.includeInNetWorth}, ${account.includeInCashFlow}, ${account.hidden},
      ${account.archived}, ${account.lastSyncedAt ?? null}, ${account.notes ?? ""}
    )
  `;
}

export async function dbUpdateAccount(id: string, patch: Partial<Account>) {
  const sql = db();
  const current = (await sql`select * from accounts where id = ${id}`)[0];
  if (!current) return;
  const next = { ...toAccount(current), ...patch };
  await sql`
    update accounts set
      name = ${next.name}, institution = ${next.institution}, type = ${next.type},
      masked_number = ${next.maskedNumber}, balance_cents = ${next.balanceCents},
      available_balance_cents = ${next.availableBalanceCents ?? null}, currency = ${next.currency},
      connected = ${next.connected}, include_in_net_worth = ${next.includeInNetWorth},
      include_in_cash_flow = ${next.includeInCashFlow}, hidden = ${next.hidden},
      archived = ${next.archived}, last_synced_at = ${next.lastSyncedAt ?? null}, notes = ${next.notes ?? ""}
    where id = ${id}
  `;
}

export async function dbAddLiability(liability: Omit<Liability, "id">) {
  const sql = db();
  await sql`
    insert into liabilities (
      name, type, balance_cents, interest_rate, minimum_repayment_cents, repayment_frequency,
      due_date, include_in_net_worth, notes
    ) values (
      ${liability.name}, ${liability.type}, ${liability.balanceCents}, ${liability.interestRate ?? null},
      ${liability.minimumRepaymentCents ?? null}, ${liability.repaymentFrequency ?? null},
      ${liability.dueDate ?? null}, ${liability.includeInNetWorth}, ${liability.notes}
    )
  `;
}

export async function dbAddAsset(asset: Omit<ManualAsset, "id">) {
  const sql = db();
  await sql`
    insert into manual_assets (name, type, value_cents, include_in_net_worth, liquid, notes)
    values (${asset.name}, ${asset.type}, ${asset.valueCents}, ${asset.includeInNetWorth}, ${asset.liquid}, ${asset.notes})
  `;
}

export async function dbUpdatePlan(patch: Partial<SpendingPlan>) {
  const sql = db();
  const rows = await sql`select * from spending_plans order by month desc limit 1`;
  if (rows.length === 0) return;
  const next = { ...toPlan(rows[0]), ...patch };
  await sql`
    update spending_plans set
      overall_target_cents = ${next.overallTargetCents},
      intended_savings_rate = ${next.intendedSavingsRate},
      intended_savings_cents = ${next.intendedSavingsCents},
      intended_investment_cents = ${next.intendedInvestmentCents},
      categories = ${json(next.categories)}::jsonb
    where month = ${next.month}
  `;
}

export async function dbSaveReview(review: MonthlyReview) {
  const sql = db();
  await sql`
    insert into monthly_reviews (month, reflection, unusual_spending_explanation, next_month_priorities, planned_changes, income_notes, completed_at)
    values (${review.month}, ${review.reflection}, ${review.unusualSpendingExplanation}, ${review.nextMonthPriorities}, ${review.plannedChanges}, ${review.incomeNotes}, ${review.completedAt})
    on conflict (month) do update set
      reflection = excluded.reflection,
      unusual_spending_explanation = excluded.unusual_spending_explanation,
      next_month_priorities = excluded.next_month_priorities,
      planned_changes = excluded.planned_changes,
      income_notes = excluded.income_notes,
      completed_at = excluded.completed_at
  `;
}

export async function dbAddCategory(category: Omit<Category, "id">) {
  const sql = db();
  await sql`
    insert into categories (name, kind, colour, icon, archived, include_in_reports)
    values (${category.name}, ${category.kind}, ${category.colour}, ${category.icon}, ${category.archived ?? false}, ${category.includeInReports})
  `;
}

export async function dbDismissNotification(id: string) {
  await db()`update app_notifications set dismissed = true where id = ${id}`;
}

export async function dbRefreshConnection() {
  const sql = db();
  await sql`update bank_connection set status = 'connected', last_synced_at = now()`;
  await sql`update accounts set last_synced_at = now() where connected = true`;
}

export async function dbSetConnectionStatus(status: FinanceState["bankConnection"]["status"]) {
  const sql = db();
  await sql`update bank_connection set status = ${status}`;
  await sql`update accounts set connected = ${status === "connected"}`;
}

export async function dbUpdatePreferences(patch: Partial<FinanceState["preferences"]>) {
  const sql = db();
  const rows = await sql`select * from user_preferences limit 1`;
  const current = rows[0];
  const next = {
    currency: patch.currency ?? current.currency,
    dateFormat: patch.dateFormat ?? current.date_format,
    financialYearStartsInJuly:
      patch.financialYearStartsInJuly ?? current.financial_year_starts_in_july,
    theme: patch.theme ?? current.theme,
    notifications: patch.notifications ?? current.notifications ?? {},
  };
  await sql`
    update user_preferences set
      currency = ${next.currency}, date_format = ${next.dateFormat},
      financial_year_starts_in_july = ${next.financialYearStartsInJuly}, theme = ${next.theme},
      notifications = ${json(next.notifications)}::jsonb
  `;
}

// Unlike demo mode's deleteAllData (which resets to the fictional seed),
// this keeps categories, rules and preferences as the owner configured them
// and only clears transactional/derived data.
export async function dbDeleteAllData() {
  const sql = db();
  await sql`delete from transactions`;
  await sql`delete from accounts`;
  await sql`delete from savings_goals`;
  await sql`delete from investment_holdings`;
  await sql`delete from liabilities`;
  await sql`delete from manual_assets`;
  await sql`delete from recurring_transactions`;
  await sql`delete from subscriptions`;
  await sql`delete from net_worth_snapshots`;
  await sql`delete from pay_allocations`;
  await sql`delete from monthly_reviews`;
  await sql`delete from app_notifications`;
  await sql`update bank_connection set status = 'disconnected', last_synced_at = null`;
}
