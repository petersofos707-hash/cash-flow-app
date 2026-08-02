"use client";

import { Archive, ArrowDownRight, ArrowUpRight, Plus, RefreshCw, Scale } from "lucide-react";
import { type FormEvent } from "react";
import {
  Area,
  AreaChart,
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
import { Card, CardHeader, MetricCard, PageHeader, ProgressBar } from "./ui";
import { calculateNetWorth, holdingCost, holdingValue } from "@/lib/domain/calculations";
import { formatDate, money, percent } from "@/lib/format";

export function InvestmentsPage() {
  const { state, addHolding, updateHolding } = useFinance();
  const holdings = state.holdings.filter((item) => !item.archived);
  const current = holdings.reduce((sum, item) => sum + holdingValue(item), 0);
  const cost = holdings.reduce((sum, item) => sum + holdingCost(item), 0);
  const gain = current - cost;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addHolding({
      name: String(data.get("name")),
      ticker: String(data.get("ticker")).toUpperCase(),
      exchange: String(data.get("exchange")),
      assetClass: String(data.get("class")),
      units: Number(data.get("units")),
      averagePriceCents: Math.round(Number(data.get("average")) * 100),
      currentPriceCents: Math.round(Number(data.get("current")) * 100),
      platform: String(data.get("platform")),
      currency: "AUD",
      notes: "Manual fictional holding",
      lastPriceUpdate: "2026-08-02",
    });
    event.currentTarget.reset();
  }
  const colours = ["#296b57", "#6b88a4", "#d49455", "#9571a5"];
  return (
    <>
      <PageHeader
        eyebrow="Investment tracking"
        title="Know what you own and what you contribute"
        description="Manual holdings remain useful without a market-data subscription. Every price shows its update date."
        actions={
          <details className="action-details">
            <summary className="primary-button">
              <Plus size={16} /> Add holding
            </summary>
            <form className="popover-form" onSubmit={submit}>
              <label>
                Asset name
                <input name="name" required />
              </label>
              <div className="form-row">
                <label>
                  Ticker
                  <input name="ticker" required />
                </label>
                <label>
                  Exchange
                  <input name="exchange" defaultValue="ASX" required />
                </label>
              </div>
              <label>
                Asset class
                <select name="class">
                  <option>Australian shares</option>
                  <option>International shares</option>
                  <option>ETF</option>
                  <option>Managed fund</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </label>
              <div className="form-row">
                <label>
                  Units
                  <input name="units" type="number" step="0.0001" required />
                </label>
                <label>
                  Average price
                  <input name="average" type="number" step="0.01" required />
                </label>
              </div>
              <label>
                Current price
                <input name="current" type="number" step="0.01" required />
              </label>
              <label>
                Platform
                <input name="platform" required />
              </label>
              <button className="primary-button">Add holding</button>
            </form>
          </details>
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Portfolio value"
          value={money(current)}
          detail="manual prices"
          tone="positive"
        />
        <MetricCard label="Cost basis" value={money(cost)} detail="excluding distributions" />
        <MetricCard
          label="Unrealised result"
          value={money(gain)}
          detail={percent(gain / cost)}
          trend={(gain / cost) * 100}
        />
        <MetricCard label="Holdings" value={String(holdings.length)} detail="editable assets" />
      </div>
      <div className="content-grid-2">
        <Card>
          <CardHeader title="Portfolio allocation" subtitle="By current market value" />
          <div className="allocation-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={holdings.map((item) => ({ name: item.ticker, value: holdingValue(item) }))}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {holdings.map((item, index) => (
                    <Cell key={item.id} fill={colours[index % colours.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {holdings.map((item, index) => (
              <div key={item.id}>
                <span style={{ background: colours[index % colours.length] }} />
                <b>{item.ticker}</b>
                <small>{percent(holdingValue(item) / current)}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Contribution trend"
            subtitle="Fictional monthly investment transfers"
          />
          <div className="simple-bars">
            {[
              { month: "Mar", value: 30000 },
              { month: "Apr", value: 40000 },
              { month: "May", value: 30000 },
              { month: "Jun", value: 45000 },
              { month: "Jul", value: 40000 },
            ].map((item) => (
              <div key={item.month}>
                <span>{item.month}</span>
                <div>
                  <i style={{ width: `${item.value / 500}%` }} />
                </div>
                <b>{money(item.value)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="table-card">
        <CardHeader
          title="Holdings"
          subtitle="Prices are never presented without their last update"
        />
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Units</th>
                <th>Average</th>
                <th>Current price</th>
                <th>Current value</th>
                <th>Return</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map((item) => {
                const value = holdingValue(item);
                const itemCost = holdingCost(item);
                const itemGain = value - itemCost;
                return (
                  <tr key={item.id}>
                    <td data-label="Asset">
                      <strong>{item.ticker}</strong>
                      <small>
                        {item.name} · {item.exchange}
                      </small>
                    </td>
                    <td data-label="Units">{item.units}</td>
                    <td data-label="Average">{money(item.averagePriceCents)}</td>
                    <td data-label="Current">
                      <label className="inline-price">
                        <span className="sr-only">Price for {item.ticker}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.currentPriceCents / 100}
                          onChange={(event) =>
                            updateHolding(item.id, {
                              currentPriceCents: Math.round(Number(event.target.value) * 100),
                              lastPriceUpdate: new Date().toISOString().slice(0, 10),
                            })
                          }
                        />
                      </label>
                    </td>
                    <td data-label="Value">
                      <b>{money(value)}</b>
                    </td>
                    <td data-label="Return">
                      <span className={itemGain >= 0 ? "trend-up" : "trend-down"}>
                        {itemGain >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        {money(itemGain)}
                      </span>
                    </td>
                    <td data-label="Updated">{formatDate(item.lastPriceUpdate)}</td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => updateHolding(item.id, { archived: true })}
                        aria-label={`Archive ${item.ticker}`}
                      >
                        <Archive size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="notice-banner">
        <RefreshCw size={18} />
        <div>
          <strong>Automatic prices are ready for a provider later.</strong>
          <p>
            Until an API is configured, update prices manually. IOO and IVV are fictional editable
            seed holdings, not recommendations.
          </p>
        </div>
      </div>
    </>
  );
}

export function NetWorthPage() {
  const { state, addAsset, addLiability } = useFinance();
  const values = calculateNetWorth(state);
  const first = state.netWorthSnapshots[0];
  const latest = state.netWorthSnapshots.at(-1);
  const change = latest ? latest.netWorthCents - first.netWorthCents : 0;
  function addManualAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addAsset({
      name: String(data.get("name")),
      type: String(data.get("type")),
      valueCents: Math.round(Number(data.get("value")) * 100),
      includeInNetWorth: true,
      liquid: data.get("liquid") === "on",
      notes: "Manual fictional asset",
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    event.currentTarget.reset();
  }
  function addManualLiability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addLiability({
      name: String(data.get("name")),
      type: String(data.get("type")) as
        "credit_card" | "hecs_help" | "personal_loan" | "car_loan" | "bnpl" | "other",
      balanceCents: Math.round(Number(data.get("value")) * 100),
      includeInNetWorth: true,
      notes: "Manual fictional liability",
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    event.currentTarget.reset();
  }
  const breakdown = [
    {
      name: "Cash accounts",
      value: state.accounts
        .filter((item) => item.balanceCents > 0)
        .reduce((sum, item) => sum + item.balanceCents, 0),
      colour: "#2d725c",
    },
    { name: "Investments", value: values.investmentsCents, colour: "#557c9c" },
    { name: "Superannuation", value: values.superCents, colour: "#8a6f9c" },
    { name: "Liabilities", value: values.liabilitiesCents, colour: "#c27a5e" },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Wealth position"
        title="Is your net worth moving in the right direction?"
        description="Historical snapshots stay fixed, so today’s balance changes do not rewrite the past."
        actions={
          <>
            <details className="action-details">
              <summary className="secondary-button">
                <Plus size={16} /> Asset
              </summary>
              <form className="popover-form" onSubmit={addManualAsset}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Type
                  <select name="type">
                    <option value="vehicle">Vehicle</option>
                    <option value="cash">Cash</option>
                    <option value="superannuation">Superannuation</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Value
                  <input name="value" type="number" required />
                </label>
                <label className="check-filter">
                  <input type="checkbox" name="liquid" /> Accessible liquid asset
                </label>
                <button className="primary-button">Add asset</button>
              </form>
            </details>
            <details className="action-details">
              <summary className="primary-button">
                <Plus size={16} /> Liability
              </summary>
              <form className="popover-form" onSubmit={addManualLiability}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Type
                  <select name="type">
                    <option value="hecs_help">HECS–HELP</option>
                    <option value="personal_loan">Personal loan</option>
                    <option value="car_loan">Car loan</option>
                    <option value="credit_card">Credit card</option>
                    <option value="bnpl">Buy now pay later</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Balance
                  <input name="value" type="number" required />
                </label>
                <button className="primary-button">Add liability</button>
              </form>
            </details>
          </>
        }
      />
      <div className="summary-grid compact">
        <MetricCard
          label="Total net worth"
          value={money(values.netWorthCents)}
          detail={`${money(change)} over six months`}
          tone="positive"
        />
        <MetricCard
          label="Excluding super"
          value={money(values.excludingSuperCents)}
          detail="accessible and other assets"
        />
        <MetricCard
          label="Liquid net worth"
          value={money(values.liquidCents)}
          detail="cash less short-term liabilities"
        />
        <MetricCard
          label="Total debt"
          value={money(values.liabilitiesCents)}
          detail="including HECS–HELP"
          tone="warm"
        />
      </div>
      <div className="content-grid-2 wide-left">
        <Card>
          <CardHeader
            title="Historical net worth"
            subtitle="Monthly snapshots · assets less liabilities"
          />
          <div className="chart-large">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.netWorthSnapshots}>
                <defs>
                  <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#28705a" stopOpacity={0.3} />
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
                  tickFormatter={(value) => `$${value / 100000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area
                  dataKey="netWorthCents"
                  type="monotone"
                  stroke="#28705a"
                  strokeWidth={3}
                  fill="url(#wealthFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Position breakdown" subtitle="What contributes today" />
          <div className="breakdown-list">
            {breakdown.map((item) => (
              <div key={item.name}>
                <span style={{ background: item.colour }} />
                <div>
                  <strong>{item.name}</strong>
                  <ProgressBar
                    value={item.value / Math.max(values.assetsCents, values.liabilitiesCents)}
                    colour={item.colour}
                  />
                </div>
                <b>{money(item.value)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="content-grid-2">
        <Card>
          <CardHeader title="Assets" subtitle={`${money(values.assetsCents)} included`} />
          <div className="asset-list">
            {state.accounts
              .filter((item) => item.includeInNetWorth && item.balanceCents > 0)
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>
                      {item.institution} · {item.maskedNumber}
                    </small>
                  </span>
                  <b>{money(item.balanceCents)}</b>
                </div>
              ))}
            {state.assets
              .filter((item) => item.includeInNetWorth)
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>Manual · updated {formatDate(item.updatedAt)}</small>
                  </span>
                  <b>{money(item.valueCents)}</b>
                </div>
              ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Liabilities" subtitle={`${money(values.liabilitiesCents)} included`} />
          <div className="asset-list">
            {state.accounts
              .filter((item) => item.includeInNetWorth && item.balanceCents < 0)
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>{item.maskedNumber}</small>
                  </span>
                  <b>{money(Math.abs(item.balanceCents))}</b>
                </div>
              ))}
            {state.liabilities
              .filter((item) => item.includeInNetWorth)
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>Manual · updated {formatDate(item.updatedAt)}</small>
                  </span>
                  <b>{money(item.balanceCents)}</b>
                </div>
              ))}
          </div>
        </Card>
      </div>
      <div className="notice-banner">
        <Scale size={18} />
        <div>
          <strong>Definitions matter</strong>
          <p>
            Net worth = included assets − included liabilities. Liquid net worth excludes
            inaccessible superannuation and deducts short-term liabilities. These figures are
            tracking information, not advice.
          </p>
        </div>
      </div>
    </>
  );
}
