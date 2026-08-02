import { describe, expect, it } from "vitest";
import { demoSeed } from "@/lib/demo/seed";
import {
  applyCategorisationRules,
  calculateCashFlow,
  calculateNetWorth,
  findTransferCandidates,
  goalForecast,
  holdingCost,
  holdingValue,
  mergeImportedTransaction,
  monthlyEquivalent,
  splitMatchesTransaction,
  transactionDedupeKey,
} from "@/lib/domain/calculations";

describe("financial calculations", () => {
  it("excludes internal transfers and credit-card repayments from cash flow", () => {
    const result = calculateCashFlow(demoSeed.transactions);
    expect(result.incomeCents).toBe(370_500);
    expect(result.spendingCents).toBe(158_124);
    expect(result.savingsCents).toBe(212_376);
  });

  it("calculates savings rate from eligible income", () => {
    expect(calculateCashFlow(demoSeed.transactions).savingsRate).toBeCloseTo(212_376 / 370_500, 6);
  });

  it("calculates net worth from included assets and liabilities", () => {
    const result = calculateNetWorth(demoSeed);
    expect(result.assetsCents).toBeGreaterThan(result.liabilitiesCents);
    expect(result.netWorthCents).toBe(result.assetsCents - result.liabilitiesCents);
    expect(result.excludingSuperCents).toBe(result.netWorthCents - result.superCents);
  });

  it("values holdings without floating-point money storage", () => {
    const holding = demoSeed.holdings[0];
    expect(holdingValue(holding)).toBe(Math.round(holding.units * holding.currentPriceCents));
    expect(holdingCost(holding)).toBe(Math.round(holding.units * holding.averagePriceCents));
  });

  it("forecasts a savings goal and required contributions", () => {
    const result = goalForecast(demoSeed.goals[0], new Date("2026-08-02T12:00:00"));
    expect(result.remainingCents).toBe(525_000);
    expect(result.monthlyRequiredCents).toBeGreaterThan(0);
    expect(result.percentage).toBeCloseTo(0.65);
  });

  it("detects opposite account movements as transfer candidates", () => {
    const candidates = findTransferCandidates(demoSeed.transactions);
    expect(
      candidates.some(
        (pair) => pair.includes("tx-transfer-out") && pair.includes("tx-transfer-in"),
      ),
    ).toBe(true);
    expect(
      candidates.some(
        (pair) => pair.includes("tx-card-payment-out") && pair.includes("tx-card-payment-in"),
      ),
    ).toBe(true);
  });

  it("applies deterministic categorisation rules", () => {
    const source = demoSeed.transactions.find((item) => item.id === "tx-groceries-1")!;
    const categorised = applyCategorisationRules(demoSeed, {
      ...source,
      categoryId: "misc",
      ruleId: undefined,
    });
    expect(categorised.categoryId).toBe("groceries");
    expect(categorised.ruleId).toBe("rule-woolworths");
  });

  it("keeps manual categorisation above rules", () => {
    const source = demoSeed.transactions.find((item) => item.id === "tx-groceries-1")!;
    const categorised = applyCategorisationRules(demoSeed, {
      ...source,
      categoryId: "dining",
      manuallyCategorised: true,
    });
    expect(categorised.categoryId).toBe("dining");
  });

  it("uses stable provider identifiers for deduplication", () => {
    const source = demoSeed.transactions[0];
    expect(transactionDedupeKey(source)).toBe(`provider:${source.providerId}`);
  });

  it("falls back to stable fields when no provider ID exists", () => {
    const source = { ...demoSeed.transactions[0], providerId: undefined };
    expect(transactionDedupeKey(source)).toContain(
      `${source.accountId}|${source.transactionDate}|${source.amountCents}`,
    );
  });

  it("reconciles pending to posted while preserving user edits", () => {
    const existing = {
      ...demoSeed.transactions[0],
      status: "pending" as const,
      categoryId: "dining",
      manuallyCategorised: true,
      notes: "Keep me",
    };
    const incoming = {
      ...existing,
      status: "posted" as const,
      categoryId: "salary",
      manuallyCategorised: false,
      notes: "",
    };
    const result = mergeImportedTransaction(existing, incoming);
    expect(result.status).toBe("posted");
    expect(result.categoryId).toBe("dining");
    expect(result.notes).toBe("Keep me");
  });

  it("validates transaction split totals", () => {
    const source = demoSeed.transactions[0];
    expect(
      splitMatchesTransaction({
        ...source,
        splits: [
          { id: "a", categoryId: "salary", amountCents: 100 },
          { id: "b", categoryId: "sports-work", amountCents: source.amountCents - 100 },
        ],
      }),
    ).toBe(true);
    expect(
      splitMatchesTransaction({
        ...source,
        splits: [{ id: "a", categoryId: "salary", amountCents: 1 }],
      }),
    ).toBe(false);
  });

  it("normalises subscription costs to a monthly equivalent", () => {
    expect(monthlyEquivalent(12_000, "annual")).toBe(1_000);
    expect(monthlyEquivalent(3_000, "quarterly")).toBe(1_000);
    expect(monthlyEquivalent(1_000, "monthly")).toBe(1_000);
  });
});
