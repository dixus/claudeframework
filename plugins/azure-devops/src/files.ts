import { isAbsolute, relative, resolve, sep } from "node:path";
import { projectDir } from "./config.js";

/**
 * Resolve an archive entry name below `root`. Throws when the entry would
 * land outside of it (zip slip: "../", absolute paths, drive letters).
 */
export function resolveInside(root: string, entryName: string): string {
  const normalized = entryName.replace(/\\/g, "/");
  if (isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`Archive entry "${entryName}" has an absolute path`);
  }
  const rootPath = resolve(root);
  const target = resolve(rootPath, normalized);
  const fromRoot = relative(rootPath, target);
  if (fromRoot === "" || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error(`Archive entry "${entryName}" escapes the target directory`);
  }
  return target.endsWith(sep) ? target.slice(0, -1) : target;
}

/**
 * The only download location, `<project>/.claude/artifacts` — keep it
 * gitignored. Not configurable on purpose — traces can carry secrets in
 * clear text, and a caller-chosen directory could be a tracked one.
 */
export function artifactDir(buildId: number, artifactName: string): string {
  const root = resolve(projectDir(), ".claude", "artifacts");
  return resolveInside(root, `build-${buildId}/${artifactName}`);
}
