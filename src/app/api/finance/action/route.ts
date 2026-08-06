/* eslint-disable @typescript-eslint/no-explicit-any -- payload shapes are validated by the client types that call this private, single-owner endpoint */
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPostgresMode } from "@/lib/env";
import {
  dbAddAccount,
  dbAddAsset,
  dbAddCategory,
  dbAddGoal,
  dbAddHolding,
  dbAddLiability,
  dbAddRule,
  dbAddTransaction,
  dbBulkCategorise,
  dbContributeToGoal,
  dbDeleteAllData,
  dbDismissNotification,
  dbRecordPayAllocation,
  dbRefreshConnection,
  dbRemovePayAllocation,
  dbSaveReview,
  dbSetConnectionStatus,
  dbSplitTransaction,
  dbUpdateAccount,
  dbUpdateGoal,
  dbUpdateHolding,
  dbUpdatePlan,
  dbUpdatePreferences,
  dbUpdateRule,
  dbUpdateTransaction,
  loadFinanceState,
} from "@/lib/db/finance";

// A single RPC-style endpoint for every finance mutation. This is a private,
// single-owner app (one approved email, gated by the signed session cookie),
// so a generic dispatcher is simpler and safer to keep consistent than ~20
// separate REST routes duplicating the same auth check. After every mutation
// the full state is reloaded and returned so the client always ends up in
// sync with the database.
const handlers: Record<string, (payload: unknown) => Promise<void>> = {
  updateTransaction: (p: any) => dbUpdateTransaction(p.id, p.patch),
  addTransaction: (p: any) => dbAddTransaction(p.transaction),
  bulkCategorise: (p: any) => dbBulkCategorise(p.ids, p.categoryId),
  splitTransaction: (p: any) => dbSplitTransaction(p.id, p.categoryIds),
  addRule: (p: any) => dbAddRule(p.rule),
  updateRule: (p: any) => dbUpdateRule(p.id, p.patch),
  addGoal: (p: any) => dbAddGoal(p.goal),
  updateGoal: (p: any) => dbUpdateGoal(p.id, p.patch),
  contributeToGoal: (p: any) => dbContributeToGoal(p.id, p.cents),
  recordPayAllocation: (p: any) => dbRecordPayAllocation(p.allocation),
  removePayAllocation: (p: any) => dbRemovePayAllocation(p.id),
  addHolding: (p: any) => dbAddHolding(p.holding),
  updateHolding: (p: any) => dbUpdateHolding(p.id, p.patch),
  addAccount: (p: any) => dbAddAccount(p.account),
  updateAccount: (p: any) => dbUpdateAccount(p.id, p.patch),
  addLiability: (p: any) => dbAddLiability(p.liability),
  addAsset: (p: any) => dbAddAsset(p.asset),
  updatePlan: (p: any) => dbUpdatePlan(p.patch),
  saveReview: (p: any) => dbSaveReview(p.review),
  addCategory: (p: any) => dbAddCategory(p.category),
  dismissNotification: (p: any) => dbDismissNotification(p.id),
  refreshConnection: () => dbRefreshConnection(),
  setConnectionStatus: (p: any) => dbSetConnectionStatus(p.status),
  updatePreferences: (p: any) => dbUpdatePreferences(p.patch),
  deleteAllData: () => dbDeleteAllData(),
};

export async function POST(request: Request) {
  if (!isPostgresMode())
    return Response.json({ error: "Postgres mode is not enabled." }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const handler = typeof action === "string" ? handlers[action] : undefined;
  if (!handler) return Response.json({ error: `Unknown action "${action}".` }, { status: 400 });

  try {
    await handler(body.payload);
  } catch (error) {
    console.error(`finance action "${action}" failed`, error);
    return Response.json({ error: "That change could not be saved." }, { status: 500 });
  }

  const state = await loadFinanceState();
  return Response.json(state);
}
