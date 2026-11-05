/**
 * Pure rules for pull request image attachments (ado_upload_pull_request_attachment).
 * Kept free of I/O so it can be tested without Azure DevOps.
 */
import { basename, extname } from "node:path";

/** Still images only — animated formats are refused on purpose. */
export const SCREENSHOT_EXTENSIONS = [".png", ".jpg", ".jpeg"] as const;

/** True when the file name ends in one of SCREENSHOT_EXTENSIONS (any case). */
export function isSupportedScreenshot(fileName: string): boolean {
  const extension = extname(fileName).toLowerCase();
  return (SCREENSHOT_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * The name the attachment is stored under: the override, else the basename of
 * the path. An invalid name is refused rather than sanitised, so the name the
 * caller sees is the name Azure DevOps stores.
 */
export function attachmentName(filePath: string, override?: string): string {
  const name = override ?? basename(filePath);
  if (name === "") {
    throw new Error("Attachment name is empty");
  }
  if (name.includes("/") || name.includes("\\")) {
    throw new Error(`Attachment name "${name}" contains a path separator`);
  }
  if (name.includes("..")) {
    throw new Error(`Attachment name "${name}" contains ".."`);
  }
  if (!isSupportedScreenshot(name)) {
    const extension = extname(name) || "(none)";
    throw new Error(
      `Attachment name "${name}" has unsupported extension "${extension}" — screenshots only (${SCREENSHOT_EXTENSIONS.join(", ")})`,
    );
  }
  return name;
}

/** Endpoint path below the repository: POST …/pullRequests/{id}/attachments/{fileName}. */
export function pullRequestAttachmentPath(pullRequestId: number, fileName: string): string {
  return `/pullRequests/${pullRequestId}/attachments/${encodeURIComponent(fileName)}?api-version=7.1`;
}

/** Markdown image line; the URL is passed through as Azure DevOps returned it. */
export function markdownImage(alt: string, url: string): string {
  return `![${alt.replace(/[[\]]/g, (bracket) => `\\${bracket}`)}](${url})`;
}
