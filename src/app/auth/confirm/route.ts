import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, signDemoSession, verifyMagicToken } from "@/lib/auth/session";
import { getServerEnv, usesSignedSession } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const appUrl = getServerEnv().APP_URL;
  const errorUrl = new URL("/login?error=invalid-link", appUrl);
  try {
    if (usesSignedSession()) {
      const token = request.nextUrl.searchParams.get("token");
      if (!token) return NextResponse.redirect(errorUrl);
      const email = await verifyMagicToken(token);
      if (email.toLowerCase() !== getServerEnv().APPROVED_EMAIL.toLowerCase())
        return NextResponse.redirect(errorUrl);
      const sessionMode = getServerEnv().APP_DATA_MODE === "postgres" ? "postgres" : "demo";
      const response = NextResponse.redirect(new URL("/dashboard", appUrl));
      response.cookies.set(SESSION_COOKIE, await signDemoSession(email, sessionMode), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60,
        path: "/",
      });
      return response;
    }
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type") as "email" | "magiclink" | null;
    const code = request.nextUrl.searchParams.get("code");
    const supabase = await createClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("Missing token") };
    if (result.error) return NextResponse.redirect(errorUrl);
    return NextResponse.redirect(new URL("/dashboard", appUrl));
  } catch {
    return NextResponse.redirect(errorUrl);
  }
}
