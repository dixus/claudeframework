import { test } from "node:test";
import assert from "node:assert/strict";
import { findFileOverlaps, prIdFromArtifactUrl, ticketIdFromBranch } from "../.test-build/overlap.js";

const pr = (id, sourceBranch, files) => ({ id, title: `PR ${id}`, sourceBranch, files });

// PR iteration changes report "/a/b.cs"; spec lists and git diff report "a/b.cs" — and Windows does not care about case.
test("paths match regardless of leading slash, backslashes and case", () => {
  const overlaps = findFileOverlaps(
    ["Src\\App.Api\\FooService.cs", "Src/Other.cs"],
    [pr(7, "refs/heads/feature/5434-foo", ["/src/app.api/fooservice.cs", "/x.cs"])],
  );
  assert.deepEqual(overlaps, [{
    pullRequestId: 7, title: "PR 7", sourceBranch: "feature/5434-foo", ticketId: 5434,
    files: ["src/app.api/fooservice.cs"],
  }]);
});

test("a PR without a shared file is not reported, and the own branch is never an overlap", () => {
  const overlaps = findFileOverlaps(
    ["a.cs", "b.cs"],
    [pr(1, "refs/heads/1000-own", ["/a.cs"]), pr(2, "refs/heads/1001-other", ["/c.cs"]), pr(3, "1002-hit", ["/b.cs"])],
    "1000-own",
  );
  assert.deepEqual(overlaps.map((overlap) => overlap.pullRequestId), [3]);
});

test("no planned paths means no overlap", () => {
  assert.deepEqual(findFileOverlaps([], [pr(1, "x", ["/a.cs"])]), []);
});

test("default ticket pattern: first number at the start of the name or of a path segment, with or without refs/heads/", () => {
  assert.equal(ticketIdFromBranch("refs/heads/123-login-form"), 123);
  assert.equal(ticketIdFromBranch("feature/456-login-form"), 456);
  assert.equal(ticketIdFromBranch("users/jane/789.fix"), 789);
  assert.equal(ticketIdFromBranch("42"), 42);
  assert.equal(ticketIdFromBranch("feature/login-form"), null);
  assert.equal(ticketIdFromBranch("release-2024"), null);
});

test("a configured ticket pattern replaces the default", () => {
  const dotted = "^(\\d+)\\.";
  assert.equal(ticketIdFromBranch("refs/heads/321.Bug.Frontend.Fix", dotted), 321);
  assert.equal(ticketIdFromBranch("feature/321-fix", dotted), null);
  assert.equal(ticketIdFromBranch("Feature.Something", dotted), null);
  const overlaps = findFileOverlaps(["a.cs"], [pr(9, "feature/321-fix", ["/a.cs"])], undefined, "AB-(\\d+)");
  assert.equal(overlaps[0].ticketId, null);
});

// Work item relation url shape as ADO returns it.
test("PR id is read from a vstfs PullRequestId artifact link, other links give null", () => {
  assert.equal(prIdFromArtifactUrl("vstfs:///Git/PullRequestId/00000000-0000-4000-8000-000000000001%2f00000000-0000-4000-8000-000000000002%2f1220"), 1220);
  assert.equal(prIdFromArtifactUrl("vstfs:///Git/Commit/p%2fr%2fabc123"), null);
});
