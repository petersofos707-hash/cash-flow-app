"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinance } from "./finance-provider";
import { Card, CardHeader, MetricCard, PageHeader, ProgressBar, StatusPill } from "./ui";
import {
  calculateNetWorth,
  calculateWealthBuilding,
  goalForecast,
  holdingValue,
} from "@/lib/domain/calculations";
import { formatDate, money, percent } from "@/lib/format";

export function DashboardPage() {
  const { state, refreshConnection } = useFinance();
  const metrics = calculateWealthBuilding(state, state.transactions);
  const netWorth = calculateNetWorth(state);
  const latestSnapshot = state.netWorthSnapshots.at(-1);
  const priorSnapshot = state.netWorthSnapshots.at(-2);
  const netChange =
    latestSnapshot && priorSnapshot
      ? latestSnapshot.netWorthCents - priorSnapshot.netWorthCents
      : 0;
  const spendingCategories = state.categories
    .filter((category) => ["essential", "discretionary"].includes(category.kind))
    .map((category) => ({
      name: category.name,
      value: Math.abs(
        state.transactions
          .filter(
            (transaction) =>
              transaction.categoryId === category.id &&
              transaction.amountCents < 0 &&
              !transaction.transfer,
          )
          .reduce((sum, transaction) => sum + transaction.amountCents, 0),
      ),
      colour: category.colour,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const activeGoals = state.goals.filter((goal) => goal.status === "active");
  const recent = [...state.transactions]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 5);
  const investmentTotal = state.holdings
    .filter((holding) => !holding.archived)
    .reduce((sum, holding) => sum + holdingValue(holding), 0);

  return (
    <>
      <PageHeader
        eyebrow="Financial overview"
        title="Your money, in one clear view"
        description="A practical snapshot of cash flow, goals and wealth building using fictional demonstration data."
        actions={
          <>
            <select aria-label="Dashboard date range" defaultValue="financial-year">
              <option value="month">Current month</option>
              <option value="previous">Previous month</option>
              <option value="three">Last three months</option>
              <option value="six">Last six months</option>
              <option value="financial-year">Current financial year</option>
              <option value="previous-fy">Previous financial year</option>
              <option value="twelve">Last 12 months</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
            <button className="secondary-button" onClick={refreshConnection}>
              <RefreshCw size={16} /> Refresh
            </button>
          </>
        }
      />
      <div className="summary-grid">
        <MetricCard
          label="Current net worth"
          value={money(netWorth.netWorthCents)}
          detail="since last month"
          trend={priorSnapshot ? (netChange / priorSnapshot.netWorthCents) * 100 : 0}
          tone="positive"
        />
        <MetricCard
          label="Eligible income"
          value={money(metrics.incomeCents)}
          detail="selected period"
        />
        <MetricCard
          label="Eligible spending"
          value={money(metrics.spendingCents)}
          detail="excludes transfers"
          tone="warm"
        />
        <MetricCard
          label="Savings rate"
          value={percent(metrics.savingsRate)}
          detail={`${money(metrics.savingsCents)} retained`}
          tone="positive"
        />
        <MetricCard
          label="Liquid cash"
          value={money(netWorth.liquidCents)}
          detail="accessible less short-term debt"
        />
        <MetricCard
          label="Invested"
          value={money(investmentTotal)}
          detail="manual prices · 1 Aug"
        />
      </div>
      <div className="dashboard-grid">
        <Card className="span-2">
          <CardHeader
            title="Net worth trend"
            subtitle="Assets less liabilities · historical snapshots are preserved"
            action={
              <Link className="text-link" href="/net-worth">
                View detail <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="chart-large">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.netWorthSnapshots}>
                <defs>
                  <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#28705a" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#28705a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(`${value}T12:00:00`).toLocaleDateString("en-AU", { month: "short" })
                  }
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 100000)}k`}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <Tooltip
                  formatter={(value) => money(Number(value))}
                  labelFormatter={(value) => formatDate(String(value))}
                />
                <Area
                  type="monotone"
                  dataKey="netWorthCents"
                  stroke="#28705a"
                  strokeWidth={2.5}
                  fill="url(#netWorthFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>
              <b>{money(netChange)}</b> change last month
            </span>
            <span>
              <b>{money(netWorth.excludingSuperCents)}</b> excluding super
            </span>
            <span>
              <b>{money(netWorth.liquidCents)}</b> liquid net worth
            </span>
          </div>
        </Card>
        <Card>
          <CardHeader title="Spending mix" subtitle="Essential and discretionary categories" />
          <div className="donut-wrap">
            <div className="chart-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingCategories}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {spendingCategories.map((item) => (
                      <Cell key={item.name} fill={item.colour} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{money(metrics.spendingCents)}</strong>
                <span>spent</span>
              </div>
            </div>
            <div className="legend-list">
              {spendingCategories.slice(0, 5).map((item) => (
                <div key={item.name}>
                  <span style={{ background: item.colour }} />
                  <b>{item.name}</b>
                  <small>{money(item.value)}</small>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="span-2">
          <CardHeader title="Income versus spending" subtitle="Monthly cash-flow pattern" />
          <div className="chart-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { month: "Mar", income: 342000, spending: 241000 },
                  { month: "Apr", income: 356000, spending: 229000 },
                  { month: "May", income: 349000, spending: 237000 },
                  { month: "Jun", income: 371000, spending: 248000 },
                  { month: "Jul", income: metrics.incomeCents, spending: metrics.spendingCents },
                ]}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${value / 100000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="income" fill="#2e7d62" radius={[5, 5, 0, 0]} />
                <Bar dataKey="spending" fill="#d1a06b" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Goals on the move"
            subtitle={`${activeGoals.length} active savings goals`}
            action={
              <Link className="text-link" href="/goals">
                All goals
              </Link>
            }
          />
          <div className="goal-mini-list">
            {activeGoals.map((goal) => {
              const forecast = goalForecast(goal, new Date("2026-08-02T12:00:00"));
              return (
                <div key={goal.id}>
                  <div>
                    <strong>{goal.name}</strong>
                    <StatusPill tone={forecast.onTrack ? "positive" : "warning"}>
                      {forecast.onTrack ? "On track" : "Review pace"}
                    </StatusPill>
                  </div>
                  <ProgressBar value={forecast.percentage} />
                  <p>
                    <b>{money(goal.currentCents)}</b> of {money(goal.targetCents)}{" "}
                    <span>{Math.round(forecast.percentage * 100)}%</span>
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="span-2">
          <CardHeader
            title="Recent transactions"
            subtitle="Imported and normalised records"
            action={
              <Link className="text-link" href="/transactions">
                Review all <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="transaction-list">
            {recent.map((transaction) => {
              const category = state.categories.find((item) => item.id === transaction.categoryId);
              return (
                <div key={transaction.id}>
                  <span
                    className="merchant-mark"
                    style={{ background: `${category?.colour}20`, color: category?.colour }}
                  >
                    {transaction.merchant.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{transaction.merchant}</strong>
                    <small>
                      {formatDate(transaction.transactionDate)} · {category?.name}
                    </small>
                  </div>
                  {transaction.needsReview && <StatusPill tone="warning">Review</StatusPill>}
                  <b className={transaction.amountCents >= 0 ? "amount-positive" : ""}>
                    {transaction.amountCents > 0 ? "+" : ""}
                    {money(transaction.amountCents)}
                  </b>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Coming up" subtitle="Expected recurring costs" />
          <div className="upcoming-list">
            {state.recurring.map((item) => (
              <div key={item.id}>
                <CalendarDays size={18} />
                <div>
                  <strong>{item.merchant}</strong>
                  <small>{formatDate(item.nextExpectedDate)}</small>
                </div>
                <b>{money(item.expectedCents)}</b>
              </div>
            ))}
            {state.subscriptions.slice(0, 1).map((item) => (
              <div key={item.id}>
                <CalendarDays size={18} />
                <div>
                  <strong>{item.merchant}</strong>
                  <small>{formatDate(item.nextChargeDate)} · subscription</small>
                </div>
                <b>{money(item.amountCents)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
