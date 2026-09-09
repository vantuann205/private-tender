import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeTenders,
  refreshTenders,
  getTenders,
  getStorageError,
  createTender,
  mutateTender,
} from "../src/features/tenders/storage";
import { seedTenders } from "../src/features/tenders/seed";
test("public API records reject malformed state and strip private extra fields", () => {
  const result = decodeTenders(
    JSON.stringify([
      { ...seedTenders()[0], amount: "55000", vendorIdentity: "secret" },
    ]),
  );
  assert.equal("amount" in result[0], false);
  assert.equal("vendorIdentity" in result[0], false);
  for (const raw of [
    "broken",
    "{}",
    '[{"id":3}]',
    JSON.stringify([{ ...seedTenders()[0], deadline: "invalid" }]),
  ])
    assert.throws(() => decodeTenders(raw));
});
test("mutations replace the server record and preserve the last snapshot on rejection", async () => {
  const originalFetch = globalThis.fetch;
  const seed = seedTenders();
  let status = 200;
  globalThis.fetch = async (_url, options) => {
    if (options?.method !== "PATCH") return Response.json({ tenders: seed });
    assert.deepEqual(JSON.parse(String(options.body)), { id: seed[0].id, action: "close" });
    assert.equal(options.credentials, "same-origin");
    return Response.json(status === 200 ? { tender: { ...seed[0], status: "Closed" } } : { error: "Reload tender state." }, { status });
  };
  try {
    await refreshTenders();
    const closed = await mutateTender({ id: seed[0].id, action: "close" });
    assert.equal(closed.status, "Closed");
    assert.equal(getTenders()?.length, 4);
    assert.equal(getTenders()?.find((t) => t.id === seed[0].id)?.status, "Closed");
    status = 409;
    await assert.rejects(mutateTender({ id: seed[0].id, action: "close" }), /Reload tender state/);
    assert.equal(getTenders()?.find((t) => t.id === seed[0].id)?.status, "Closed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("client uses server results, preserves state on rejected create, and never falls back after a database read failure", async () => {
  const originalFetch = globalThis.fetch;
  const seed = seedTenders();
  let unavailable = false;
  const input = {
    title: "New procurement",
    description: "A well-defined tender.",
    requirements: "Registered vendor",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    winnerRule: "Lowest eligible bid",
    status: "Open" as const,
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Browser storage must not be accessed.");
    },
  });
  globalThis.fetch = async (_url, options) => {
    if (unavailable)
      return Response.json({ error: "unavailable" }, { status: 503 });
    if (options?.method === "POST")
      return Response.json(
        { tender: { ...seed[0], id: "server-issued-id", title: input.title } },
        { status: 201 },
      );
    return Response.json({ tenders: seed });
  };
  try {
    await refreshTenders();
    assert.equal(getTenders()?.length, 4);
    const created = await createTender(input);
    assert.equal(created.id, "server-issued-id");
    assert.equal(getTenders()?.[0].id, "server-issued-id");
    unavailable = true;
    await assert.rejects(createTender(input));
    assert.equal(getTenders()?.length, 5);
    await refreshTenders();
    assert.deepEqual(getTenders(), []);
    assert.ok(getStorageError());
    await assert.rejects(createTender({ ...input, title: "" }));
  } finally {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
