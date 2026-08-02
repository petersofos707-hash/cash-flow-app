import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { readDemoSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const publicPaths = [
  "/login",
  "/auth/confirm",
  "/api/auth/magic-link",
  "/api/health",
  "/manifest.webmanifest",
  "/sw.js",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = publicPaths.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`),
  );
  if ((process.env.APP_DATA_MODE ?? "demo") === "demo") {
    const session = await readDemoSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!isPublic && !session) return NextResponse.redirect(new URL("/login", request.url));
    if (path === "/login" && session)
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
