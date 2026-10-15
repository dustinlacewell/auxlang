/**
 * Tag a pattern leaf (pure, rest, tie) with the site it was written at
 * (pattern/ast.ts). No site, or a pattern that is not a leaf, comes back
 * unchanged, so untagged patterns stay structurally identical to before.
 */

import type { Pat } from "./ast";

export function withSite(pat: Pat, site: number | undefined): Pat {
	if (site === undefined) return pat;
	if (pat.op !== "pure" && pat.op !== "rest" && pat.op !== "tie") return pat;
	return { ...pat, site };
}
