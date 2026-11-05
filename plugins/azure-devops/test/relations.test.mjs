import { test } from "node:test";
import assert from "node:assert/strict";
import { LINK_TYPE_REL, findRelations, linkTypeName, planUnlink } from "../.test-build/relations.js";

// Relation shapes as ADO returns them on a work item read with $expand=all.
const org = "https://dev.azure.com/example-org/00000000-0000-4000-8000-000000000001/_apis/wit/workItems";
const related = (id) => ({ rel: LINK_TYPE_REL.Related, url: `${org}/${id}`, attributes: { isLocked: false } });
const child = (id) => ({ rel: LINK_TYPE_REL.Child, url: `${org}/${id}`, attributes: { isLocked: false } });
const commit = { rel: "ArtifactLink", url: "vstfs:///Git/Commit/abc%2f486", attributes: { name: "Fixed in Commit" } };

test("finds the relation to the target and reports its index", () => {
  const relations = [commit, related(483), related(486)];
  assert.deepEqual(findRelations(relations, 486), [{ index: 2, rel: LINK_TYPE_REL.Related }]);
});

test("the id is matched whole: #49 does not match a link to #490", () => {
  const relations = [related(490), commit];
  assert.deepEqual(findRelations(relations, 649), []);
  assert.deepEqual(findRelations(relations, 490), [{ index: 0, rel: LINK_TYPE_REL.Related }]);
});

test("artifact links and hyperlinks never match, even when their URL ends in the target id", () => {
  const hyperlink = { rel: "Hyperlink", url: `${org}/486`, attributes: {} };
  const commitEndingInId = { rel: "ArtifactLink", url: `${org}/486`, attributes: { name: "Fixed in Commit" } };
  assert.deepEqual(findRelations([hyperlink, commitEndingInId, related(486)], 486), [{ index: 2, rel: LINK_TYPE_REL.Related }]);
});

test("messages name the link type the tools use, and fall back to the ADO name", () => {
  assert.equal(linkTypeName(LINK_TYPE_REL.Parent), "Parent");
  assert.equal(linkTypeName("System.LinkTypes.Duplicate-Forward"), "System.LinkTypes.Duplicate-Forward");
});

test("a link type narrows the matches", () => {
  const relations = [related(486), child(486)];
  assert.deepEqual(findRelations(relations, 486, "Child"), [{ index: 1, rel: LINK_TYPE_REL.Child }]);
  assert.deepEqual(findRelations(relations, 486, "Parent"), []);
});

test("an item without relations has no matches", () => {
  assert.deepEqual(findRelations(undefined, 486), []);
});

test("one match: test the revision, then remove exactly that index", () => {
  const plan = planUnlink(17, [commit, related(486)], 486);
  assert.equal(plan.kind, "remove");
  assert.deepEqual(plan.match, { index: 1, rel: LINK_TYPE_REL.Related });
  assert.deepEqual(plan.operations, [
    { op: "test", path: "/rev", value: 17 },
    { op: "remove", path: "/relations/1", value: undefined },
  ]);
});

test("no match: nothing to remove", () => {
  assert.deepEqual(planUnlink(17, [related(483)], 486), { kind: "none" });
});

test("several matches without a link type: nothing is removed, the matches are listed", () => {
  const plan = planUnlink(17, [related(486), child(486)], 486);
  assert.equal(plan.kind, "ambiguous");
  assert.deepEqual(plan.matches.map((match) => match.index), [0, 1]);
  // The same pair with a link type is unambiguous again.
  assert.equal(planUnlink(17, [related(486), child(486)], 486, "Related").kind, "remove");
});
