import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";

const globalDb = globalThis as typeof globalThis & { tenderPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  if (!globalDb.tenderPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 10_000,
    });
    pool.on("error", () => {
      console.error("PrivateTender database pool connection failed.");
    });
    if (process.env.VERCEL) attachDatabasePool(pool);
    globalDb.tenderPool = pool;
  }
  return globalDb.tenderPool;
}
export function getDatabase() {
  return drizzle(getPool());
}
