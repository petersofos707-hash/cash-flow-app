import { z } from "zod";

const serverSchema = z.object({
  APP_DATA_MODE: z.enum(["demo", "supabase", "postgres"]).default("demo"),
  APP_URL: z.url().default("http://localhost:3000"),
  APPROVED_EMAIL: z.email().default("owner@example.com"),
  APP_SESSION_SECRET: z.string().min(32).default("demo-only-secret-change-before-production"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export type AppMode = "demo" | "supabase" | "postgres";

export function getServerEnv() {
  const parsed = serverSchema.parse(process.env);
  if (
    parsed.APP_DATA_MODE === "supabase" &&
    (!parsed.NEXT_PUBLIC_SUPABASE_URL || !parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ) {
    throw new Error("Supabase mode requires a project URL and publishable key.");
  }
  if (parsed.APP_DATA_MODE === "postgres" && !parsed.DATABASE_URL) {
    throw new Error("Postgres mode requires DATABASE_URL.");
  }
  return parsed;
}

export function isDemoMode() {
  return (process.env.APP_DATA_MODE ?? "demo") === "demo";
}

export function isPostgresMode() {
  return process.env.APP_DATA_MODE === "postgres";
}

// Both "demo" and "postgres" modes use the app's own signed-cookie session
// (single approved-email owner, no Supabase). Only "supabase" mode uses
// Supabase Auth's PKCE flow.
export function usesSignedSession() {
  return (process.env.APP_DATA_MODE ?? "demo") !== "supabase";
}
