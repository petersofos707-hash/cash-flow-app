import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

export const SESSION_COOKIE = "cashflow_session";
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

function signingKey() {
  return new TextEncoder().encode(getServerEnv().APP_SESSION_SECRET);
}

export interface AppUser {
  id: string;
  email: string;
  mode: "demo" | "supabase";
}

export async function createMagicToken(email: string) {
  return new SignJWT({ email, purpose: "magic-link" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setJti(crypto.randomUUID())
    .sign(signingKey());
}

export async function verifyMagicToken(token: string) {
  const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
  if (payload.purpose !== "magic-link" || typeof payload.email !== "string") {
    throw new Error("Invalid magic-link token.");
  }
  return payload.email;
}

export async function signDemoSession(email: string) {
  return new SignJWT({ email, mode: "demo" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(DEMO_USER_ID)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey());
}

export async function createDemoSession(email: string) {
  const token = await signDemoSession(email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
}

export async function readDemoSessionToken(token?: string): Promise<AppUser | null> {
  try {
    const candidate = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
    if (!candidate) return null;
    const { payload } = await jwtVerify(candidate, signingKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string" || payload.mode !== "demo") return null;
    return { id: payload.sub, email: payload.email, mode: "demo" };
  } catch {
    return null;
  }
}

export async function clearDemoSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
