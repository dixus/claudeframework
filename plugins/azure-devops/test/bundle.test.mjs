import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const bundle = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js");

// The banner esbuild adds must not collide with declarations of the bundled packages.
test("the committed bundle parses as an ES module", () => {
  const result = spawnSync(process.execPath, ["--check", bundle], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
