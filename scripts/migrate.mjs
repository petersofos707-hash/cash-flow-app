// Applies db/migrations/*.sql (in filename order) against DATABASE_URL.
// Every statement in those files is written to be safe to re-run (create
// table if not exists, insert ... on conflict do nothing), so this can be
// run again after pulling new migration files without re-applying old ones
// by hand.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migration files found in db/migrations.");
  process.exit(0);
}

const sql = postgres(databaseUrl, { ssl: "require" });

try {
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const contents = readFileSync(path.join(migrationsDir, file), "utf8");
    await sql.unsafe(contents);
    console.log(`  done.`);
  }
  console.log("Migration complete.");
} finally {
  await sql.end();
}
