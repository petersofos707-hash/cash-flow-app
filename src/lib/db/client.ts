import "server-only";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";

let client: ReturnType<typeof postgres> | undefined;

// Single lazily-created connection pool for the process. Postgres mode is
// only used on a long-running Node server (Render), not the edge/serverless
// runtime, so a module-level singleton is safe here.
export function db() {
  if (!client) {
    const { DATABASE_URL } = getServerEnv();
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
    client = postgres(DATABASE_URL, {
      ssl: "require",
      prepare: false,
      max: 5,
      // Cents amounts fit comfortably in a JS number; parse int8/bigint
      // columns as numbers instead of postgres.js's default (string) so
      // callers don't have to Number(...) every balance field.
      types: {
        bigint: {
          to: 20,
          from: [20],
          serialize: (value: number) => String(value),
          parse: (value: string) => Number(value),
        },
      },
    });
  }
  return client;
}
