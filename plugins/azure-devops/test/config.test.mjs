import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, loadProjectConfig, parseServerConfig } from "../.test-build/config.js";
import { mapWorkItem } from "../.test-build/mapper.js";
import { registerWriteTools } from "../.test-build/tools/write.js";
import { registerPullRequestTools } from "../.test-build/tools/pullRequests.js";

// Generic example values for a process with a custom priority field and two boolean flags.
const configured = parseServerConfig({
  priority: { field: "Custom.Importance", values: ["1 - critical", "2 - high", "3 - medium", "4 - low"], defaultsByType: { Bug: "2 - high" } },
  flags: {
    reviewRequired: "Custom.ReviewRequired",
    hasManualSteps: { field: "Custom.HasManualSteps", description: "Deployment needs manual steps" },
  },
  defaultTargetBranch: "develop",
});

/** Records the tools a register function adds, and a client that records every JSON Patch it is sent. */
function harness(register, config) {
  const tools = new Map();
  const server = { tool: (name, description, shape, handler) => tools.set(name, { description, shape, handler }) };
  const sent = [];
  const workItem = { id: 1, url: "", fields: { "System.Title": "t", "System.WorkItemType": "Bug", "System.State": "New" } };
  const client = {
    createWorkItem: async (type, ops) => { sent.push(...ops); return workItem; },
    updateWorkItem: async (id, ops) => { sent.push(...ops); return workItem; },
  };
  register(server, client, config);
  return { tools, sent };
}

const paths = (ops) => ops.map((op) => op.path);

test("defaults: no priority, no flags, neutral candidates, empty placeholder patterns, main as target branch", () => {
  assert.equal(DEFAULT_CONFIG.priority, undefined);
  assert.deepEqual(DEFAULT_CONFIG.flags, {});
  assert.equal(DEFAULT_CONFIG.defaultTargetBranch, "main");
  assert.deepEqual(DEFAULT_CONFIG.candidates.excludedTags, []);
  assert.deepEqual(DEFAULT_CONFIG.candidates.typeRank, { "Bug": 0, "User Story": 1, "Product Backlog Item": 2, "Requirement": 3, "Issue": 4 });
});

test("a missing config file yields the defaults, an invalid one fails loudly", () => {
  const dir = mkdtempSync(join(tmpdir(), "ado-config-"));
  assert.deepEqual(loadProjectConfig(join(dir, "missing.json")), DEFAULT_CONFIG);
  const invalid = join(dir, "invalid.json");
  writeFileSync(invalid, JSON.stringify({ flags: { title: "Custom.Title" } }));
  assert.throws(() => loadProjectConfig(invalid), /Invalid/);
  writeFileSync(invalid, JSON.stringify({ priority: { field: "no spaces allowed" } }));
  assert.throws(() => loadProjectConfig(invalid), /Invalid/);
  writeFileSync(invalid, JSON.stringify({ branchTicketPattern: "(" }));
  assert.throws(() => loadProjectConfig(invalid), /Invalid/);
  writeFileSync(invalid, JSON.stringify({ unknownKey: 1 }));
  assert.throws(() => loadProjectConfig(invalid), /Invalid/);
});

test("without config the priority and flag parameters are not registered and no custom field is written", async () => {
  const { tools, sent } = harness(registerWriteTools, DEFAULT_CONFIG);
  assert.equal("prio" in tools.get("ado_create_work_item").shape, false);
  const updateShape = tools.get("ado_update_work_item").shape;
  assert.deepEqual(Object.keys(updateShape).sort(), ["acceptanceCriteria", "assignedTo", "description", "id", "state", "title"]);
  assert.doesNotMatch(tools.get("ado_update_work_item").description, /flags/);

  // Even if a caller sneaks the parameters in, nothing outside the standard fields is sent.
  await tools.get("ado_create_work_item").handler({ type: "Bug", title: "t", prio: "1 - critical" });
  await tools.get("ado_update_work_item").handler({ id: 1, title: "x", reviewRequired: true });
  assert.deepEqual(paths(sent), ["/fields/System.Title", "/fields/System.Title"]);
  assert.ok(sent.every((op) => !op.path.includes("Custom.")));
});

test("without config the mapped work item carries no flag properties", () => {
  const raw = { id: 1, url: "", fields: { "System.Title": "t", "Custom.ReviewRequired": true } };
  const mapped = mapWorkItem(raw, DEFAULT_CONFIG);
  assert.equal("reviewRequired" in mapped, false);
  assert.equal("uatRequired" in mapped, false);
});

test("with config the priority parameter writes the configured field", async () => {
  const { tools, sent } = harness(registerWriteTools, configured);
  const prio = tools.get("ado_create_work_item").shape.prio;
  assert.ok(prio);
  assert.match(prio.description, /Custom.Importance/);
  assert.match(prio.description, /Bug → '2 - high'/);
  assert.equal(prio.safeParse("2 - high").success, true);
  assert.equal(prio.safeParse("urgent").success, false);
  await tools.get("ado_create_work_item").handler({ type: "Bug", title: "t", prio: "2 - high" });
  assert.deepEqual(sent.at(-1), { op: "add", path: "/fields/Custom.Importance", value: "2 - high" });
});

test("with config every flag is a boolean parameter writing its field, and is read back by name", async () => {
  const { tools, sent } = harness(registerWriteTools, configured);
  const update = tools.get("ado_update_work_item");
  assert.ok(update.shape.reviewRequired);
  assert.equal(update.shape.hasManualSteps.description, "Deployment needs manual steps");
  assert.match(update.description, /reviewRequired, hasManualSteps/);
  await update.handler({ id: 1, reviewRequired: true, hasManualSteps: false });
  assert.deepEqual(sent, [
    { op: "replace", path: "/fields/Custom.ReviewRequired", value: true },
    { op: "replace", path: "/fields/Custom.HasManualSteps", value: false },
  ]);

  const mapped = mapWorkItem({ id: 1, url: "", fields: { "Custom.ReviewRequired": true } }, configured);
  assert.equal(mapped.reviewRequired, true);
  assert.equal(mapped.hasManualSteps, false);
});

test("the create pull request target branch defaults to the configured branch, else main", () => {
  const neutral = harness(registerPullRequestTools, DEFAULT_CONFIG).tools.get("ado_create_pull_request").shape.targetBranch;
  assert.equal(neutral.parse(undefined), "main");
  const custom = harness(registerPullRequestTools, configured).tools.get("ado_create_pull_request").shape.targetBranch;
  assert.equal(custom.parse(undefined), "develop");
});
