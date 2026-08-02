"use client";

import { CalendarClock, CheckCircle2, Copy, Pause, Plus, Target } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useFinance } from "./finance-provider";
import { Card, CardHeader, MetricCard, PageHeader, ProgressBar, StatusPill } from "./ui";
import { calculateCashFlow, goalForecast } from "@/lib/domain/calculations";
import { money, percent } from "@/lib/format";

export function SpendingPlanPage() {
  const { state, updatePlan } = useFinance();
  const plan = state.plans[0];
  const cash = calculateCashFlow(state.transactions);
  const [copied, setCopied] = useState(false);
  const spentByCategory = (id: string) =>
    Math.abs(
      state.transactions
        .filter((item) => item.categoryId === id && item.amountCents < 0 && !item.transfer)
        .reduce((sum, item) => sum + item.amountCents, 0),
    );
  const elapsedDays = 2;
  const daysInMonth = 31;
  const forecast = Math.round((cash.spendingCents / elapsedDays) * daysInMonth);
  const remaining = plan.overallTargetCents - cash.spendingCents;
  const safeDaily = Math.max(Math.floor(remaining / Math.max(daysInMonth - elapsedDays, 1)), 0);
  return (
    <>
      <PageHeader
        eyebrow="August 2026 plan"
        title="Spend confidently, without rigid budgeting"
        description="Targets are guide rails. See what remains and adjust future plans without guilt-based language."
        actions={
          <button
            className="secondary-button"
            onClick={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            <Copy size={16} /> {copied ? "Plan copied" : "Copy previous month"}
          </button>
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Monthly target"
          value={money(plan.overallTargetCents)}
          detail="overall spending"
        />
        <MetricCard
          label="Spent so far"
          value={money(cash.spendingCents)}
          detail={`${percent(cash.spendingCents / plan.overallTargetCents)} used`}
          tone="warm"
        />
        <MetricCard
          label="Safe daily estimate"
          value={money(safeDaily)}
          detail="for the rest of August"
          tone="positive"
        />
        <MetricCard
          label="End-of-month forecast"
          value={money(forecast)}
          detail={forecast <= plan.overallTargetCents ? "within target" : "review flexible costs"}
        />
      </div>
      <div className="content-grid-2">
        <Card>
          <CardHeader title="Overall plan" subtitle="Edit the monthly guide rails" />
          <div className="plan-hero">
            <div>
              <span>Remaining</span>
              <strong>{money(remaining)}</strong>
              <small>of {money(plan.overallTargetCents)}</small>
            </div>
            <ProgressBar value={cash.spendingCents / plan.overallTargetCents} colour="#d18b43" />
          </div>
          <div className="form-grid">
            <label>
              Overall target
              <input
                type="number"
                value={plan.overallTargetCents / 100}
                onChange={(event) =>
                  updatePlan({ overallTargetCents: Math.round(Number(event.target.value) * 100) })
                }
              />
            </label>
            <label>
              Intended savings
              <input
                type="number"
                value={plan.intendedSavingsCents / 100}
                onChange={(event) =>
                  updatePlan({ intendedSavingsCents: Math.round(Number(event.target.value) * 100) })
                }
              />
            </label>
            <label>
              Intended investment
              <input
                type="number"
                value={plan.intendedInvestmentCents / 100}
                onChange={(event) =>
                  updatePlan({
                    intendedInvestmentCents: Math.round(Number(event.target.value) * 100),
                  })
                }
              />
            </label>
            <label>
              Savings-rate target
              <input
                type="number"
                value={plan.intendedSavingsRate * 100}
                onChange={(event) =>
                  updatePlan({ intendedSavingsRate: Number(event.target.value) / 100 })
                }
              />
            </label>
          </div>
        </Card>
        <Card>
          <CardHeader title="Pace check" subtitle="Forecast based on the selected period" />
          <div className="pace-card">
            <CalendarClock size={26} />
            <div>
              <strong>
                {forecast <= plan.overallTargetCents
                  ? "Your current pace is comfortable"
                  : "Your current pace is above target"}
              </strong>
              <p>
                {forecast <= plan.overallTargetCents
                  ? "There is room for planned discretionary spending while keeping the savings target visible."
                  : "Consider reviewing flexible categories; no immediate action is required."}
              </p>
            </div>
          </div>
          <div className="definition-list">
            <div>
              <span>Average daily spending</span>
              <b>{money(Math.round(cash.spendingCents / elapsedDays))}</b>
            </div>
            <div>
              <span>Days remaining</span>
              <b>{daysInMonth - elapsedDays}</b>
            </div>
            <div>
              <span>Forecast variance</span>
              <b>{money(plan.overallTargetCents - forecast)}</b>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Category targets"
          subtitle="Rollover is off unless you enable it for a category"
        />
        <div className="category-plan-list">
          {plan.categories.map((target) => {
            const category = state.categories.find((item) => item.id === target.categoryId);
            const spent = spentByCategory(target.categoryId);
            return (
              <div key={target.categoryId}>
                <div className="category-plan-heading">
                  <span className="category-dot" style={{ background: category?.colour }} />
                  <div>
                    <strong>{category?.name}</strong>
                    <small>
                      {money(spent)} of {money(target.targetCents)}
                    </small>
                  </div>
                  <StatusPill tone={spent <= target.targetCents ? "positive" : "warning"}>
                    {spent <= target.targetCents
                      ? `${money(target.targetCents - spent)} left`
                      : `${money(spent - target.targetCents)} over`}
                  </StatusPill>
                </div>
                <ProgressBar value={spent / target.targetCents} colour={category?.colour} />
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

export function GoalsPage() {
  const { state, addGoal, updateGoal, contributeToGoal } = useFinance();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addGoal({
      name: String(data.get("name")),
      description: String(data.get("description")),
      targetCents: Math.round(Number(data.get("target")) * 100),
      currentCents: Math.round(Number(data.get("current")) * 100),
      targetDate: String(data.get("date")),
      priority: String(data.get("priority")) as "high" | "medium" | "low",
      contributionFrequency: "monthly",
      plannedContributionCents: Math.round(Number(data.get("contribution")) * 100),
      notes: "",
      status: "active",
    });
    event.currentTarget.reset();
  }
  const active = state.goals.filter((goal) => goal.status !== "archived");
  const totalCurrent = active.reduce((sum, goal) => sum + goal.currentCents, 0);
  const totalTarget = active.reduce((sum, goal) => sum + goal.targetCents, 0);
  return (
    <>
      <PageHeader
        eyebrow="Savings goals"
        title="Give future money a clear purpose"
        description="Allocate savings once, compare the required pace and adjust priorities as life changes."
        actions={
          <details className="action-details">
            <summary className="primary-button">
              <Plus size={16} /> New goal
            </summary>
            <form className="popover-form" onSubmit={submit}>
              <label>
                Goal name
                <input name="name" required />
              </label>
              <label>
                Description
                <input name="description" />
              </label>
              <div className="form-row">
                <label>
                  Target amount
                  <input type="number" name="target" min="1" required />
                </label>
                <label>
                  Already saved
                  <input type="number" name="current" min="0" defaultValue="0" />
                </label>
              </div>
              <label>
                Target date
                <input type="date" name="date" required />
              </label>
              <div className="form-row">
                <label>
                  Monthly contribution
                  <input type="number" name="contribution" min="0" required />
                </label>
                <label>
                  Priority
                  <select name="priority">
                    <option>high</option>
                    <option>medium</option>
                    <option>low</option>
                  </select>
                </label>
              </div>
              <button className="primary-button">Create goal</button>
            </form>
          </details>
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Allocated to goals"
          value={money(totalCurrent)}
          detail={`${percent(totalCurrent / totalTarget)} of combined targets`}
          tone="positive"
        />
        <MetricCard
          label="Remaining"
          value={money(totalTarget - totalCurrent)}
          detail="across active goals"
        />
        <MetricCard
          label="Monthly planned"
          value={money(active.reduce((sum, goal) => sum + goal.plannedContributionCents, 0))}
          detail="current contribution settings"
        />
      </div>
      <div className="goal-card-grid">
        {active.map((goal) => {
          const forecast = goalForecast(goal, new Date("2026-08-02T12:00:00"));
          return (
            <Card key={goal.id} className="goal-card">
              <div className="goal-card-top">
                <span className="goal-icon">
                  <Target />
                </span>
                <div>
                  <StatusPill tone={goal.priority === "high" ? "warning" : "neutral"}>
                    {goal.priority} priority
                  </StatusPill>
                  <h2>{goal.name}</h2>
                  <p>{goal.description}</p>
                </div>
              </div>
              <div className="goal-amount">
                <strong>{money(goal.currentCents)}</strong>
                <span>of {money(goal.targetCents)}</span>
                <b>{Math.round(forecast.percentage * 100)}%</b>
              </div>
              <ProgressBar value={forecast.percentage} />
              <div className="goal-forecast">
                <div>
                  <span>To meet target</span>
                  <strong>{money(forecast.monthlyRequiredCents)}/month</strong>
                </div>
                <div>
                  <span>At current pace</span>
                  <strong>
                    {forecast.projectedDate?.toLocaleDateString("en-AU", {
                      month: "short",
                      year: "numeric",
                    }) ?? "Not projected"}
                  </strong>
                </div>
                <div>
                  <span>Target date</span>
                  <strong>
                    {new Date(`${goal.targetDate}T12:00:00`).toLocaleDateString("en-AU", {
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
              </div>
              <div className="goal-status-line">
                {forecast.onTrack ? (
                  <>
                    <CheckCircle2 size={17} /> Current contribution is on track
                  </>
                ) : (
                  <>
                    <CalendarClock size={17} /> Consider{" "}
                    {money(forecast.monthlyRequiredCents - goal.plannedContributionCents)} more per
                    month
                  </>
                )}
              </div>
              <div className="card-actions">
                <button
                  className="primary-button small"
                  onClick={() => contributeToGoal(goal.id, goal.plannedContributionCents)}
                >
                  Add {money(goal.plannedContributionCents)}
                </button>
                <button
                  className="secondary-button small"
                  onClick={() =>
                    updateGoal(goal.id, { status: goal.status === "paused" ? "active" : "paused" })
                  }
                >
                  <Pause size={15} /> {goal.status === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  className="text-button"
                  onClick={() => updateGoal(goal.id, { status: "archived" })}
                >
                  Archive
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader
          title="Allocation check"
          subtitle="The Future fund balance is allocated once across linked goals"
        />
        <div className="allocation-row">
          <div>
            <strong>
              {money(state.accounts.find((item) => item.id === "savings")?.balanceCents ?? 0)}
            </strong>
            <span>linked savings balance</span>
          </div>
          <div>
            <strong>
              {money(
                active.reduce((sum, goal) => sum + (goal.allocatedCents ?? goal.currentCents), 0),
              )}
            </strong>
            <span>allocated to goals</span>
          </div>
          <div>
            <strong>
              {money(
                (state.accounts.find((item) => item.id === "savings")?.balanceCents ?? 0) -
                  active.reduce((sum, goal) => sum + (goal.allocatedCents ?? goal.currentCents), 0),
              )}
            </strong>
            <span>unallocated buffer</span>
          </div>
        </div>
      </Card>
    </>
  );
}
