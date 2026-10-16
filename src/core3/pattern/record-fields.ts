/**
 * recordFields — the record field names a pattern's events can carry, sorted:
 * the names of its `with` ops (with-record.ts), read off the AST, never by
 * querying. A seq gives one output per name, and its tables one column.
 *
 * - `with` adds its names to its child's;
 * - the layers of `stack` and `polymeter` sound in their own lanes of one
 *   seq, so they must carry the same fields: different sets are a loud error;
 * - `mask` and `struct` take their child's (the boolean lends no values);
 * - every other op takes the union of its children's.
 *
 * Pats are immutable data, so the names are memoized per node.
 */

import type { Pat } from "./ast";
import { childrenOf } from "./children";

const memo = new WeakMap<Pat, readonly string[]>();

const NONE: readonly string[] = [];

export function recordFields(pat: Pat): readonly string[] {
	let names = memo.get(pat);
	if (names === undefined) {
		names = structuralFields(pat);
		memo.set(pat, names);
	}
	return names;
}

function structuralFields(pat: Pat): readonly string[] {
	switch (pat.op) {
		case "with":
			return union([recordFields(pat.child), pat.fields.map((field) => field.name)]);
		case "stack":
			return sameInEveryLayer(pat.children, "stack");
		case "polymeter":
			return sameInEveryLayer(
				pat.layers.map((layer) => layer.pat),
				"polymeter",
			);
		case "mask":
		case "struct":
			return recordFields(pat.child);
		default:
			return union(childrenOf(pat).map(recordFields));
	}
}

function union(sets: readonly (readonly string[])[]): readonly string[] {
	const all = new Set(sets.flat());
	return all.size === 0 ? NONE : [...all].sort();
}

function sameInEveryLayer(layers: readonly Pat[], op: string): readonly string[] {
	const first = layers.length === 0 ? NONE : recordFields(layers[0] as Pat);
	for (const layer of layers) {
		const fields = recordFields(layer);
		if (fields.join(",") !== first.join(",")) {
			throw new Error(
				`${op}: layers carry different record fields: [${first.join(", ")}] and [${fields.join(", ")}]. ` +
					"Give every layer the same .with fields.",
			);
		}
	}
	return first;
}
