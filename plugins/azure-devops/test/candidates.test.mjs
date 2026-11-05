import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCandidateWiql, findReviewer, parsePrio, rankCandidates } from "../.test-build/candidates.js";
import { DEFAULT_CONFIG, parseServerConfig } from "../.test-build/config.js";
import { mapCandidate } from "../.test-build/mapper.js";

// A process with its own types, a custom priority field and excluded tags — all generic example values.
const configured = parseServerConfig({
  priority: { field: "Custom.Importance", values: ["1 - critical", "2 - high", "3 - medium", "4 - low"] },
  candidates: {
    types: ["Defect", "Story"],
    typeRank: { Defect: 0, Story: 1 },
    notStartedStates: ["Open", "Ready"],
    mergedStates: ["Closed", "Done", "Removed"],
    excludedTags: ["Blocked", "Security"],
  },
});
const candidates = configured.candidates;

function item(id, type, prio, createdDate = "2026-01-01T00:00:00Z", tags = []) {
  return { id, title: `#${id}`, type, state: "Open", prio, prioLabel: "", tags, createdDate };
}

const ids = (items) => items.map((candidate) => candidate.id);

test("prio label is parsed from its leading digit, else from its position in the configured values", () => {
  assert.equal(parsePrio("1 - critical"), 1);
  assert.equal(parsePrio("4 - low"), 4);
  assert.equal(parsePrio(2), 2);
  assert.equal(parsePrio(undefined), null);
  assert.equal(parsePrio(""), null);
  assert.equal(parsePrio("high"), null);
  assert.equal(parsePrio("high", ["critical", "high", "low"]), 2);
});

test("lower prio number comes first", () => {
  const { ranked } = rankCandidates([item(1, "Story", 3), item(2, "Story", 1), item(3, "Story", 2)], candidates);
  assert.deepEqual(ids(ranked), [2, 3, 1]);
});

test("on equal prio the configured type rank decides, whatever the creation date", () => {
  const { ranked } = rankCandidates([
    item(1, "Story", 2, "2025-01-01T00:00:00Z"),
    item(2, "Defect", 2, "2026-06-01T00:00:00Z"),
  ], candidates);
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("prio outranks type", () => {
  const { ranked } = rankCandidates([item(1, "Defect", 3), item(2, "Story", 2)], candidates);
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("on equal prio and type the older work item comes first", () => {
  const { ranked } = rankCandidates([
    item(1, "Defect", 2, "2026-05-01T00:00:00Z"),
    item(2, "Defect", 2, "2026-02-01T00:00:00Z"),
  ], candidates);
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("a work item without prio goes last, even behind a low-prio one", () => {
  const { ranked } = rankCandidates([item(1, "Defect", null), item(2, "Story", 4)], candidates);
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("a type missing from typeRank sorts after the ranked types", () => {
  const { ranked } = rankCandidates([item(1, "Other", 2), item(2, "Story", 2)], candidates);
  assert.deepEqual(ids(ranked), [2, 1]);
});

test("configured excluded tags match case-insensitively and are reported with the tag that matched", () => {
  const { ranked, excluded } = rankCandidates([
    item(1, "Story", 1, undefined, ["Frontend", "blocked"]),
    item(2, "Story", 2, undefined, ["Frontend"]),
    item(3, "Defect", 1, undefined, ["Bug", "Security"]),
  ], candidates);
  assert.deepEqual(ids(ranked), [2]);
  assert.deepEqual(excluded.map(({ id, reason }) => ({ id, reason })), [
    { id: 1, reason: "tag blocked" },
    { id: 3, reason: "tag Security" },
  ]);
});

test("an explicit empty exclude list keeps every work item", () => {
  const { ranked, excluded } = rankCandidates([item(1, "Story", 1, undefined, ["Security"])], candidates, []);
  assert.deepEqual(ids(ranked), [1]);
  assert.deepEqual(excluded, []);
});

test("reviewer lookup ignores GUID case, an unknown id is not found", () => {
  const reviewers = [{ id: "a1b2c3d4-0000-4000-8000-00000000abcd", displayName: "Jane Doe", vote: 0, isRequired: true }];
  assert.equal(findReviewer(reviewers, "A1B2C3D4-0000-4000-8000-00000000ABCD")?.displayName, "Jane Doe");
  assert.equal(findReviewer(reviewers, "a1b2c3d4-0000-4000-8000-00000000abce"), undefined);
  assert.equal(findReviewer(undefined, "a1b2c3d4-0000-4000-8000-00000000abcd"), undefined);
});

test("with a configured priority field, mapCandidate reads prio from it, splits tags and keeps the creation date", () => {
  const candidate = mapCandidate({
    id: 42,
    url: "",
    fields: {
      "System.Title": "Filter is ignored",
      "System.WorkItemType": "Defect",
      "System.State": "Open",
      "Custom.Importance": "2 - high",
      "System.Tags": "Bug; Frontend ;",
      "System.CreatedDate": "2026-03-04T05:06:07.89Z",
    },
  }, configured.priority);
  assert.deepEqual(candidate, {
    id: 42,
    title: "Filter is ignored",
    type: "Defect",
    state: "Open",
    prio: 2,
    prioLabel: "2 - high",
    tags: ["Bug", "Frontend"],
    createdDate: "2026-03-04T05:06:07.89Z",
    assignedTo: "",
    predecessorIds: [],
  });
});

test("without a configured priority field, mapCandidate reads no custom field and yields no prio", () => {
  const fields = new Proxy({ "System.Title": "x", "System.WorkItemType": "Bug", "System.State": "New", "Custom.Importance": "1 - critical" }, {
    get(target, key) {
      if (typeof key === "string" && key.startsWith("Custom.")) throw new Error(`read ${key}`);
      return target[key];
    },
  });
  const candidate = mapCandidate({ id: 7, url: "", fields }, DEFAULT_CONFIG.priority);
  assert.equal(candidate.prio, null);
  assert.equal(candidate.prioLabel, "");
  assert.deepEqual(candidate.tags, []);
  assert.equal(candidate.createdDate, "");
});

// Predecessor = System.LinkTypes.Dependency-Reverse. Only a predecessor in a merged state frees a work item.
test("a work item waits while a predecessor is not merged, and is reported with the blocking one", () => {
  const blocked = { ...item(1, "Defect", 1), predecessorIds: [10] };
  const free = { ...item(2, "Story", 3), predecessorIds: [11] };
  const { ranked, excluded } = rankCandidates([blocked, free], candidates, [], new Map([[10, "In Review"], [11, "Closed"]]));
  assert.deepEqual(ids(ranked), [2]);
  assert.deepEqual(excluded.map(({ id, reason }) => ({ id, reason })), [
    { id: 1, reason: "waiting for predecessor #10 (In Review)" },
  ]);
});

test("Done and Removed predecessors free a work item too; an unknown predecessor state blocks", () => {
  const { ranked, excluded } = rankCandidates([
    { ...item(1, "Defect", 1), predecessorIds: [10] },
    { ...item(2, "Defect", 2), predecessorIds: [11] },
    { ...item(3, "Defect", 3), predecessorIds: [12] },
  ], candidates, [], new Map([[10, "Done"], [11, "Removed"]]));
  assert.deepEqual(ids(ranked), [1, 2]);
  assert.deepEqual(excluded.map(({ id, reason }) => ({ id, reason })), [{ id: 3, reason: "waiting for predecessor #12 (unknown)" }]);
});

test("a predecessor that is itself a candidate still blocks its successor in the same run", () => {
  const { ranked, excluded } = rankCandidates([
    { ...item(1, "Story", 2), predecessorIds: [] },
    { ...item(2, "Defect", 1), predecessorIds: [1] },
  ], candidates, [], new Map([[1, "Open"]]));
  assert.deepEqual(ids(ranked), [1]);
  assert.deepEqual(excluded.map(({ id }) => id), [2]);
});

test("mapCandidate reads assignee and predecessor links, ignoring successors and children", () => {
  const link = (rel, id) => ({ rel, url: `https://dev.azure.com/o/_apis/wit/workItems/${id}` });
  const candidate = mapCandidate({
    id: 5, url: "",
    fields: { "System.Title": "t", "System.WorkItemType": "Story", "System.State": "Open", "System.AssignedTo": { displayName: "Jane Doe", uniqueName: "jane@example.com" } },
    relations: [link("System.LinkTypes.Dependency-Reverse", 4), link("System.LinkTypes.Dependency-Forward", 6), link("System.LinkTypes.Hierarchy-Reverse", 1)],
  });
  assert.equal(candidate.assignedTo, "Jane Doe");
  assert.deepEqual(candidate.predecessorIds, [4]);
  assert.equal(mapCandidate({ id: 7, url: "", fields: { "System.Title": "x", "System.WorkItemType": "Story", "System.State": "Open" } }).assignedTo, "");
});

test("candidate WIQL: default mode filters on @Me, epic mode on the ids and on me-or-unassigned", () => {
  const plain = buildCandidateWiql(candidates);
  assert.match(plain, /\[System\.AssignedTo\] = @Me AND|\[System\.AssignedTo\] = @Me ORDER/);
  assert.doesNotMatch(plain, /\[System\.Id\] IN/);
  const epic = buildCandidateWiql(candidates, [11, 12]);
  assert.match(epic, /\[System\.Id\] IN \(11, 12\)/);
  assert.match(epic, /\(\[System\.AssignedTo\] = @Me OR \[System\.AssignedTo\] = ''\)/);
  for (const wiql of [plain, epic]) {
    assert.match(wiql, /\[System\.WorkItemType\] IN \('Defect', 'Story'\)/);
    assert.match(wiql, /\[System\.State\] IN \('Open', 'Ready'\)/);
  }
});

test("candidate WIQL without config uses the standard process types and states, and escapes quotes", () => {
  const wiql = buildCandidateWiql(DEFAULT_CONFIG.candidates);
  assert.match(wiql, /\[System\.WorkItemType\] IN \('Bug', 'User Story', 'Product Backlog Item', 'Requirement', 'Issue'\)/);
  assert.match(wiql, /\[System\.State\] IN \('New', 'To Do', 'Proposed'\)/);
  assert.deepEqual(DEFAULT_CONFIG.candidates.excludedTags, []);
  const quoted = buildCandidateWiql({ ...DEFAULT_CONFIG.candidates, types: ["It's"] });
  assert.match(quoted, /IN \('It''s'\)/);
});
