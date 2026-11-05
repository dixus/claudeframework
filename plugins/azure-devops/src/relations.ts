import type { AdoRelation } from "./types.js";

export type LinkType = "Related" | "Parent" | "Child";

/** ADO reference names of the link types the link/unlink tools offer. */
export const LINK_TYPE_REL: Record<LinkType, string> = {
  Related: "System.LinkTypes.Related",
  Parent: "System.LinkTypes.Hierarchy-Reverse",
  Child: "System.LinkTypes.Hierarchy-Forward",
};

export interface RelationMatch {
  index: number;
  rel: string;
}

export type UnlinkPlan =
  | { kind: "none" }
  | { kind: "ambiguous"; matches: RelationMatch[] }
  | {
      kind: "remove";
      match: RelationMatch;
      operations: Array<{ op: string; path: string; value: unknown }>;
    };

/** Work-item link types (as in mapper.extractRelations); artifact links and hyperlinks are not among them. */
const isWorkItemLink = (rel: string): boolean =>
  rel.startsWith("System.LinkTypes.") || rel.startsWith("Microsoft.VSTS.Common.");

/** The tool-facing name of a link type, or the ADO reference name when the tools have none for it. */
export function linkTypeName(rel: string): string {
  const known = (Object.keys(LINK_TYPE_REL) as LinkType[]).find((type) => LINK_TYPE_REL[type] === rel);
  return known ?? rel;
}

/**
 * Work-item links of a work item that point at `targetId`, optionally of one link type. Their URLs end
 * in `/workItems/<id>`; the match is anchored there so #49 never matches #490. Artifact links and
 * hyperlinks never match, even when their URL happens to end in the same id.
 */
export function findRelations(
  relations: AdoRelation[] | undefined,
  targetId: number,
  linkType?: LinkType,
): RelationMatch[] {
  const target = new RegExp(`/workitems/${targetId}$`, "i");
  return (relations ?? [])
    .map((relation, index) => ({ relation, index }))
    .filter(({ relation }) => isWorkItemLink(relation.rel) && target.test(relation.url))
    .filter(({ relation }) => linkType === undefined || relation.rel === LINK_TYPE_REL[linkType])
    .map(({ relation, index }) => ({ index, rel: relation.rel }));
}

/**
 * What removing the link `targetId` from a work item at revision `rev` amounts to. Nothing is removed
 * unless exactly one relation matches. The revision test is best effort: it rejects the patch when a
 * field changed since the read, but in this organisation adding or removing a link does not raise the
 * revision (observed 2026-11), so a concurrent link edit is not caught. The read and the
 * patch are milliseconds apart.
 */
export function planUnlink(
  rev: number,
  relations: AdoRelation[] | undefined,
  targetId: number,
  linkType?: LinkType,
): UnlinkPlan {
  const matches = findRelations(relations, targetId, linkType);
  if (matches.length === 0) {
    return { kind: "none" };
  }
  if (matches.length > 1) {
    return { kind: "ambiguous", matches };
  }
  const match = matches[0];
  return {
    kind: "remove",
    match,
    operations: [
      { op: "test", path: "/rev", value: rev },
      // `value: undefined` only satisfies the operation type; JSON.stringify drops it, so ADO receives a
      // plain remove. A `null` here would be sent and is not part of a JSON-patch remove.
      { op: "remove", path: `/relations/${match.index}`, value: undefined },
    ],
  };
}
