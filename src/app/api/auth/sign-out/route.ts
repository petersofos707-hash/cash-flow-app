import { NextResponse, type NextRequest } from "next/server";
import { clearDemoSession } from "@/lib/auth/session";
import { usesSignedSession } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (usesSignedSession()) await clearDemoSession();
  else await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
