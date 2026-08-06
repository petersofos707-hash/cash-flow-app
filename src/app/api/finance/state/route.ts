import { getCurrentUser } from "@/lib/auth/current-user";
import { isPostgresMode } from "@/lib/env";
import { loadFinanceState } from "@/lib/db/finance";

export async function GET() {
  if (!isPostgresMode())
    return Response.json({ error: "Postgres mode is not enabled." }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const state = await loadFinanceState();
  return Response.json(state);
}
