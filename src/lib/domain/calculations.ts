import type {
  FinanceState,
  InvestmentHolding,
  PayAllocationGoalSplit,
  PayFrequency,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from "./types";

export function isEligible(transaction: Transaction) {
  return (
    !transaction.transfer && !transaction.excludedFromCashFlow && transaction.status === "posted"
  );
}

export function calculateCashFlow(transactions: Transaction[]) {
  const eligible = transactions.filter(isEligible);
  const incomeCents = eligible
    .filter((item) => item.amountCents > 0 && !item.reimbursement && !item.refund)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const spendingCents = Math.abs(
    eligible
      .filter((item) => item.amountCents < 0)
      .reduce((sum, item) => sum + item.amountCents, 0),
  );
  const savingsCents = incomeCents - spendingCents;
  return {
    incomeCents,
    spendingCents,
    savingsCents,
    savingsRate: incomeCents > 0 ? savingsCents / incomeCents : 0,
  };
}

export function holdingValue(holding: InvestmentHolding) {
  return Math.round(holding.units * holding.currentPriceCents);
}

export function holdingCost(holding: InvestmentHolding) {
  return Math.round(holding.units * holding.averagePriceCents);
}

export function calculateNetWorth(state: FinanceState) {
  const accountAssetsCents = state.accounts
    .filter((account) => account.includeInNetWorth && !account.archived)
    .reduce((sum, account) => sum + Math.max(account.balanceCents, 0), 0);
  const accountLiabilitiesCents = state.accounts
    .filter((account) => account.includeInNetWorth && !account.archived)
    .reduce((sum, account) => sum + Math.abs(Math.min(account.balanceCents, 0)), 0);
  const investmentsCents = state.holdings
    .filter((holding) => !holding.archived)
    .reduce((sum, holding) => sum + holdingValue(holding), 0);
  const manualAssetsCents = state.assets
    .filter((asset) => asset.includeInNetWorth)
    .reduce((sum, asset) => sum + asset.valueCents, 0);
  const liabilitiesCents =
    accountLiabilitiesCents +
    state.liabilities
      .filter((liability) => liability.includeInNetWorth)
      .reduce((sum, liability) => sum + liability.balanceCents, 0);
  const assetsCents = accountAssetsCents + investmentsCents + manualAssetsCents;
  const superCents = state.assets
    .filter((asset) => asset.type === "superannuation" && asset.includeInNetWorth)
    .reduce((sum, asset) => sum + asset.valueCents, 0);
  const liquidCents =
    state.accounts
      .filter(
        (account) =>
          account.includeInNetWorth &&
          !account.archived &&
          ["everyday", "savings", "cash", "investment_cash"].includes(account.type),
      )
      .reduce((sum, account) => sum + Math.max(account.balanceCents, 0), 0) -
    state.liabilities
      .filter((liability) => liability.type === "credit_card" && liability.includeInNetWorth)
      .reduce((sum, liability) => sum + liability.balanceCents, 0);
  return {
    assetsCents,
    liabilitiesCents,
    netWorthCents: assetsCents - liabilitiesCents,
    investmentsCents,
    superCents,
    liquidCents,
    excludingSuperCents: assetsCents - liabilitiesCents - superCents,
  };
}

export function calculateWealthBuilding(state: FinanceState, transactions: Transaction[]) {
  const cashFlow = calculateCashFlow(transactions);
  const wealthCategoryIds = new Set(
    state.categories
      .filter((category) => category.kind === "wealth")
      .map((category) => category.id),
  );
  const wealthBuildingCents = Math.abs(
    transactions
      .filter((transaction) => wealthCategoryIds.has(transaction.categoryId))
      .reduce((sum, transaction) => sum + Math.min(transaction.amountCents, 0), 0),
  );
  return {
    ...cashFlow,
    wealthBuildingCents,
    wealthBuildingRate: cashFlow.incomeCents > 0 ? wealthBuildingCents / cashFlow.incomeCents : 0,
  };
}

export function goalForecast(goal: SavingsGoal, today = new Date()) {
  const remainingCents = Math.max(goal.targetCents - goal.currentCents, 0);
  const target = new Date(`${goal.targetDate}T12:00:00`);
  const days = Math.max(Math.ceil((target.getTime() - today.getTime()) / 86_400_000), 1);
  const weeks = Math.max(days / 7, 1);
  const months = Math.max(days / 30.4375, 1);
  const contributionsPerMonth =
    goal.contributionFrequency === "weekly"
      ? 52 / 12
      : goal.contributionFrequency === "fortnightly"
        ? 26 / 12
        : 1;
  const projectedMonths =
    goal.plannedContributionCents > 0
      ? remainingCents / (goal.plannedContributionCents * contributionsPerMonth)
      : Number.POSITIVE_INFINITY;
  const projectedDate = Number.isFinite(projectedMonths)
    ? new Date(today.getFullYear(), today.getMonth() + Math.ceil(projectedMonths), today.getDate())
    : undefined;
  return {
    remainingCents,
    percentage: goal.targetCents > 0 ? goal.currentCents / goal.targetCents : 0,
    weeklyRequiredCents: Math.ceil(remainingCents / weeks),
    fortnightlyRequiredCents: Math.ceil(remainingCents / Math.max(weeks / 2, 1)),
    monthlyRequiredCents: Math.ceil(remainingCents / months),
    projectedDate,
    onTrack: projectedDate ? projectedDate <= target : false,
  };
}

export function findTransferCandidates(transactions: Transaction[]) {
  const candidates: Array<[string, string]> = [];
  for (let index = 0; index < transactions.length; index += 1) {
    for (let compare = index + 1; compare < transactions.length; compare += 1) {
      const first = transactions[index];
      const second = transactions[compare];
      const days = Math.abs(
        (new Date(first.transactionDate).getTime() - new Date(second.transactionDate).getTime()) /
          86_400_000,
      );
      if (
        first.accountId !== second.accountId &&
        first.amountCents === -second.amountCents &&
        days <= 3
      ) {
        candidates.push([first.id, second.id]);
      }
    }
  }
  return candidates;
}

export function applyCategorisationRules(state: FinanceState, transaction: Transaction) {
  if (transaction.manuallyCategorised) return transaction;
  const rule = [...state.rules]
    .filter((candidate) => candidate.enabled)
    .sort((a, b) => a.priority - b.priority)
    .find((candidate) => {
      const source =
        candidate.field === "merchant" ? transaction.merchant : transaction.originalDescription;
      return candidate.operator === "contains"
        ? source.toLowerCase().includes(candidate.value.toLowerCase())
        : source.toLowerCase() === candidate.value.toLowerCase();
    });
  return rule ? { ...transaction, categoryId: rule.categoryId, ruleId: rule.id } : transaction;
}

export function transactionDedupeKey(
  transaction: Pick<
    Transaction,
    "providerId" | "accountId" | "transactionDate" | "amountCents" | "originalDescription"
  >,
) {
  return transaction.providerId
    ? `provider:${transaction.providerId}`
    : `fallback:${transaction.accountId}|${transaction.transactionDate}|${transaction.amountCents}|${transaction.originalDescription.trim().toLowerCase()}`;
}

export function mergeImportedTransaction(
  existing: Transaction,
  incoming: Transaction,
): Transaction {
  return {
    ...incoming,
    id: existing.id,
    merchant: existing.merchant || incoming.merchant,
    categoryId: existing.manuallyCategorised ? existing.categoryId : incoming.categoryId,
    notes: existing.notes,
    tags: existing.tags,
    manuallyCategorised: existing.manuallyCategorised,
    needsReview: existing.manuallyCategorised ? false : incoming.needsReview,
    splits: existing.splits,
    transfer: existing.transfer || incoming.transfer,
    linkedTransferId: existing.linkedTransferId ?? incoming.linkedTransferId,
  };
}

export function splitMatchesTransaction(transaction: Transaction) {
  return (
    transaction.splits.length === 0 ||
    transaction.splits.reduce((sum, split) => sum + split.amountCents, 0) ===
      transaction.amountCents
  );
}

export function monthlyEquivalent(
  amountCents: number,
  frequency: "monthly" | "quarterly" | "annual",
) {
  if (frequency === "annual") return Math.round(amountCents / 12);
  if (frequency === "quarterly") return Math.round(amountCents / 3);
  return amountCents;
}

// --- Pay-day allocation -----------------------------------------------------
// Works out, for a given pay amount, how much should go to bills (essential
// recurring costs), savings goals, investments, and what is left over as
// discretionary spending — plus a suggested split of the savings portion
// across active goals.

export function periodsPerMonth(cadence: PayFrequency) {
  if (cadence === "weekly") return 52 / 12;
  if (cadence === "fortnightly") return 26 / 12;
  return 1;
}

export function detectPayCadence(state: FinanceState, today = new Date()): PayFrequency {
  const incomeCategoryIds = new Set(
    state.categories
      .filter((category) => category.kind === "income")
      .map((category) => category.id),
  );
  // Only recurring income (payroll-style deposits) informs cadence — one-off
  // or irregular income in the same category would otherwise skew the gaps.
  const incomeDates = state.transactions
    .filter(
      (transaction) =>
        incomeCategoryIds.has(transaction.categoryId) &&
        transaction.amountCents > 0 &&
        transaction.recurring &&
        !transaction.transfer,
    )
    .map((transaction) => transaction.transactionDate)
    .sort();
  void today;
  if (incomeDates.length < 2) return "fortnightly";
  const gaps: number[] = [];
  for (let index = 1; index < incomeDates.length; index += 1) {
    const days =
      (new Date(`${incomeDates[index]}T12:00:00`).getTime() -
        new Date(`${incomeDates[index - 1]}T12:00:00`).getTime()) /
      86_400_000;
    if (days > 0) gaps.push(days);
  }
  if (gaps.length === 0) return "fortnightly";
  const averageDays = gaps.reduce((sum, days) => sum + days, 0) / gaps.length;
  if (averageDays <= 10) return "weekly";
  if (averageDays <= 20) return "fortnightly";
  return "monthly";
}

export function latestPayCents(state: FinanceState) {
  const incomeCategoryIds = new Set(
    state.categories
      .filter((category) => category.kind === "income")
      .map((category) => category.id),
  );
  const recurringIncome = [...state.transactions]
    .filter(
      (transaction) =>
        incomeCategoryIds.has(transaction.categoryId) &&
        transaction.amountCents > 0 &&
        transaction.recurring &&
        !transaction.transfer,
    )
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  if (recurringIncome.length > 0) return recurringIncome[0].amountCents;
  const anyIncome = [...state.transactions]
    .filter(
      (transaction) =>
        incomeCategoryIds.has(transaction.categoryId) &&
        transaction.amountCents > 0 &&
        !transaction.transfer,
    )
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];
  return anyIncome?.amountCents ?? 0;
}

export function recurringMonthlyEquivalent(
  amountCents: number,
  frequency: RecurringTransaction["frequency"],
) {
  switch (frequency) {
    case "weekly":
      return Math.round((amountCents * 52) / 12);
    case "fortnightly":
      return Math.round((amountCents * 26) / 12);
    case "quarterly":
      return Math.round(amountCents / 3);
    case "annual":
      return Math.round(amountCents / 12);
    default:
      return amountCents;
  }
}

export function billsForCadence(state: FinanceState, cadence: PayFrequency) {
  const essentialCategoryIds = new Set(
    state.categories
      .filter((category) => category.kind === "essential")
      .map((category) => category.id),
  );
  const items = state.recurring.filter(
    (item) => item.active && essentialCategoryIds.has(item.categoryId),
  );
  const factor = periodsPerMonth(cadence);
  const breakdown = items.map((item) => {
    const monthlyCents = recurringMonthlyEquivalent(item.expectedCents, item.frequency);
    return {
      id: item.id,
      merchant: item.merchant,
      monthlyCents,
      perPeriodCents: Math.round(monthlyCents / factor),
    };
  });
  return {
    perPeriodCents: breakdown.reduce((sum, item) => sum + item.perPeriodCents, 0),
    items: breakdown,
  };
}

export function savingsNeededForCadence(
  state: FinanceState,
  cadence: PayFrequency,
  today = new Date(),
) {
  const factor = periodsPerMonth(cadence);
  const active = state.goals.filter((goal) => goal.status === "active");
  const perGoal = active.map((goal) => {
    const forecast = goalForecast(goal, today);
    return {
      goalId: goal.id,
      perPeriodCents: Math.max(Math.round(forecast.monthlyRequiredCents / factor), 0),
    };
  });
  return {
    perPeriodCents: perGoal.reduce((sum, item) => sum + item.perPeriodCents, 0),
    perGoal,
  };
}

export function calculatePayAllocation(
  state: FinanceState,
  payCents: number,
  cadence: PayFrequency,
  today = new Date(),
) {
  const bills = billsForCadence(state, cadence);
  const savings = savingsNeededForCadence(state, cadence, today);
  const factor = periodsPerMonth(cadence);
  const plan = state.plans[0];
  const investmentsCents = plan ? Math.round(plan.intendedInvestmentCents / factor) : 0;
  const committedCents = bills.perPeriodCents + savings.perPeriodCents + investmentsCents;
  const discretionaryCents = Math.max(payCents - committedCents, 0);
  const shortfallCents = Math.max(committedCents - payCents, 0);
  return {
    billsCents: bills.perPeriodCents,
    billsBreakdown: bills.items,
    savingsCents: savings.perPeriodCents,
    savingsBreakdown: savings.perGoal,
    investmentsCents,
    discretionaryCents,
    shortfallCents,
  };
}

export function suggestGoalSplit(
  goals: SavingsGoal[],
  totalCents: number,
  today = new Date(),
): PayAllocationGoalSplit[] {
  const active = goals.filter((goal) => goal.status === "active");
  if (active.length === 0 || totalCents <= 0) return [];
  const priorityWeight: Record<SavingsGoal["priority"], number> = { high: 3, medium: 2, low: 1 };
  const weighted = active.map((goal) => {
    const forecast = goalForecast(goal, today);
    // Goals further behind their required pace (relative to what is currently
    // planned, expressed as a monthly amount so different contribution
    // frequencies compare fairly) pull a larger share of this pay's pool.
    const plannedMonthlyCents =
      goal.plannedContributionCents * periodsPerMonth(goal.contributionFrequency);
    const behindCents = Math.max(forecast.monthlyRequiredCents - plannedMonthlyCents, 0);
    const weight = priorityWeight[goal.priority] * (1 + behindCents / 20_000);
    return { goal, weight };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let allocated = 0;
  return weighted.map(({ goal, weight }, index) => {
    const isLast = index === weighted.length - 1;
    const cents = isLast ? totalCents - allocated : Math.round((weight / totalWeight) * totalCents);
    allocated += cents;
    return { goalId: goal.id, cents: Math.max(cents, 0) };
  });
}
