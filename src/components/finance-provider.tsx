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
  SavingsGoal,
  Transaction,
} from "@/lib/domain/types";

const STORAGE_KEY = "cash-flow-app-demo-v1";
const freshSeed = (): FinanceState => structuredClone(demoSeed);

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
  useEffect(() => {
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
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);
  const update = useCallback(
    (mutator: (current: FinanceState) => FinanceState) => setState((current) => mutator(current)),
    [],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      hydrated,
      updateTransaction: (id, patch) =>
        update((current) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
          ),
        })),
      addTransaction: (transaction) =>
        update((current) => ({
          ...current,
          transactions: [
            { ...transaction, id: crypto.randomUUID(), updatedAt: new Date().toISOString() },
            ...current.transactions,
          ],
        })),
      bulkCategorise: (ids, categoryId) =>
        update((current) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            ids.includes(item.id)
              ? { ...item, categoryId, manuallyCategorised: true, needsReview: false }
              : item,
          ),
        })),
      splitTransaction: (id, categoryIds) =>
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
        })),
      addRule: (rule) =>
        update((current) => ({
          ...current,
          rules: [...current.rules, { ...rule, id: crypto.randomUUID() }],
        })),
      updateRule: (id, patch) =>
        update((current) => ({
          ...current,
          rules: current.rules.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      addGoal: (goal) =>
        update((current) => ({
          ...current,
          goals: [
            ...current.goals,
            { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateGoal: (id, patch) =>
        update((current) => ({
          ...current,
          goals: current.goals.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      contributeToGoal: (id, cents) =>
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
        })),
      addHolding: (holding) =>
        update((current) => ({
          ...current,
          holdings: [...current.holdings, { ...holding, id: crypto.randomUUID(), archived: false }],
        })),
      updateHolding: (id, patch) =>
        update((current) => ({
          ...current,
          holdings: current.holdings.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      addAccount: (account) =>
        update((current) => ({
          ...current,
          accounts: [...current.accounts, { ...account, id: crypto.randomUUID() }],
        })),
      updateAccount: (id, patch) =>
        update((current) => ({
          ...current,
          accounts: current.accounts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      addLiability: (liability) =>
        update((current) => ({
          ...current,
          liabilities: [...current.liabilities, { ...liability, id: crypto.randomUUID() }],
        })),
      addAsset: (asset) =>
        update((current) => ({
          ...current,
          assets: [...current.assets, { ...asset, id: crypto.randomUUID() }],
        })),
      updatePlan: (patch) =>
        update((current) => ({
          ...current,
          plans: current.plans.map((plan, index) => (index === 0 ? { ...plan, ...patch } : plan)),
        })),
      saveReview: (review) =>
        update((current) => ({
          ...current,
          reviews: [...current.reviews.filter((item) => item.month !== review.month), review],
        })),
      addCategory: (category) =>
        update((current) => ({
          ...current,
          categories: [...current.categories, { ...category, id: crypto.randomUUID() }],
        })),
      dismissNotification: (id) =>
        update((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === id ? { ...item, dismissed: true } : item,
          ),
        })),
      refreshConnection: () =>
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
        })),
      setConnectionStatus: (status) =>
        update((current) => ({
          ...current,
          bankConnection: { ...current.bankConnection, status },
          accounts: current.accounts.map((item) => ({
            ...item,
            connected: status === "connected",
          })),
        })),
      updatePreferences: (patch) =>
        update((current) => ({ ...current, preferences: { ...current.preferences, ...patch } })),
      resetDemo: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(freshSeed());
      },
      deleteAllData: () =>
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
          reviews: [],
          notifications: [],
          bankConnection: { ...current.bankConnection, status: "disconnected" },
        })),
    }),
    [hydrated, state, update],
  );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance must be used inside FinanceProvider.");
  return value;
}
