import { describe, expect, it } from "vitest";
import { demoSeed } from "@/lib/demo/seed";
import {
  calculatePayAllocation,
  detectPayCadence,
  latestPayCents,
  periodsPerMonth,
  suggestGoalSplit,
} from "@/lib/domain/calculations";

const TODAY = new Date("2026-08-02T12:00:00");

describe("pay-day allocation", () => {
  it("detects cadence from recurring payroll deposits only, ignoring one-off income", () => {
    // The seed has one recurring salary deposit and one irregular gig payment
    // three days apart — cadence should fall back to fortnightly rather than
    // being skewed to weekly by the gig income.
    expect(detectPayCadence(demoSeed, TODAY)).toBe("fortnightly");
  });

  it("reads the latest recurring pay amount", () => {
    expect(latestPayCents(demoSeed)).toBe(324_000);
  });

  it("converts cadence to periods per month", () => {
    expect(periodsPerMonth("monthly")).toBe(1);
    expect(periodsPerMonth("weekly")).toBeCloseTo(52 / 12, 6);
    expect(periodsPerMonth("fortnightly")).toBeCloseTo(26 / 12, 6);
  });

  it("splits a pay into bills, savings, investments and discretionary", () => {
    const result = calculatePayAllocation(demoSeed, 324_000, "fortnightly", TODAY);
    expect(result.billsCents).toBeGreaterThan(0);
    expect(result.savingsCents).toBeGreaterThan(0);
    expect(result.investmentsCents).toBeGreaterThan(0);
    expect(
      result.billsCents + result.savingsCents + result.investmentsCents + result.discretionaryCents,
    ).toBe(324_000);
    expect(result.shortfallCents).toBe(0);
  });

  it("flags a shortfall when the pay does not cover committed amounts", () => {
    const result = calculatePayAllocation(demoSeed, 1_000, "fortnightly", TODAY);
    expect(result.shortfallCents).toBeGreaterThan(0);
    expect(result.discretionaryCents).toBe(0);
  });

  it("suggests a goal split that sums exactly to the pool and favours higher priority", () => {
    const splits = suggestGoalSplit(demoSeed.goals, 51_300, TODAY);
    const total = splits.reduce((sum, item) => sum + item.cents, 0);
    expect(total).toBe(51_300);
    const emergency = splits.find((item) => item.goalId === "goal-emergency");
    const travel = splits.find((item) => item.goalId === "goal-travel");
    expect(emergency).toBeDefined();
    expect(travel).toBeDefined();
    // goal-emergency is "high" priority and further behind its required pace
    // than goal-travel ("medium"), so it should receive the larger share.
    expect(emergency!.cents).toBeGreaterThan(travel!.cents);
  });

  it("returns no split when there is nothing to allocate", () => {
    expect(suggestGoalSplit(demoSeed.goals, 0, TODAY)).toEqual([]);
  });
});
