import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const fast = process.argv.includes("--fast");
const compileOnly = process.argv.includes("--compile-only");
const args = [
  "compile",
  "+0.31.1",
  ...(fast ? ["--skip-zk"] : []),
  "contracts/private-tender.compact",
  ".compact-generated/private-tender",
];
rmSync(`${root}.compact-generated/private-tender`, { recursive: true, force: true });

const result = process.platform === "win32"
  ? spawnSync("wsl", [
      "-d", "Ubuntu", "--", "bash", "-lc",
      `cd '${execFileSync("wsl", ["-d", "Ubuntu", "--", "wslpath", "-a", root.replaceAll("\\", "/")], { encoding: "utf8" }).trim()}' && compact ${args.join(" ")}`,
    ], { stdio: "inherit" })
  : spawnSync("compact", args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const info = JSON.parse(readFileSync(`${root}.compact-generated/private-tender/compiler/contract-info.json`, "utf8"));
assert.equal(info["compiler-version"], "0.31.1");
assert.equal(info["language-version"], "0.23.0");
assert.equal(info["runtime-version"], "0.16.0");

if (!compileOnly) {
  const tests = spawnSync(process.execPath, ["--test", "contracts/private-tender.test.mjs"], { cwd: root, stdio: "inherit" });
  if (tests.error) throw tests.error;
  if (tests.status !== 0) process.exit(tests.status ?? 1);
}
