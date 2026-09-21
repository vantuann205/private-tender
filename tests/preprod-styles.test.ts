import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/preprod/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("wallet workspace opts into its scoped controls and panel styling", () => {
  assert.match(page, /className="preprod-console tender-console"/);
  assert.match(css, /\.tender-console \.panel\s*\{/);
  assert.match(css, /\.tender-console textarea/);
});
