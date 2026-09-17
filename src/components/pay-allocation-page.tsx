"use client";

import { useMemo, useState } from "react";
import { Banknote, CircleCheck, ClipboardList, RefreshCcw, Trash2 } from "lucide-react";
import { useFinance } from "./finance-provider";
import {
  Card,
  CardHeader,
  EmptyState,
  MetricCard,
  PageHeader,
  ProgressBar,
  StatusPill,
} from "./ui";
import {
  calculatePayAllocation,
  detectPayCadence,
  latestPayCents,
  suggestGoalSplit,
} from "@/lib/domain/calculations";
import type { PayAllocation, PayAllocationGoalSplit, PayFrequency } from "@/lib/domain/types";
import { formatDate, money, todayIso } from "@/lib/format";

const TODAY = new Date("2026-08-02T12:00:00");

const cadenceLabel: Record<PayFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

export function PayAllocationPage() {
  const { state } = useFinance();
  const detectedCadence = detectPayCadence(state, TODAY);
  const defaultPayCents = latestPayCents(state) || 324000;
  const [payDollars, setPayDollars] = useState(defaultPayCents / 100);
  const [cadence, setCadence] = useState<PayFrequency>(detectedCadence);
  const [payDate, setPayDate] = useState(todayIso());
  const payCents = Math.max(Math.round(payDollars * 100), 0);

  const allocation = useMemo(
    () => calculatePayAllocation(state, payCents, cadence, TODAY),
    [state, payCents, cadence],
  );

  const history = [...state.payAllocations].sort((a, b) => b.payDate.localeCompare(a.payDate));

  return (
    <>
      <PageHeader
        eyebrow="Pay day"
        title="Send every pay to the right place"
        description="Work out how much of this pay should cover bills, top up savings goals and investments, then split the savings portion across the goals that need it most."
        actions={
          <StatusPill tone="neutral">
            <Banknote size={14} /> Detected cadence: {cadenceLabel[detectedCadence]}
          </StatusPill>
        }
      />

      <Card>
        <CardHeader
          title="This pay"
          subtitle="Adjust the amount, date or cadence before reviewing the split"
        />
        <div className="form-grid">
          <label>
            Pay amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={payDollars}
              onChange={(event) => setPayDollars(Number(event.target.value))}
            />
          </label>
          <label>
            Pay date
            <input
              type="date"
              value={payDate}
              onChange={(event) => setPayDate(event.target.value)}
            />
          </label>
          <label>
            Cadence
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as PayFrequency)}
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
      </Card>

      <div className="summary-grid compact">
        <MetricCard
          label="Bills"
          value={money(allocation.billsCents)}
          detail="essential recurring costs"
          tone="warm"
        />
        <MetricCard
          label="Savings"
          value={money(allocation.savingsCents)}
          detail="needed by active goals"
          tone="positive"
        />
        <MetricCard
          label="Investments"
          value={money(allocation.investmentsCents)}
          detail="from the spending plan target"
        />
        <MetricCard
          label={allocation.shortfallCents > 0 ? "Shortfall" : "Discretionary"}
          value={money(
            allocation.shortfallCents > 0
              ? allocation.shortfallCents
              : allocation.discretionaryCents,
          )}
          detail={
            allocation.shortfallCents > 0
              ? "this pay doesn't cover commitments"
              : "left after commitments"
          }
          tone={allocation.shortfallCents > 0 ? "warm" : "neutral"}
        />
      </div>

      <div className="content-grid-2">
        <Card>
          <CardHeader
            title="Bills this period"
            subtitle={`Prorated to a ${cadenceLabel[cadence].toLowerCase()} pay`}
          />
          {allocation.billsBreakdown.length === 0 ? (
            <EmptyState
              title="No active recurring bills"
              body="Add recurring costs from Reports to see them here."
            />
          ) : (
            <div className="definition-list">
              {allocation.billsBreakdown.map((item) => (
                <div key={item.id}>
                  <span>{item.merchant}</span>
                  <b>{money(item.perPeriodCents)}</b>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Investments this period"
            subtitle="Set the monthly target on the Spending Plan page"
          />
          <div className="pace-card">
            <Banknote size={26} />
            <div>
              <strong>{money(allocation.investmentsCents)}</strong>
              <p>
                Based on an intended monthly investment contribution, prorated to your{" "}
                {cadenceLabel[cadence].toLowerCase()} pay.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <GoalSplitCard
        key={`${payCents}-${cadence}-${payDate}`}
        payCents={payCents}
        payDate={payDate}
        cadence={cadence}
        allocation={allocation}
      />

      <Card>
        <CardHeader
          title="Pay allocation history"
          subtitle="Recommendations you've logged or distributed"
        />
        {history.length === 0 ? (
          <EmptyState
            title="No history yet"
            body="Confirm a pay allocation above to start tracking it here."
          />
        ) : (
          <div className="pay-history-list">
            {history.map((record) => (
              <PayHistoryRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function GoalSplitCard({
  payCents,
  payDate,
  cadence,
  allocation,
}: {
  payCents: number;
  payDate: string;
  cadence: PayFrequency;
  allocation: ReturnType<typeof calculatePayAllocation>;
}) {
  const { state, recordPayAllocation } = useFinance();
  const activeGoals = state.goals.filter((goal) => goal.status === "active");
  const suggested = suggestGoalSplit(state.goals, allocation.savingsCents, TODAY);
  const [splits, setSplits] = useState<PayAllocationGoalSplit[]>(suggested);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);

  const totalSplit = splits.reduce((sum, item) => sum + item.cents, 0);
  const variance = allocation.savingsCents - totalSplit;

  function updateSplit(goalId: string, dollars: number) {
    const cents = Math.max(Math.round(dollars * 100), 0);
    setSplits((current) =>
      current.map((item) => (item.goalId === goalId ? { ...item, cents } : item)),
    );
  }

  function confirm(apply: boolean) {
    recordPayAllocation({
      payDate,
      payCents,
      cadence,
      billsCents: allocation.billsCents,
      investmentsCents: allocation.investmentsCents,
      savingsCents: totalSplit,
      discretionaryCents: Math.max(
        payCents - allocation.billsCents - allocation.investmentsCents - totalSplit,
        0,
      ),
      goalSplits: splits,
      applied: apply,
      appliedAt: apply ? new Date().toISOString() : undefined,
    });
    setConfirmedMessage(apply ? "Distributed to goals." : "Logged for tracking.");
    window.setTimeout(() => setConfirmedMessage(null), 2400);
  }

  if (activeGoals.length === 0) {
    return (
      <Card>
        <CardHeader title="Split savings across goals" />
        <EmptyState
          title="No active goals"
          body="Create a savings goal to split this pay's savings across it."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Split savings across goals"
        subtitle="Suggested by priority and how far each goal is behind pace — edit any amount before confirming"
        action={
          <button
            type="button"
            className="text-button"
            onClick={() => setSplits(suggestGoalSplit(state.goals, allocation.savingsCents, TODAY))}
          >
            <RefreshCcw size={15} /> Reset to suggested
          </button>
        }
      />
      <form
        className="goal-split-list"
        onSubmit={(event) => {
          event.preventDefault();
          confirm(true);
        }}
      >
        {activeGoals.map((goal) => {
          const split = splits.find((item) => item.goalId === goal.id);
          const suggestedSplit = suggested.find((item) => item.goalId === goal.id);
          return (
            <div className="goal-split-row" key={goal.id}>
              <div>
                <StatusPill tone={goal.priority === "high" ? "warning" : "neutral"}>
                  {goal.priority}
                </StatusPill>
                <strong>{goal.name}</strong>
                <small>
                  Suggested {money(suggestedSplit?.cents ?? 0)} ·{" "}
                  {money(goal.plannedContributionCents)} planned per{" "}
                  {goal.contributionFrequency.replace("ly", "")}
                </small>
              </div>
              <label className="goal-split-input">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(split?.cents ?? 0) / 100}
                  onChange={(event) => updateSplit(goal.id, Number(event.target.value))}
                />
              </label>
            </div>
          );
        })}
        <div className="allocation-row">
          <div>
            <strong>{money(totalSplit)}</strong>
            <span>allocated across goals</span>
          </div>
          <div>
            <strong>{money(allocation.savingsCents)}</strong>
            <span>suggested savings pool</span>
          </div>
          <div>
            <strong className={variance === 0 ? "" : variance > 0 ? "trend-up" : "trend-down"}>
              {money(Math.abs(variance))}
            </strong>
            <span>
              {variance === 0
                ? "fully allocated"
                : variance > 0
                  ? "left unallocated"
                  : "over the suggested pool"}
            </span>
          </div>
        </div>
        <div className="card-actions">
          <button type="submit" className="primary-button">
            <CircleCheck size={16} /> Confirm &amp; distribute to goals
          </button>
          <button type="button" className="secondary-button" onClick={() => confirm(false)}>
            <ClipboardList size={16} /> Log recommendation only
          </button>
          {confirmedMessage && <StatusPill tone="positive">{confirmedMessage}</StatusPill>}
        </div>
      </form>
    </Card>
  );
}

function PayHistoryRow({ record }: { record: PayAllocation }) {
  const { state, removePayAllocation } = useFinance();
  const total = Math.max(
    record.billsCents + record.savingsCents + record.investmentsCents + record.discretionaryCents,
    1,
  );
  return (
    <div className="pay-history-row">
      <div className="pay-history-top">
        <div>
          <strong>{formatDate(record.payDate)}</strong>
          <span>
            {money(record.payCents)} pay · {cadenceLabel[record.cadence]}
          </span>
        </div>
        <div className="pay-history-actions">
          <StatusPill tone={record.applied ? "positive" : "neutral"}>
            {record.applied ? "Distributed" : "Draft"}
          </StatusPill>
          <button
            type="button"
            className="icon-button"
            aria-label="Remove from history"
            onClick={() => removePayAllocation(record.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="pay-history-bars">
        <ProgressBar value={record.billsCents / total} colour="#c46b4f" />
        <ProgressBar value={record.savingsCents / total} colour="#296b57" />
        <ProgressBar value={record.investmentsCents / total} colour="#6b88a4" />
        <ProgressBar value={record.discretionaryCents / total} colour="#9571a5" />
      </div>
      <div className="definition-list compact">
        <div>
          <span>Bills</span>
          <b>{money(record.billsCents)}</b>
        </div>
        <div>
          <span>Savings</span>
          <b>{money(record.savingsCents)}</b>
        </div>
        <div>
          <span>Investments</span>
          <b>{money(record.investmentsCents)}</b>
        </div>
        <div>
          <span>Discretionary</span>
          <b>{money(record.discretionaryCents)}</b>
        </div>
      </div>
      {record.goalSplits.length > 0 && (
        <div className="pay-history-goals">
          {record.goalSplits.map((split) => {
            const goal = state.goals.find((item) => item.id === split.goalId);
            return (
              <span key={split.goalId} className="status-pill neutral">
                {goal?.name ?? "Goal"}: {money(split.cents)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
