import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is required for the opt-in integration test.",
    );
  const base = new URL(process.env.TEST_BASE_URL || "http://localhost:3111");
  if (
    base.username ||
    base.password ||
    !["http:", "https:"].includes(base.protocol)
  )
    throw new Error("Invalid test base URL.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  const hashes: string[] = [];
  const headers = (cookie: string, origin = base.origin) => ({
    cookie,
    origin,
    "content-type": "application/json",
  });
  const get = (cookie = "") =>
    fetch(new URL("/api/tenders", base), {
      headers: { cookie },
      signal: AbortSignal.timeout(20000),
    });
  const post = (cookie: string, body: unknown, origin = base.origin) =>
    fetch(new URL("/api/tenders", base), {
      method: "POST",
      headers: headers(cookie, origin),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  async function workspace() {
    const response = await get();
    assert.equal(response.status, 200, "Workspace creation must succeed.");
    const setCookie = response.headers.get("set-cookie") || "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    if (base.protocol === "https:") assert.match(setCookie, /Secure/i);
    const cookie = setCookie.split(";")[0];
    const token = cookie.slice(cookie.indexOf("=") + 1);
    assert.match(token, /^[a-f0-9]{64}$/);
    hashes.push(createHash("sha256").update(token).digest("hex"));
    assert.equal((await response.json()).tenders.length, 4);
    return cookie;
  }
  try {
    const a = await workspace(),
      b = await workspace();
    const input = {
      title: "API isolation check",
      description: "Fictional integration-test tender.",
      requirements: "Registered vendor",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      winnerRule: "Lowest eligible bid",
      status: "Open",
    };
    const result = await post(a, input);
    assert.equal(result.status, 201);
    const { tender } = await result.json();
    assert.equal("workspaceHash" in tender, false);
    assert.equal("amount" in tender, false);
    const reload = await get(a);
    const own = (await reload.json()).tenders as { id: string }[];
    assert.equal(own.length, 5);
    assert.ok(own.some((row) => row.id === tender.id));
    const other = (await (await get(b)).json()).tenders as { id: string }[];
    assert.equal(other.length, 4);
    assert.ok(!other.some((row) => row.id === tender.id));
    assert.equal(
      (await post(a, input, "https://untrusted.invalid")).status,
      403,
    );
    assert.equal((await post("", input)).status, 401);
    assert.equal((await post(a, { ...input, amount: "secret" })).status, 400);
    assert.equal(
      (await post(a, { ...input, workspaceHash: hashes[1] })).status,
      400,
    );
    assert.equal(
      (await post(a, { ...input, deadline: "2000-01-01T00:00:00Z" })).status,
      400,
    );
    const stored = await pool.query(
      "SELECT id, workspace_hash FROM pt_tenders WHERE workspace_hash = $1 AND id = $2",
      [hashes[0], tender.id],
    );
    assert.equal(stored.rowCount, 1);
    const hidden = await pool.query(
      "SELECT id FROM pt_tenders WHERE workspace_hash = $1 AND id = $2",
      [hashes[1], tender.id],
    );
    assert.equal(hidden.rowCount, 0);
    console.log(
      "API integration passed: persistence, seed-once, workspace isolation, cookie flags, request guards, and public-field boundary.",
    );
  } finally {
    // Only workspaces created by this test are removed; cascade deletes their fictional tenders.
    try {
      for (const hash of hashes)
        await pool.query("DELETE FROM pt_workspaces WHERE token_hash = $1", [
          hash,
        ]);
    } finally {
      await pool.end();
    }
  }
}
main().catch(() => {
  console.error(
    "API integration failed. Check the running app, test database, migrations, and assertions; credentials and response bodies were not logged.",
  );
  process.exitCode = 1;
});
