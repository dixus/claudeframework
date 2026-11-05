import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PR_DESCRIPTION_MAX_LENGTH,
  fitDescription,
  isPlaceholderDescription,
  isPlaceholderTitle,
  planPullRequestUpdate,
} from "../.test-build/pullRequest.js";
import { DEFAULT_CONFIG, parseServerConfig } from "../.test-build/config.js";

// A project whose PR automation titles new PRs with the branch name and writes a fixed sentence.
const branch = "feature/123-login-form";
const botTitle = branch;
const botDescription = "Automatically created for refs/heads/feature/123-login-form.";
const configured = parseServerConfig({
  pullRequest: {
    placeholderTitlePatterns: ["^{sourceBranch}$"],
    placeholderDescriptionPatterns: ["^Automatically created for refs/heads/\\S+\\.?$"],
  },
}).pullRequest;
const neutral = DEFAULT_CONFIG.pullRequest;

test("without configured patterns only an empty title or description is a placeholder", () => {
  assert.deepEqual(neutral, { placeholderTitlePatterns: [], placeholderDescriptionPatterns: [] });
  assert.equal(isPlaceholderTitle(botTitle, branch, neutral), false);
  assert.equal(isPlaceholderTitle("  ", branch, neutral), true);
  assert.equal(isPlaceholderTitle(undefined, branch, neutral), false);
  assert.equal(isPlaceholderDescription(botDescription, neutral), false);
  assert.equal(isPlaceholderDescription("", neutral), true);
  assert.equal(isPlaceholderDescription(undefined, neutral), true);
});

test("without configured patterns a bot-written title and description are kept", () => {
  const plan = planPullRequestUpdate(
    { title: botTitle, description: botDescription, sourceBranch: branch },
    { title: "New title", description: "New body" },
    false,
    neutral,
  );
  assert.deepEqual(plan.patch, {});
  assert.equal(plan.kept.length, 2);
});

test("a configured title pattern with {sourceBranch} matches the bare branch name only", () => {
  assert.equal(isPlaceholderTitle(botTitle, branch, configured), true);
  assert.equal(isPlaceholderTitle(` ${botTitle} `, branch, configured), true);
  assert.equal(isPlaceholderTitle("feat: login form", branch, configured), false);
  assert.equal(isPlaceholderTitle("feature/123-login-form-v2", branch, configured), false);
  // The branch name is escaped: its "." or "+" are literal characters.
  assert.equal(isPlaceholderTitle("1x2", "1.2", parseServerConfig({ pullRequest: { placeholderTitlePatterns: ["^{sourceBranch}$"] } }).pullRequest), false);
});

test("a configured description pattern matches the bot sentence, text around it is not", () => {
  assert.equal(isPlaceholderDescription(botDescription, configured), true);
  assert.equal(isPlaceholderDescription(botDescription.slice(0, -1), configured), true);
  assert.equal(isPlaceholderDescription(`${botDescription}\n\nReviewer: please check the query`, configured), false);
});

test("configured placeholders are filled", () => {
  const plan = planPullRequestUpdate(
    { title: botTitle, description: botDescription, sourceBranch: branch },
    { title: "New title", description: "New body" },
    false,
    configured,
  );
  assert.deepEqual(plan.patch, { title: "New title", description: "New body" });
  assert.deepEqual(plan.kept, []);
});

test("missing description counts as empty", () => {
  const plan = planPullRequestUpdate({ title: botTitle, sourceBranch: branch }, { description: "Body" }, false, neutral);
  assert.equal(plan.patch.description, "Body");
});

test("whitespace-only description counts as empty", () => {
  const plan = planPullRequestUpdate({ description: " \n\t", sourceBranch: branch }, { description: "Body" }, false, neutral);
  assert.equal(plan.patch.description, "Body");
});

test("hand-written description and title are kept", () => {
  const plan = planPullRequestUpdate(
    { title: "Reviewer-facing title", description: "Written by a person", sourceBranch: branch },
    { title: "New title", description: "New body" },
    false,
    configured,
  );
  assert.deepEqual(plan.patch, {});
  assert.equal(plan.kept.length, 2);
});

test("force overwrites hand-written values", () => {
  const plan = planPullRequestUpdate(
    { title: "Reviewer-facing title", description: "Written by a person", sourceBranch: branch },
    { title: "New title", description: "New body" },
    true,
    neutral,
  );
  assert.deepEqual(plan.patch, { title: "New title", description: "New body" });
});

test("fields not requested are not touched", () => {
  const plan = planPullRequestUpdate(
    { title: botTitle, description: botDescription, sourceBranch: branch },
    { description: "Body" },
    false,
    configured,
  );
  assert.equal("title" in plan.patch, false);
});

test("description at the limit passes unchanged", () => {
  const exact = "x".repeat(PR_DESCRIPTION_MAX_LENGTH);
  assert.deepEqual(fitDescription(exact), { text: exact, truncated: false });
});

test("description over the limit is truncated to the limit and flagged", () => {
  const fitted = fitDescription("x".repeat(PR_DESCRIPTION_MAX_LENGTH + 1));
  assert.equal(fitted.truncated, true);
  assert.equal(fitted.text.length, PR_DESCRIPTION_MAX_LENGTH);
  assert.match(fitted.text, /truncated/);
});

test("update plan reports truncation", () => {
  const plan = planPullRequestUpdate({ description: "", sourceBranch: branch }, { description: "y".repeat(5000) }, false, neutral);
  assert.equal(plan.truncated, true);
  assert.equal(plan.patch.description.length, PR_DESCRIPTION_MAX_LENGTH);
});
