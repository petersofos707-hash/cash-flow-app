"use client";

import Papa from "papaparse";
import {
  Archive,
  Check,
  Database,
  Download,
  KeyRound,
  Link2,
  LogOut,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Unplug,
  UploadCloud,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "./finance-provider";
import { Card, CardHeader, MetricCard, PageHeader, ProgressBar, StatusPill } from "./ui";
import {
  calculateCashFlow,
  calculateNetWorth,
  calculateWealthBuilding,
  goalForecast,
} from "@/lib/domain/calculations";
import { formatDate, money, percent } from "@/lib/format";

function saveFile(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { state } = useFinance();
  const cash = calculateCashFlow(state.transactions);
  const wealth = calculateWealthBuilding(state, state.transactions);
  const netWorth = calculateNetWorth(state);
  const categories = state.categories
    .map((category) => ({
      name: category.name,
      amount: Math.abs(
        state.transactions
          .filter(
            (item) => item.categoryId === category.id && item.amountCents < 0 && !item.transfer,
          )
          .reduce((sum, item) => sum + item.amountCents, 0),
      ),
      kind: category.kind,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const monthlySubscriptions = state.subscriptions
    .filter((item) => !item.cancelled)
    .reduce(
      (sum, item) =>
        sum +
        (item.frequency === "monthly"
          ? item.amountCents
          : item.frequency === "annual"
            ? Math.round(item.amountCents / 12)
            : Math.round(item.amountCents / 3)),
      0,
    );
  const exportReport = () =>
    saveFile(
      Papa.unparse(categories),
      "cash-flow-category-report-fictional.csv",
      "text/csv;charset=utf-8",
    );
  return (
    <>
      <PageHeader
        eyebrow="Reports & recurring costs"
        title="Turn records into a useful monthly story"
        description="Compare cash flow, wealth building, merchants, subscriptions and Australian financial-year progress."
        actions={
          <button className="primary-button" onClick={exportReport}>
            <Download size={16} /> Export report CSV
          </button>
        }
      />
      <div className="filter-bar">
        <select aria-label="Report type">
          <option>Monthly cash flow</option>
          <option>Income by source</option>
          <option>Spending by category</option>
          <option>Merchant spending</option>
          <option>Essential vs discretionary</option>
          <option>Savings rate</option>
          <option>Financial-year summary</option>
        </select>
        <select aria-label="Report date range">
          <option>Current financial year</option>
          <option>Current month</option>
          <option>Previous month</option>
          <option>Last 12 months</option>
          <option>Custom date range</option>
        </select>
        <select aria-label="Report account">
          <option>All accounts</option>
          {state.accounts.map((item) => (
            <option key={item.id}>{item.name}</option>
          ))}
        </select>
        <select aria-label="Report category">
          <option>All categories</option>
          {state.categories.map((item) => (
            <option key={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div className="summary-grid compact">
        <MetricCard
          label="Cash saved"
          value={money(cash.savingsCents)}
          detail={`${percent(cash.savingsRate)} savings rate`}
          tone="positive"
        />
        <MetricCard
          label="Wealth building"
          value={money(wealth.wealthBuildingCents)}
          detail={`${percent(wealth.wealthBuildingRate)} of income`}
        />
        <MetricCard
          label="Net worth"
          value={money(netWorth.netWorthCents)}
          detail="current included position"
        />
        <MetricCard
          label="Subscriptions"
          value={money(monthlySubscriptions)}
          detail="monthly equivalent"
          tone="warm"
        />
      </div>
      <div className="content-grid-2 wide-left">
        <Card>
          <CardHeader title="Spending by category" subtitle="Selected period · transfers removed" />
          <div className="chart-large">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories.slice(0, 8)} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${value / 100}`}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={95}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="amount" fill="#3f7966" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Rate definitions" subtitle="Control what contributes in Settings" />
          <div className="rate-list">
            <div>
              <span>Savings rate</span>
              <strong>{percent(cash.savingsRate)}</strong>
              <p>Eligible income minus eligible spending, divided by eligible income.</p>
            </div>
            <div>
              <span>Wealth-building rate</span>
              <strong>{percent(wealth.wealthBuildingRate)}</strong>
              <p>
                Savings contributions, investments and additional debt repayments divided by
                eligible income.
              </p>
            </div>
            <div>
              <span>Emergency runway</span>
              <strong>4.1 months</strong>
              <p>Accessible emergency funds divided by average monthly essential spending.</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="content-grid-2">
        <Card>
          <CardHeader
            title="Active subscriptions"
            subtitle={`${money(monthlySubscriptions)} monthly equivalent`}
          />
          <div className="subscription-list">
            {state.subscriptions
              .filter((item) => !item.cancelled)
              .map((item) => (
                <div key={item.id}>
                  <div>
                    <strong>{item.merchant}</strong>
                    <small>
                      {item.frequency} · next {formatDate(item.nextChargeDate)}
                    </small>
                    {item.previousAmountCents && item.amountCents > item.previousAmountCents && (
                      <StatusPill tone="warning">
                        Price increased {money(item.amountCents - item.previousAmountCents)}
                      </StatusPill>
                    )}
                  </div>
                  <span>
                    <b>{money(item.amountCents)}</b>
                    <small>{item.frequency}</small>
                  </span>
                </div>
              ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recurring expenses" subtitle="Detected patterns with confidence" />
          <div className="subscription-list">
            {state.recurring.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.merchant}</strong>
                  <small>
                    {item.frequency} · next {formatDate(item.nextExpectedDate)}
                  </small>
                  <ProgressBar value={item.confidence} />
                </div>
                <span>
                  <b>{money(item.expectedCents)}</b>
                  <small>{percent(item.confidence)} confidence</small>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Savings-goal report"
          subtitle="Required contribution compared with current plans"
        />
        <div className="report-goals">
          {state.goals
            .filter((goal) => goal.status === "active")
            .map((goal) => {
              const forecast = goalForecast(goal, new Date("2026-08-02T12:00:00"));
              return (
                <div key={goal.id}>
                  <div>
                    <strong>{goal.name}</strong>
                    <small>
                      {money(goal.currentCents)} of {money(goal.targetCents)}
                    </small>
                  </div>
                  <ProgressBar value={forecast.percentage} />
                  <span>
                    <b>{money(forecast.monthlyRequiredCents)}/mo</b>
                    <StatusPill tone={forecast.onTrack ? "positive" : "warning"}>
                      {forecast.onTrack ? "On track" : "Behind pace"}
                    </StatusPill>
                  </span>
                </div>
              );
            })}
        </div>
      </Card>
    </>
  );
}

export function AccountsPage() {
  const { state, addAccount, updateAccount, refreshConnection, setConnectionStatus } = useFinance();
  const [syncing, setSyncing] = useState(false);
  const netBalances = state.accounts.reduce((sum, item) => sum + item.balanceCents, 0);
  function refresh() {
    setSyncing(true);
    setTimeout(() => {
      refreshConnection();
      setSyncing(false);
    }, 700);
  }
  function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addAccount({
      name: String(data.get("name")),
      institution: String(data.get("institution")),
      type: String(data.get("type")) as
        | "everyday"
        | "savings"
        | "credit_card"
        | "investment_cash"
        | "brokerage"
        | "superannuation"
        | "cash",
      maskedNumber: "Manual",
      balanceCents: Math.round(Number(data.get("balance")) * 100),
      currency: "AUD",
      connected: false,
      includeInNetWorth: true,
      includeInCashFlow: true,
      hidden: false,
      archived: false,
      notes: "Manual fictional account",
    });
    event.currentTarget.reset();
  }
  return (
    <>
      <PageHeader
        eyebrow="Accounts & connections"
        title="Every balance, with its source visible"
        description="Connected accounts are read-only. Manual accounts can be updated without pretending they are live bank data."
        actions={
          <>
            <button className="secondary-button" onClick={refresh} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? "spin" : ""} />{" "}
              {syncing ? "Refreshing…" : "Refresh all"}
            </button>
            <details className="action-details">
              <summary className="primary-button">
                <Database size={16} /> Add manual account
              </summary>
              <form className="popover-form" onSubmit={addManual}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Institution or source
                  <input name="institution" required />
                </label>
                <label>
                  Type
                  <select name="type">
                    <option value="everyday">Everyday</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit card</option>
                    <option value="investment_cash">Investment cash</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="cash">Cash</option>
                  </select>
                </label>
                <label>
                  Current balance
                  <input name="balance" type="number" step="0.01" required />
                </label>
                <button className="primary-button">Add account</button>
              </form>
            </details>
          </>
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Net account balances"
          value={money(netBalances)}
          detail="assets less card balance"
        />
        <MetricCard
          label="Connected institutions"
          value={state.bankConnection.status === "connected" ? "2" : "0"}
          detail="synthetic demo sources"
        />
        <MetricCard
          label="Last successful sync"
          value={new Date(state.bankConnection.lastSyncedAt).toLocaleTimeString("en-AU", {
            hour: "numeric",
            minute: "2-digit",
          })}
          detail={formatDate(state.bankConnection.lastSyncedAt.slice(0, 10))}
        />
      </div>
      <Card className="connection-card">
        <div className="connection-heading">
          <span className="connection-logo">
            <PlugZap />
          </span>
          <div>
            <span className="eyebrow">Bank connection</span>
            <h2>{state.bankConnection.institution}</h2>
            <p>Fictional Basiq-compatible connection architecture</p>
          </div>
          <StatusPill tone={state.bankConnection.status === "connected" ? "positive" : "warning"}>
            {state.bankConnection.status}
          </StatusPill>
        </div>
        <div className="connection-meta">
          <span>
            <b>Environment</b>Synthetic demo
          </span>
          <span>
            <b>Last sync</b>
            {new Date(state.bankConnection.lastSyncedAt).toLocaleString("en-AU")}
          </span>
          <span>
            <b>Accounts</b>
            {state.accounts.filter((item) => item.connected).length}
          </span>
        </div>
        <div className="card-actions">
          {state.bankConnection.status === "connected" ? (
            <button className="danger-button" onClick={() => setConnectionStatus("disconnected")}>
              <Unplug size={16} /> Disconnect demo institution
            </button>
          ) : (
            <button className="primary-button" onClick={() => setConnectionStatus("connected")}>
              <Link2 size={16} /> Reconnect demo institution
            </button>
          )}
          <button className="secondary-button" onClick={refresh}>
            <RefreshCw size={16} /> Manual refresh
          </button>
        </div>
      </Card>
      <div className="account-grid">
        {state.accounts.map((account) => (
          <Card key={account.id} className={account.archived ? "archived" : "account-card"}>
            <div className="account-card-top">
              <span className={`account-type ${account.type}`}>{account.name.slice(0, 1)}</span>
              <div>
                <h2>{account.name}</h2>
                <p>
                  {account.institution} · {account.maskedNumber}
                </p>
              </div>
              {account.connected ? (
                <StatusPill tone="positive">Connected</StatusPill>
              ) : (
                <StatusPill>Manual</StatusPill>
              )}
            </div>
            <strong className="account-balance">{money(account.balanceCents)}</strong>
            <div className="account-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={account.includeInNetWorth}
                  onChange={(event) =>
                    updateAccount(account.id, { includeInNetWorth: event.target.checked })
                  }
                />{" "}
                Net worth
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={account.includeInCashFlow}
                  onChange={(event) =>
                    updateAccount(account.id, { includeInCashFlow: event.target.checked })
                  }
                />{" "}
                Reports
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!account.hidden}
                  onChange={(event) => updateAccount(account.id, { hidden: !event.target.checked })}
                />{" "}
                Dashboard
              </label>
            </div>
            <button
              className="text-button"
              onClick={() => updateAccount(account.id, { archived: !account.archived })}
            >
              <Archive size={15} /> {account.archived ? "Restore" : "Archive"}
            </button>
          </Card>
        ))}
      </div>
      <div className="notice-banner">
        <Shield size={18} />
        <div>
          <strong>Production bank access remains off</strong>
          <p>
            The Basiq adapter, consent redirect, refresh, disconnect and signed webhook boundary are
            implemented. Add sandbox credentials and complete the provider onboarding steps in the
            documentation before switching modes.
          </p>
        </div>
      </div>
    </>
  );
}

export function MonthlyReviewPage() {
  const { state, saveReview } = useFinance();
  const cash = calculateCashFlow(state.transactions);
  const net = calculateNetWorth(state);
  const [saved, setSaved] = useState(false);
  const existing = state.reviews.find((item) => item.month === "2026-07");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    saveReview({
      month: "2026-07",
      reflection: String(data.get("reflection")),
      unusualSpendingExplanation: String(data.get("unusual")),
      nextMonthPriorities: String(data.get("priorities")),
      plannedChanges: String(data.get("changes")),
      incomeNotes: String(data.get("income")),
      completedAt: new Date().toISOString(),
    });
    setSaved(true);
  }
  const largest = state.categories
    .map((category) => ({
      name: category.name,
      amount: Math.abs(
        state.transactions
          .filter(
            (item) => item.categoryId === category.id && item.amountCents < 0 && !item.transfer,
          )
          .reduce((sum, item) => sum + item.amountCents, 0),
      ),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  return (
    <>
      <PageHeader
        eyebrow="July 2026 review"
        title="Close the month with context, not judgement"
        description="Capture what changed, which records need attention and what you want the next month to support."
        actions={
          existing && (
            <StatusPill tone="positive">
              <Check size={15} /> Completed
            </StatusPill>
          )
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Income received"
          value={money(cash.incomeCents)}
          detail="eligible income"
        />
        <MetricCard
          label="Total spending"
          value={money(cash.spendingCents)}
          detail="transfers excluded"
          tone="warm"
        />
        <MetricCard
          label="Amount saved"
          value={money(cash.savingsCents)}
          detail={`${percent(cash.savingsRate)} rate`}
          tone="positive"
        />
        <MetricCard label="Net worth" value={money(net.netWorthCents)} detail="at current values" />
      </div>
      <div className="content-grid-2">
        <Card>
          <CardHeader title="What stood out" subtitle="Automatically surfaced for review" />
          <div className="review-highlights">
            <div>
              <span>Largest categories</span>
              {largest.map((item) => (
                <p key={item.name}>
                  <b>{item.name}</b>
                  <strong>{money(item.amount)}</strong>
                </p>
              ))}
            </div>
            <div>
              <span>Records needing attention</span>
              <p>
                <b>Uncategorised or unusual</b>
                <strong>{state.transactions.filter((item) => item.needsReview).length}</strong>
              </p>
              <p>
                <b>Subscription price changes</b>
                <strong>
                  {
                    state.subscriptions.filter(
                      (item) =>
                        item.previousAmountCents && item.amountCents > item.previousAmountCents,
                    ).length
                  }
                </strong>
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Next month preview" subtitle="Expected costs and goal pace" />
          <div className="asset-list">
            {state.recurring.map((item) => (
              <div key={item.id}>
                <span>
                  {item.merchant}
                  <small>{formatDate(item.nextExpectedDate)}</small>
                </span>
                <b>{money(item.expectedCents)}</b>
              </div>
            ))}
            {state.goals
              .filter((item) => item.status === "active")
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>Planned goal contribution</small>
                  </span>
                  <b>{money(item.plannedContributionCents)}</b>
                </div>
              ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Your reflection" subtitle="Stored with this completed monthly review" />
        <form className="review-form" onSubmit={submit}>
          <label>
            How did the month feel financially?
            <textarea
              name="reflection"
              defaultValue={existing?.reflection}
              placeholder="What felt steady, surprising or worth remembering?"
            />
          </label>
          <label>
            Explain any unusual spending
            <textarea
              name="unusual"
              defaultValue={existing?.unusualSpendingExplanation}
              placeholder="Context for the unknown merchant or one-off costs"
            />
          </label>
          <div className="form-row">
            <label>
              Priorities for August
              <textarea name="priorities" defaultValue={existing?.nextMonthPriorities} />
            </label>
            <label>
              Planned target changes
              <textarea name="changes" defaultValue={existing?.plannedChanges} />
            </label>
          </div>
          <label>
            Income changes or notes
            <textarea name="income" defaultValue={existing?.incomeNotes} />
          </label>
          <button className="primary-button">
            <Save size={16} /> Save completed review
          </button>
          {saved && (
            <span className="saved-message" role="status">
              <Check size={16} /> Review saved
            </span>
          )}
        </form>
      </Card>
    </>
  );
}

export function SettingsPage() {
  const { state, updatePreferences, addCategory, resetDemo, deleteAllData } = useFinance();
  const [deleted, setDeleted] = useState(false);
  function exportData() {
    saveFile(
      JSON.stringify(state, null, 2),
      "cash-flow-complete-export-fictional.json",
      "application/json",
    );
  }
  function addNewCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addCategory({
      name: String(data.get("name")),
      kind: String(data.get("kind")) as
        "income" | "essential" | "discretionary" | "transfer" | "wealth",
      colour: "#5f7c72",
      icon: "circle",
      includeInReports: true,
    });
    event.currentTarget.reset();
  }
  return (
    <>
      <PageHeader
        eyebrow="Application settings"
        title="Privacy, preferences and data control"
        description="Configure the single-owner workspace and keep every external service explicitly opt-in."
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          <a href="#profile">Profile</a>
          <a href="#security">Security</a>
          <a href="#preferences">Preferences</a>
          <a href="#categories">Categories</a>
          <a href="#notifications">Notifications</a>
          <a href="#data">Data control</a>
          <a href="#diagnostics">Diagnostics</a>
        </nav>
        <div className="settings-content">
          <Card>
            <div id="profile" className="settings-section">
              <CardHeader
                title="Owner profile"
                subtitle="Only the approved environment-variable email can sign in"
              />
              <div className="setting-row">
                <div>
                  <strong>Approved owner</strong>
                  <p>Configured securely outside source control</p>
                </div>
                <StatusPill tone="positive">
                  <KeyRound size={14} /> Restricted
                </StatusPill>
              </div>
              <form action="/api/auth/sign-out" method="post">
                <button className="secondary-button">
                  <LogOut size={16} /> Sign out
                </button>
              </form>
            </div>
          </Card>
          <Card>
            <div id="security" className="settings-section">
              <CardHeader
                title="Security"
                subtitle="Remote mode uses Supabase PKCE sessions and row-level security"
              />
              <div className="security-grid">
                <div>
                  <Shield />
                  <strong>Passwordless magic link</strong>
                  <span>Approved-email check before provider calls</span>
                </div>
                <div>
                  <Database />
                  <strong>Row-level policies</strong>
                  <span>Every finance record belongs to auth.uid()</span>
                </div>
                <div>
                  <PlugZap />
                  <strong>Read-only bank adapter</strong>
                  <span>No payment or trading methods</span>
                </div>
              </div>
              <p className="inline-message">
                Optional MFA is enabled in the schema and setup guide; it becomes available after
                the Supabase project is configured.
              </p>
            </div>
          </Card>
          <Card>
            <div id="preferences" className="settings-section">
              <CardHeader
                title="Regional preferences"
                subtitle="Australian conventions are the default"
              />
              <div className="form-grid">
                <label>
                  Preferred currency
                  <select
                    value={state.preferences.currency}
                    onChange={(event) => updatePreferences({ currency: event.target.value })}
                  >
                    <option>AUD</option>
                    <option>USD</option>
                    <option>NZD</option>
                  </select>
                </label>
                <label>
                  Date format
                  <select
                    value={state.preferences.dateFormat}
                    onChange={(event) => updatePreferences({ dateFormat: event.target.value })}
                  >
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </label>
                <label>
                  Appearance
                  <select
                    value={state.preferences.theme}
                    onChange={(event) =>
                      updatePreferences({
                        theme: event.target.value as "light" | "dark" | "system",
                      })
                    }
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <label className="check-filter">
                  <input
                    type="checkbox"
                    checked={state.preferences.financialYearStartsInJuly}
                    onChange={(event) =>
                      updatePreferences({ financialYearStartsInJuly: event.target.checked })
                    }
                  />{" "}
                  Financial year begins 1 July
                </label>
              </div>
            </div>
          </Card>
          <Card>
            <div id="categories" className="settings-section">
              <CardHeader
                title="Category management"
                subtitle={`${state.categories.length} available categories`}
              />
              <div className="category-chip-list">
                {state.categories.map((item) => (
                  <span key={item.id}>
                    <i style={{ background: item.colour }} />
                    {item.name}
                    <small>{item.kind}</small>
                  </span>
                ))}
              </div>
              <details className="tool-panel">
                <summary>Add a custom category</summary>
                <form className="inline-form" onSubmit={addNewCategory}>
                  <input name="name" placeholder="Category name" required />
                  <select name="kind">
                    <option value="essential">Essential</option>
                    <option value="discretionary">Discretionary</option>
                    <option value="income">Income</option>
                    <option value="wealth">Wealth building</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <button className="primary-button small">Add</button>
                </form>
              </details>
            </div>
          </Card>
          <Card>
            <div id="notifications" className="settings-section">
              <CardHeader
                title="Notification preferences"
                subtitle="In-app alerts are restrained; lock-screen details are off"
              />
              {Object.entries(state.preferences.notifications).map(([key, value]) => (
                <label className="setting-row check-row" key={key}>
                  <div>
                    <strong>{key[0].toUpperCase() + key.slice(1)} alerts</strong>
                    <p>Show useful, low-frequency in-app notices.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...state.preferences.notifications,
                          [key]: event.target.checked,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <div id="data" className="settings-section">
              <CardHeader title="Export and deletion" subtitle="Your information remains yours" />
              <div className="data-actions">
                <button className="secondary-button" onClick={exportData}>
                  <Download size={16} /> Export complete JSON
                </button>
                <button className="secondary-button" onClick={resetDemo}>
                  <RotateCcw size={16} /> Reset fictional demo
                </button>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete all browser-local fictional finance data? This cannot be undone.",
                      )
                    ) {
                      deleteAllData();
                      setDeleted(true);
                    }
                  }}
                >
                  <Trash2 size={16} /> Permanently delete local data
                </button>
              </div>
              {deleted && (
                <p className="saved-message">
                  <Check size={16} /> Browser-local financial records deleted.
                </p>
              )}
              <p className="privacy-copy">
                In production, deletion requires re-authentication, disconnects Basiq, removes
                stored provider tokens and deletes finance rows through the server-side deletion
                workflow. Backups and their retention are governed by your Supabase plan.
              </p>
            </div>
          </Card>
          <Card>
            <div id="diagnostics" className="settings-section">
              <CardHeader title="PWA & diagnostics" subtitle="Version 0.1.0" />
              <div className="diagnostic-list">
                <div>
                  <span>Application mode</span>
                  <StatusPill tone="positive">Synthetic demo</StatusPill>
                </div>
                <div>
                  <span>Supabase</span>
                  <StatusPill>Awaiting credentials</StatusPill>
                </div>
                <div>
                  <span>Basiq</span>
                  <StatusPill>Awaiting sandbox access</StatusPill>
                </div>
                <div>
                  <span>Service worker</span>
                  <StatusPill tone="positive">Production-ready</StatusPill>
                </div>
              </div>
              <div className="install-guide">
                <UploadCloud size={20} />
                <div>
                  <strong>Install this PWA after deployment</strong>
                  <p>
                    On Windows, use the install icon in Edge or Chrome. On iPhone, choose Share →
                    Add to Home Screen. HTTPS is required outside localhost.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
