"use client";

import Papa from "papaparse";
import { Download, FileUp, Filter, Plus, Search, Split, WandSparkles } from "lucide-react";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useFinance } from "./finance-provider";
import { Amount, Card, CardHeader, EmptyState, PageHeader, StatusPill } from "./ui";
import { formatDate, moneyPrecise } from "@/lib/format";
import type { Transaction } from "@/lib/domain/types";

function downloadCsv(transactions: Transaction[], categoryName: (id: string) => string) {
  const rows = transactions.map((item) => ({
    date: item.transactionDate,
    merchant: item.merchant,
    description: item.originalDescription,
    amount: (item.amountCents / 100).toFixed(2),
    category: categoryName(item.categoryId),
    account_id: item.accountId,
    status: item.status,
    transfer: item.transfer,
    notes: item.notes,
  }));
  const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "cash-flow-transactions-fictional.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function CsvImportPanel() {
  const { state, addTransaction } = useFinance();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: "", description: "", amount: "" });
  const [message, setMessage] = useState("");
  function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        setHeaders(fields);
        setRows(result.data.slice(0, 100));
        setMapping({
          date: fields.find((field) => /date/i.test(field)) ?? "",
          description: fields.find((field) => /description|merchant|narration/i.test(field)) ?? "",
          amount: fields.find((field) => /amount|value/i.test(field)) ?? "",
        });
        setMessage(`${result.data.length} rows read. Review the mapping before importing.`);
      },
      error: () => setMessage("The CSV could not be read. Check its encoding and columns."),
    });
  }
  function importRows() {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setMessage("Map date, description and amount before importing.");
      return;
    }
    const existing = new Set(
      state.transactions.map(
        (item) => `${item.transactionDate}|${item.originalDescription}|${item.amountCents}`,
      ),
    );
    let imported = 0;
    let duplicates = 0;
    rows.forEach((row) => {
      const date = new Date(row[mapping.date]);
      const amount = Number(String(row[mapping.amount]).replace(/[$,]/g, ""));
      const description = row[mapping.description]?.trim();
      if (!description || Number.isNaN(date.getTime()) || !Number.isFinite(amount)) return;
      const dateValue = date.toISOString().slice(0, 10);
      const amountCents = Math.round(amount * 100);
      const key = `${dateValue}|${description}|${amountCents}`;
      if (existing.has(key)) {
        duplicates += 1;
        return;
      }
      addTransaction({
        accountId: state.accounts[0]?.id ?? "manual",
        originalDescription: description,
        merchant: description,
        amountCents,
        currency: "AUD",
        transactionDate: dateValue,
        postingDate: dateValue,
        categoryId: "misc",
        notes: "Imported from CSV",
        tags: [],
        status: "posted",
        source: "csv",
        recurring: false,
        transfer: false,
        reimbursement: false,
        refund: false,
        excludedFromReports: false,
        excludedFromCashFlow: false,
        needsReview: true,
        manuallyCategorised: false,
        splits: [],
      });
      imported += 1;
    });
    setMessage(`${imported} transactions imported; ${duplicates} duplicates skipped.`);
  }
  return (
    <details className="tool-panel">
      <summary>
        <FileUp size={17} /> Import a CSV statement
      </summary>
      <div className="tool-panel-body">
        <p>
          Files stay in this browser in demo mode. Preview and map columns before writing records.
        </p>
        <input
          aria-label="Choose CSV file"
          type="file"
          accept=".csv,text/csv"
          onChange={parseFile}
        />
        {headers.length > 0 && (
          <>
            <div className="mapping-grid">
              {(["date", "description", "amount"] as const).map((field) => (
                <label key={field}>
                  {field[0].toUpperCase() + field.slice(1)} column
                  <select
                    value={mapping[field]}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field]: event.target.value }))
                    }
                  >
                    <option value="">Choose column</option>
                    {headers.map((header) => (
                      <option key={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="csv-preview">
              <table>
                <thead>
                  <tr>
                    {headers.slice(0, 5).map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 4).map((row, index) => (
                    <tr key={index}>
                      {headers.slice(0, 5).map((header) => (
                        <td key={header}>{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="primary-button" onClick={importRows}>
              Confirm import
            </button>
          </>
        )}{" "}
        {message && (
          <p className="inline-message" role="status">
            {message}
          </p>
        )}
      </div>
    </details>
  );
}

export function TransactionsPage() {
  const { state, updateTransaction, bulkCategorise, splitTransaction, addTransaction, updateRule } =
    useFinance();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [account, setAccount] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const categories = state.categories.filter((item) => !item.archived);
  const filtered = useMemo(
    () =>
      state.transactions
        .filter(
          (item) =>
            (item.merchant + item.originalDescription)
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (category === "all" || item.categoryId === category) &&
            (account === "all" || item.accountId === account) &&
            (!reviewOnly || item.needsReview),
        )
        .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
    [account, category, query, reviewOnly, state.transactions],
  );
  const total = filtered.reduce((sum, item) => sum + item.amountCents, 0);
  function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountCents = Math.round(Number(data.get("amount")) * 100);
    if (!Number.isFinite(amountCents)) return;
    addTransaction({
      accountId: String(data.get("account")),
      originalDescription: String(data.get("merchant")),
      merchant: String(data.get("merchant")),
      amountCents,
      currency: "AUD",
      transactionDate: String(data.get("date")),
      postingDate: String(data.get("date")),
      categoryId: String(data.get("category")),
      notes: String(data.get("notes") ?? ""),
      tags: [],
      status: "posted",
      source: "manual",
      recurring: false,
      transfer: false,
      reimbursement: false,
      refund: false,
      excludedFromReports: false,
      excludedFromCashFlow: false,
      needsReview: false,
      manuallyCategorised: true,
      splits: [],
    });
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader
        eyebrow="Transaction workspace"
        title="Review every dollar once"
        description="Search, categorise, split and reconcile imported records without changing the raw source."
        actions={
          <>
            <button
              className="secondary-button"
              onClick={() =>
                downloadCsv(
                  filtered,
                  (id) => categories.find((item) => item.id === id)?.name ?? "Uncategorised",
                )
              }
            >
              <Download size={16} /> Export CSV
            </button>
            <details className="action-details">
              <summary className="primary-button">
                <Plus size={16} /> Add transaction
              </summary>
              <form className="popover-form" onSubmit={addManual}>
                <label>
                  Merchant
                  <input name="merchant" required />
                </label>
                <div className="form-row">
                  <label>
                    Amount
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="Use minus for expense"
                      required
                    />
                  </label>
                  <label>
                    Date
                    <input name="date" type="date" defaultValue="2026-08-02" required />
                  </label>
                </div>
                <label>
                  Account
                  <select name="account">
                    {state.accounts.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select name="category">
                    {categories.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <input name="notes" />
                </label>
                <button className="primary-button">Add record</button>
              </form>
            </details>
          </>
        }
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search merchant or description"
            aria-label="Search transactions"
          />
        </label>
        <label>
          <Filter size={15} />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <select
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          aria-label="Filter by account"
        >
          <option value="all">All accounts</option>
          {state.accounts.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(event) => setReviewOnly(event.target.checked)}
          />{" "}
          Needs review
        </label>
      </div>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <b>{selected.length} selected</b>
          <select
            aria-label="Bulk category"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                bulkCategorise(selected, event.target.value);
                setSelected([]);
              }
            }}
          >
            <option value="">Set category…</option>
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      <Card className="table-card">
        <CardHeader
          title={`${filtered.length} transactions`}
          subtitle={`Net movement ${moneyPrecise(total)}`}
        />
        {filtered.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            body="Adjust the filters or add a manual cash transaction."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all transactions"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={(event) =>
                        setSelected(event.target.checked ? filtered.map((item) => item.id) : [])
                      }
                    />
                  </th>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="numeric">Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const accountItem = state.accounts.find(
                    (candidate) => candidate.id === item.accountId,
                  );
                  return (
                    <tr key={item.id} className={item.needsReview ? "needs-review" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.merchant}`}
                          checked={selected.includes(item.id)}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, item.id]
                                : current.filter((id) => id !== item.id),
                            )
                          }
                        />
                      </td>
                      <td data-label="Date">{formatDate(item.transactionDate)}</td>
                      <td data-label="Merchant">
                        <strong>{item.merchant}</strong>
                        <small>{item.originalDescription}</small>
                        {item.splits.length > 0 && (
                          <span className="split-note">
                            Split across {item.splits.length} categories
                          </span>
                        )}
                      </td>
                      <td data-label="Account">{accountItem?.name}</td>
                      <td data-label="Category">
                        <select
                          value={item.categoryId}
                          onChange={(event) =>
                            updateTransaction(item.id, {
                              categoryId: event.target.value,
                              manuallyCategorised: true,
                              needsReview: false,
                            })
                          }
                          aria-label={`Category for ${item.merchant}`}
                        >
                          {categories.map((candidate) => (
                            <option value={candidate.id} key={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Status">
                        <div className="pill-stack">
                          {item.needsReview && <StatusPill tone="warning">Review</StatusPill>}
                          {item.transfer && <StatusPill>Transfer</StatusPill>}
                          {item.status === "pending" && (
                            <StatusPill tone="warning">Pending</StatusPill>
                          )}
                          {item.refund && <StatusPill tone="positive">Refund</StatusPill>}
                        </div>
                      </td>
                      <td data-label="Amount" className="numeric">
                        <Amount cents={item.amountCents} />
                      </td>
                      <td>
                        <details className="row-menu">
                          <summary aria-label={`Actions for ${item.merchant}`}>•••</summary>
                          <div>
                            <button
                              onClick={() =>
                                splitTransaction(item.id, [
                                  item.categoryId,
                                  item.categoryId === "groceries" ? "dining" : "groceries",
                                ])
                              }
                            >
                              <Split size={15} /> Split 50/50
                            </button>
                            <button
                              onClick={() =>
                                updateTransaction(item.id, {
                                  transfer: !item.transfer,
                                  excludedFromCashFlow: !item.transfer,
                                })
                              }
                            >
                              Mark as {item.transfer ? "not transfer" : "transfer"}
                            </button>
                            <button
                              onClick={() => updateTransaction(item.id, { refund: !item.refund })}
                            >
                              Toggle refund
                            </button>
                            <button
                              onClick={() =>
                                updateTransaction(item.id, {
                                  excludedFromReports: !item.excludedFromReports,
                                })
                              }
                            >
                              {item.excludedFromReports ? "Include" : "Exclude"} in reports
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="two-column-tools">
        <CsvImportPanel />
        <details className="tool-panel">
          <summary>
            <WandSparkles size={17} /> Categorisation rules ({state.rules.length})
          </summary>
          <div className="tool-panel-body">
            <p>Enabled rules run by ascending priority. Manual categories always win.</p>
            {state.rules.map((rule) => (
              <div className="rule-row" key={rule.id}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}
                  aria-label={`Enable ${rule.name}`}
                />
                <span>
                  When {rule.field} {rule.operator} “{rule.value}”
                </span>
                <b>→ {categories.find((item) => item.id === rule.categoryId)?.name}</b>
              </div>
            ))}
            <p className="inline-message">
              Rule preview: “WOOLWORTHS” matches 1 existing transaction.
            </p>
          </div>
        </details>
      </div>
    </>
  );
}
