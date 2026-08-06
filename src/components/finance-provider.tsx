"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoSeed } from "@/lib/demo/seed";
import type {
  Account,
  CategorisationRule,
  Category,
  FinanceState,
  InvestmentHolding,
  Liability,
  ManualAsset,
  MonthlyReview,
  PayAllocation,
  SavingsGoal,
  Transaction,
} from "@/lib/domain/types";

const STORAGE_KEY = "cash-flow-app-demo-v1";
const freshSeed = (): FinanceState => structuredClone(demoSeed);
// Inlined at build time by Next.js. "postgres" means real, server-persisted
// data via /api/finance/*; anything else keeps the original browser-local
// demo behaviour untouched.
const IS_POSTGRES = process.env.NEXT_PUBLIC_APP_DATA_MODE === "postgres";

interface FinanceContextValue {
  state: FinanceState;
  hydrated: boolean;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  addTransaction: (transaction: Omit<Transaction, "id" | "updatedAt">) => void;
  bulkCategorise: (ids: string[], categoryId: string) => void;
  splitTransaction: (id: string, categoryIds: [string, string]) => void;
  addRule: (rule: Omit<CategorisationRule, "id">) => void;
  updateRule: (id: string, patch: Partial<CategorisationRule>) => void;
  addGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<SavingsGoal>) => void;
  contributeToGoal: (id: string, cents: number) => void;
  recordPayAllocation: (allocation: Omit<PayAllocation, "id" | "createdAt">) => void;
  removePayAllocation: (id: string) => void;
  addHolding: (holding: Omit<InvestmentHolding, "id" | "archived">) => void;
  updateHolding: (id: string, patch: Partial<InvestmentHolding>) => void;
  addAccount: (account: Omit<Account, "id">) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  addLiability: (liability: Omit<Liability, "id">) => void;
  addAsset: (asset: Omit<ManualAsset, "id">) => void;
  updatePlan: (patch: Partial<FinanceState["plans"][number]>) => void;
  saveReview: (review: MonthlyReview) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  dismissNotification: (id: string) => void;
  refreshConnection: () => void;
  setConnectionStatus: (status: FinanceState["bankConnection"]["status"]) => void;
  updatePreferences: (patch: Partial<FinanceState["preferences"]>) => void;
  resetDemo: () => void;
  deleteAllData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FinanceState>(freshSeed);
  const [hydrated, setHydrated] = useState(false);

  // Initial load: postgres mode fetches real state from the server; demo
  // mode restores from browser-local storage exactly as before.
  useEffect(() => {
    if (IS_POSTGRES) {
      fetch("/api/finance/state")
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data: FinanceState) => setState(data))
        .catch((error) => console.error("Failed to load finance state", error))
        .finally(() => setHydrated(true));
      return;
    }
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored)
        try {
          setState(JSON.parse(stored) as FinanceState);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && !IS_POSTGRES) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const update = useCallback(
    (mutator: (current: FinanceState) => FinanceState) => setState((current) => mutator(current)),
    [],
  );

  // Postgres mode: send the mutation to the server and adopt whatever full
  // state it returns (the server is the source of truth). Errors are logged
  // rather than surfaced inline for now — the UI simply keeps its last
  // known-good state if a save fails.
  const callAction = useCallback((action: string, payload: unknown) => {
    fetch("/api/finance/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: FinanceState) => setState(data))
      .catch((error) => console.error(`finance action "${action}" failed`, error));
  }, []);

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      hydrated,
      updateTransaction: (id, patch) => {
        if (IS_POSTGRES) return callAction("updateTransaction", { id, patch });
        update((current) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
          ),
        }));
      },
      addTransaction: (transaction) => {
        if (IS_POSTGRES) return callAction("addTransaction", { transaction });
        update((current) => ({
          ...current,
          transactions: [
            { ...transaction, id: crypto.randomUUID(), updatedAt: new Date().toISOString() },
            ...current.transactions,
          ],
        }));
      },
      bulkCategorise: (ids, categoryId) => {
        if (IS_POSTGRES) return callAction("bulkCategorise", { ids, categoryId });
        update((current) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            ids.includes(item.id)
              ? { ...item, categoryId, manuallyCategorised: true, needsReview: false }
              : item,
          ),
        }));
      },
      splitTransaction: (id, categoryIds) => {
        if (IS_POSTGRES) return callAction("splitTransaction", { id, categoryIds });
        update((current) => ({
          ...current,
          transactions: current.transactions.map((item) => {
            if (item.id !== id) return item;
            const first = Math.trunc(item.amountCents / 2);
            return {
              ...item,
              splits: [
                { id: crypto.randomUUID(), categoryId: categoryIds[0], amountCents: first },
                {
                  id: crypto.randomUUID(),
                  categoryId: categoryIds[1],
                  amountCents: item.amountCents - first,
                },
              ],
              manuallyCategorised: true,
            };
          }),
        }));
      },
      addRule: (rule) => {
        if (IS_POSTGRES) return callAction("addRule", { rule });
        update((current) => ({
          ...current,
          rules: [...current.rules, { ...rule, id: crypto.randomUUID() }],
        }));
      },
      updateRule: (id, patch) => {
        if (IS_POSTGRES) return callAction("updateRule", { id, patch });
        update((current) => ({
          ...current,
          rules: current.rules.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },
      addGoal: (goal) => {
        if (IS_POSTGRES) return callAction("addGoal", { goal });
        update((current) => ({
          ...current,
          goals: [
            ...current.goals,
            { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        }));
      },
      updateGoal: (id, patch) => {
        if (IS_POSTGRES) return callAction("updateGoal", { id, patch });
        update((current) => ({
          ...current,
          goals: current.goals.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },
      contributeToGoal: (id, cents) => {
        if (IS_POSTGRES) return callAction("contributeToGoal", { id, cents });
        update((current) => ({
          ...current,
          goals: current.goals.map((item) => {
            if (item.id !== id) return item;
            const currentCents = Math.min(item.currentCents + cents, item.targetCents);
            return {
              ...item,
              currentCents,
              status: currentCents >= item.targetCents ? "completed" : item.status,
              completedAt:
                currentCents >= item.targetCents ? new Date().toISOString() : item.completedAt,
            };
          }),
        }));
      },
      recordPayAllocation: (allocation) => {
        if (IS_POSTGRES) return callAction("recordPayAllocation", { allocation });
        update((current) => {
          const record: PayAllocation = {
            ...allocation,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          const goals = allocation.applied
            ? current.goals.map((goal) => {
                const split = allocation.goalSplits.find((item) => item.goalId === goal.id);
                if (!split) return goal;
                const currentCents = Math.min(goal.currentCents + split.cents, goal.targetCents);
                return {
                  ...goal,
                  currentCents,
                  status: currentCents >= goal.targetCents ? "completed" : goal.status,
                  completedAt:
                    currentCents >= goal.targetCents ? new Date().toISOString() : goal.completedAt,
                };
              })
            : current.goals;
          return {
            ...current,
            goals,
            payAllocations: [record, ...current.payAllocations],
          };
        });
      },
      removePayAllocation: (id) => {
        if (IS_POSTGRES) return callAction("removePayAllocation", { id });
        update((current) => ({
          ...current,
          payAllocations: current.payAllocations.filter((item) => item.id !== id),
        }));
      },
      addHolding: (holding) => {
        if (IS_POSTGRES) return callAction("addHolding", { holding });
        update((current) => ({
          ...current,
          holdings: [...current.holdings, { ...holding, id: crypto.randomUUID(), archived: false }],
        }));
      },
      updateHolding: (id, patch) => {
        if (IS_POSTGRES) return callAction("updateHolding", { id, patch });
        update((current) => ({
          ...current,
          holdings: current.holdings.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },
      addAccount: (account) => {
        if (IS_POSTGRES) return callAction("addAccount", { account });
        update((current) => ({
          ...current,
          accounts: [...current.accounts, { ...account, id: crypto.randomUUID() }],
        }));
      },
      updateAccount: (id, patch) => {
        if (IS_POSTGRES) return callAction("updateAccount", { id, patch });
        update((current) => ({
          ...current,
          accounts: current.accounts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },
      addLiability: (liability) => {
        if (IS_POSTGRES) return callAction("addLiability", { liability });
        update((current) => ({
          ...current,
          liabilities: [...current.liabilities, { ...liability, id: crypto.randomUUID() }],
        }));
      },
      addAsset: (asset) => {
        if (IS_POSTGRES) return callAction("addAsset", { asset });
        update((current) => ({
          ...current,
          assets: [...current.assets, { ...asset, id: crypto.randomUUID() }],
        }));
      },
      updatePlan: (patch) => {
        if (IS_POSTGRES) return callAction("updatePlan", { patch });
        update((current) => ({
          ...current,
          plans: current.plans.map((plan, index) => (index === 0 ? { ...plan, ...patch } : plan)),
        }));
      },
      saveReview: (review) => {
        if (IS_POSTGRES) return callAction("saveReview", { review });
        update((current) => ({
          ...current,
          reviews: [...current.reviews.filter((item) => item.month !== review.month), review],
        }));
      },
      addCategory: (category) => {
        if (IS_POSTGRES) return callAction("addCategory", { category });
        update((current) => ({
          ...current,
          categories: [...current.categories, { ...category, id: crypto.randomUUID() }],
        }));
      },
      dismissNotification: (id) => {
        if (IS_POSTGRES) return callAction("dismissNotification", { id });
        update((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === id ? { ...item, dismissed: true } : item,
          ),
        }));
      },
      refreshConnection: () => {
        if (IS_POSTGRES) return callAction("refreshConnection", {});
        update((current) => ({
          ...current,
          bankConnection: {
            ...current.bankConnection,
            status: "connected",
            lastSyncedAt: new Date().toISOString(),
          },
          accounts: current.accounts.map((item) =>
            item.connected ? { ...item, lastSyncedAt: new Date().toISOString() } : item,
          ),
        }));
      },
      setConnectionStatus: (status) => {
        if (IS_POSTGRES) return callAction("setConnectionStatus", { status });
        update((current) => ({
          ...current,
          bankConnection: { ...current.bankConnection, status },
          accounts: current.accounts.map((item) => ({
            ...item,
            connected: status === "connected",
          })),
        }));
      },
      updatePreferences: (patch) => {
        if (IS_POSTGRES) return callAction("updatePreferences", { patch });
        update((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
      },
      resetDemo: () => {
        if (IS_POSTGRES) return; // Nothing to reset to in a real deployment.
        window.localStorage.removeItem(STORAGE_KEY);
        setState(freshSeed());
      },
      deleteAllData: () => {
        if (IS_POSTGRES) return callAction("deleteAllData", {});
        setState((current) => ({
          ...freshSeed(),
          categories: current.categories,
          accounts: [],
          transactions: [],
          goals: [],
          holdings: [],
          liabilities: [],
          assets: [],
          recurring: [],
          subscriptions: [],
          netWorthSnapshots: [],
          payAllocations: [],
          reviews: [],
          notifications: [],
          bankConnection: { ...current.bankConnection, status: "disconnected" },
        }));
      },
    }),
    [hydrated, state, update, callAction],
  );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance must be used inside FinanceProvider.");
  return value;
}
