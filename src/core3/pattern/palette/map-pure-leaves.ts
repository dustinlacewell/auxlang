/**
 * Rebuild a Pat tree with every `pure` leaf replaced by `f(leaf)`. Every
 * other node keeps its shape, rebuilt over its mapped children — the one
 * generic structural recursion a palette conversion needs (ast.ts enumerates
 * every op; children.ts is the read-only twin of this rebuild). `f` sees the
 * whole leaf (not just its value) so a caller can recognise one leaf object
 * by identity and leave it untouched (e.g. a pinned, already-indexed leaf).
 */

import type { Pat } from "../ast";

type PureLeaf = Extract<Pat, { op: "pure" }>;

export function mapPureLeaves(pat: Pat, f: (leaf: PureLeaf) => Pat): Pat {
	switch (pat.op) {
		case "pure":
			return f(pat);
		case "silence":
		case "rest":
		case "tie":
		case "signal":
			return pat;
		case "fastcat":
			return { ...pat, children: pat.children.map((c) => mapPureLeaves(c, f)) };
		case "slowcat":
			return { ...pat, children: pat.children.map((c) => mapPureLeaves(c, f)) };
		case "stack":
			return { ...pat, children: pat.children.map((c) => mapPureLeaves(c, f)) };
		case "timecat":
			return {
				...pat,
				children: pat.children.map((wc) => ({ ...wc, pat: mapPureLeaves(wc.pat, f) })),
			};
		case "polymeter":
			return {
				...pat,
				layers: pat.layers.map((layer) => ({ ...layer, pat: mapPureLeaves(layer.pat, f) })),
			};
		case "every":
		case "chunk":
		case "sometimesBy":
			return {
				...pat,
				child: mapPureLeaves(pat.child, f),
				transformed: mapPureLeaves(pat.transformed, f),
			};
		case "mask":
		case "struct":
			return { ...pat, bool: mapPureLeaves(pat.bool, f), child: mapPureLeaves(pat.child, f) };
		case "slide":
		case "steps":
		case "compact":
		case "fast":
		case "slow":
		case "rev":
		case "early":
		case "late":
		case "iter":
		case "swing":
		case "ply":
		case "euclid":
		case "degrade":
		case "seed":
		case "add":
		case "mul":
		case "segment":
		case "clip":
		case "chordidx":
		case "voices":
			return { ...pat, child: mapPureLeaves(pat.child, f) };
	}
}
