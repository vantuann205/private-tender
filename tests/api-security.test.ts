import test from "node:test";
import assert from "node:assert/strict";
import {
  workspaceIdentity,
  assertSameOrigin,
  parseTenderInput,
  readTenderBody,
} from "../src/lib/api-security";
const input = {
  title: "Office supplies",
  description: "Procure supplies for the office.",
  requirements: "Registered vendor",
  deadline: new Date(Date.now() + 86400000).toISOString(),
  winnerRule: "Lowest eligible bid",
  status: "Open",
};
test("workspace identifiers are random, hashed, stable for the holder and distinct across visitors", () => {
  const a = workspaceIdentity(),
    b = workspaceIdentity();
  assert.match(a.token, /^[a-f0-9]{64}$/);
  assert.notEqual(a.hash, a.token);
  assert.notEqual(a.hash, b.hash);
  assert.equal(workspaceIdentity(a.token).hash, a.hash);
  assert.equal(workspaceIdentity(a.token).fresh, false);
  assert.equal(workspaceIdentity("attacker").fresh, true);
});
test("mutations require exact same origin, not suffix matches or missing Origin", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://tender.example/api/tenders", {
        headers: { origin: "https://tender.example" },
      }),
    ),
  );
  for (const origin of [
    "https://evil.example",
    "https://tender.example.evil.test",
    "null",
    "",
  ])
    assert.throws(() =>
      assertSameOrigin(
        new Request("https://tender.example/api/tenders", {
          headers: { origin },
        }),
      ),
    );
});
test("API validates public fields and refuses private amounts, workspace overrides, and ambiguous dates", () => {
  assert.deepEqual(parseTenderInput(input), input);
  for (const bad of [
    null,
    [],
    { ...input, title: 5 },
    { ...input, amount: "200" },
    { ...input, workspaceHash: "other" },
    { ...input, deadline: "2029-01-01T12:00" },
    { ...input, status: "Closed" },
  ])
    assert.throws(() => parseTenderInput(bad));
});
test("JSON body guard validates content type and actual streamed size", async () => {
  const request = (body: string, type = "application/json") =>
    new Request("https://tender.example/api/tenders", {
      method: "POST",
      headers: { "content-type": type },
      body,
    });
  assert.deepEqual(await readTenderBody(request(JSON.stringify(input))), input);
  await assert.rejects(readTenderBody(request("{}", "text/plain")));
  await assert.rejects(readTenderBody(request("not json")));
  await assert.rejects(readTenderBody(request("x".repeat(32769))));
});
