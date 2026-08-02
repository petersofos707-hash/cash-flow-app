import type { FinanceState, InvestmentHolding, SavingsGoal, Transaction } from "./types";

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
