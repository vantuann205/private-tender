import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing database configuration.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("PrivateTender database migrations applied.");
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Migration failed. Check the direct database URL and database permissions; no credentials were logged."); process.exitCode = 1; });
