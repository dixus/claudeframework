import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachmentName,
  isSupportedScreenshot,
  markdownImage,
  pullRequestAttachmentPath,
} from "../.test-build/prAttachment.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

test("only png and jpeg are accepted as screenshot extensions", () => {
  for (const name of ["a.png", "a.PNG", "a.jpg", "a.jpeg", "a.JPEG"]) {
    assert.equal(isSupportedScreenshot(name), true, name);
  }
  for (const name of ["a.gif", "a.mp4", "a.webm", "a.svg", "a.png.txt", "noextension", ""]) {
    assert.equal(isSupportedScreenshot(name), false, name);
  }
});

test("attachment name defaults to the basename and refuses path separators", () => {
  assert.equal(attachmentName("C:/x/01-grid.png"), "01-grid.png");
  assert.equal(attachmentName("C:/x/01-grid.png", "after.png"), "after.png");
  assert.equal(attachmentName("C:/x/01-grid.png", "a.b.png"), "a.b.png");
  assert.throws(() => attachmentName(""), /empty/);
  assert.throws(() => attachmentName("C:/x/01-grid.png", ""), /empty/);
  assert.throws(() => attachmentName("C:/x/01-grid.png", "a/b.png"), /path separator/);
  assert.throws(() => attachmentName("C:/x/01-grid.png", "a\\b.png"), /path separator/);
  assert.throws(() => attachmentName("C:/x/01-grid.png", "../b.png"), /path separator/);
  // No separator, a supported extension — only the ".." rule can refuse it.
  assert.throws(() => attachmentName("C:/x/01-grid.png", "a..png"), /"\.\."/);
  assert.throws(() => attachmentName("C:/x/clip.mp4"), /unsupported extension "\.mp4"/);
});

test("attachment path carries the pull request id and encodes the file name", () => {
  assert.equal(pullRequestAttachmentPath(1980, "a b.png"), "/pullRequests/1980/attachments/a%20b.png?api-version=7.1");
  assert.equal(pullRequestAttachmentPath(7, "a#b&c.png"), "/pullRequests/7/attachments/a%23b%26c.png?api-version=7.1");
  assert.doesNotMatch(pullRequestAttachmentPath(7, "x y z.png"), / /);
});

test("markdown image renders the alt text escaped and the url verbatim", () => {
  const url = "https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/1/attachments/a.png";
  assert.equal(markdownImage("Grid [new]", url), `![Grid \\[new\\]](${url})`);
  const encoded = "https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/1/attachments/a%20b.png";
  assert.equal(markdownImage("a b", encoded), `![a b](${encoded})`);
});

test("the bundle registers the pull request attachment tool once", () => {
  const bundle = readFileSync(join(packageDir, "dist", "index.js"), "utf8");
  assert.equal(bundle.split('"ado_upload_pull_request_attachment"').length - 1, 1);
  const module = readFileSync(join(packageDir, ".test-build", "prAttachment.js"), "utf8");
  assert.match(module, /^export function isSupportedScreenshot\(/m);
});

test("the README documents the pull request attachment tool", () => {
  const readme = readFileSync(join(packageDir, "README.md"), "utf8");
  const rows = readme.split(/\r?\n/).filter((line) => line.startsWith("| `ado_upload_pull_request_attachment` |"));
  assert.equal(rows.length, 1);
  assert.match(rows[0], /pullRequests\/\{id\}\/attachments/);
});
