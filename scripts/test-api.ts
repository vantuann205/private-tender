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
  const patch = (cookie: string, body: unknown, origin = base.origin) =>
    fetch(new URL("/api/tenders", base), {
      method: "PATCH",
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
    const draftResponse = await post(a, { ...input, status: "Draft" });
    assert.equal(draftResponse.status, 201);
    const draft = (await draftResponse.json()).tender;
    const edit = { id: draft.id, action: "edit", input: { ...input, title: "Edited draft", status: "Draft" } };
    assert.equal((await patch(b, edit)).status, 404, "Another workspace cannot edit a draft.");
    assert.equal((await patch("", edit)).status, 401);
    assert.equal((await patch(a, edit, "https://untrusted.invalid")).status, 403);
    assert.equal((await patch(a, { ...edit, workspaceHash: hashes[1] })).status, 400);
    assert.equal((await patch(a, { ...edit, input: { ...edit.input, status: "Open" } })).status, 400);
    assert.equal((await patch(a, { ...edit, input: { ...edit.input, deadline: "2000-01-01T00:00:00Z" } })).status, 400);
    const edited = await patch(a, edit);
    assert.equal(edited.status, 200, "Draft editing must succeed.");
    assert.equal((await edited.json()).tender.title, "Edited draft");
    const publish = { id: draft.id, action: "publish" };
    for (const invalid of [null, [], { ...publish, action: "reopen" }, { ...publish, amount: "123" }, { ...publish, input }, { ...publish, id: "" }])
      assert.equal((await patch(a, invalid)).status, 400, "Malformed lifecycle requests must fail.");
    assert.equal((await patch(b, publish)).status, 404);
    assert.equal((await patch(a, { id: draft.id, action: "close" })).status, 409);
    await pool.query("UPDATE pt_tenders SET deadline='2000-01-01T00:00:00Z' WHERE workspace_hash=$1 AND id=$2", [hashes[0], draft.id]);
    assert.equal((await patch(a, publish)).status, 400, "Expired drafts cannot publish.");
    assert.equal((await patch(a, edit)).status, 200);
    const publishing = await Promise.all([patch(a, publish), patch(a, publish)]);
    assert.deepEqual(publishing.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await patch(a, edit)).status, 409, "Opened contents are immutable.");
    assert.equal((await patch(b, { id: draft.id, action: "close" })).status, 404);
    const closing = await Promise.all([patch(a, { id: draft.id, action: "close" }), patch(a, { id: draft.id, action: "close" })]);
    assert.deepEqual(closing.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await patch(a, publish)).status, 409, "Closed tenders cannot reopen.");
    assert.equal((await patch(a, edit)).status, 409);
    const finalDraft = (await (await get(a)).json()).tenders.find((row: { id: string }) => row.id === draft.id);
    assert.equal(finalDraft.status, "Closed");
    assert.equal(finalDraft.title, "Edited draft");
    const racingDraft = (await (await post(a, { ...input, status: "Draft" })).json()).tender;
    const [racingEdit, racingPublish] = await Promise.all([
      patch(a, { ...edit, id: racingDraft.id }),
      patch(a, { id: racingDraft.id, action: "publish" }),
    ]);
    assert.equal(racingPublish.status, 200);
    assert.ok([200, 409].includes(racingEdit.status));
    const raced = (await (await get(a)).json()).tenders.find((row: { id: string }) => row.id === racingDraft.id);
    assert.equal(raced.status, "Open");
    assert.equal(raced.title, racingEdit.status === 200 ? "Edited draft" : "API isolation check");
    assert.equal((await patch(a, { ...edit, id: racingDraft.id })).status, 409);
    await pool.query(
      "INSERT INTO pt_tenders (workspace_hash,id,title,description,requirements,deadline,winner_rule,status,organization,category,created_at) SELECT workspace_hash, 'cap-check-' || n::text,title,description,requirements,deadline,winner_rule,status,organization,category,created_at FROM pt_tenders CROSS JOIN generate_series(1,492) AS n WHERE workspace_hash=$1 AND id=$2",
      [hashes[0], tender.id],
    );
    const concurrent = await Promise.all([post(a, input), post(a, input)]);
    assert.deepEqual(
      concurrent.map((response) => response.status).sort(),
      [201, 409],
    );
    const capped = await pool.query(
      "SELECT count(*)::int AS total FROM pt_tenders WHERE workspace_hash=$1",
      [hashes[0]],
    );
    assert.equal(capped.rows[0].total, 500);
    console.log(
      "API integration passed: persistence, seed-once, workspace isolation, cookie flags, request guards, public-field boundary, draft editing, lifecycle/deadline guards, concurrent publish/close, and concurrent 500-record cap.",
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
