/** The direct sub-patterns of a pattern node, in AST order. */

import type { Pat } from "./ast";

export function childrenOf(pat: Pat): readonly Pat[] {
	switch (pat.op) {
		case "pure":
		case "silence":
		case "rest":
		case "tie":
		case "signal":
			return [];
		case "fastcat":
		case "slowcat":
		case "stack":
			return pat.children;
		case "timecat":
			return pat.children.map((wc) => wc.pat);
		case "polymeter":
			return pat.layers.map((layer) => layer.pat);
		case "every":
		case "chunk":
		case "sometimesBy":
			return [pat.child, pat.transformed];
		case "mask":
		case "struct":
			return [pat.bool, pat.child];
		case "with":
			return [pat.child, ...pat.fields.map((field) => field.pat)];
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
			return [pat.child];
	}
}
