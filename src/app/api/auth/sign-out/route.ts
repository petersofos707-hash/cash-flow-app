import { NextResponse, type NextRequest } from "next/server";
import { clearDemoSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isDemoMode()) await clearDemoSession();
  else await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
