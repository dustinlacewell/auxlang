/**
 * Whether a setup field, read through a chain of member accesses, can yield a
 * reference (a record, an array, another aggregate) rather than a plain
 * number or boolean. A local declared from such a read aliases the
 * aggregate it points into; writing through the local is a write to the
 * field (tick-writes.ts). The decision comes from the field's actual shape
 * (state-shape.ts), read from a trial run of setup (defineModule): a typed
 * array's element is a number, an array of records' element is a record, a
 * record's named property is whatever that property's own shape says.
 */

import type { StateShape } from "../front/state/state-shape";

/** One member access in a chain: `[i]`/`[expr]` (computed) or `.name` (a plain property). */
export type AccessStep = { readonly computed: true } | { readonly computed: false; readonly name: string };

/** The shape at the far end of `path` from `root`, or null if the path cannot apply to this shape. */
export function shapeAtPath(root: StateShape, path: readonly AccessStep[]): StateShape | null {
	let cur: StateShape | null = root;
	for (const step of path) {
		if (cur === null) return null;
		cur = stepInto(cur, step);
	}
	return cur;
}

function stepInto(shape: StateShape, step: AccessStep): StateShape | null {
	if (step.computed) {
		if (shape.k === "records") return shape.element;
		if (shape.k === "array") return { k: "number" };
		if (shape.k === "list") return null; // mixed list: no one element shape
		return null;
	}
	if (shape.k === "record") return shape.fields[step.name] ?? null;
	return null;
}

/** A shape a write through it needs to carry: anything but a plain number or boolean. */
export function shapeCanAlias(shape: StateShape | null): boolean {
	if (shape === null) return true; // unknown: assume it can, the conservative (over- not under-marking) side
	return shape.k !== "number" && shape.k !== "boolean";
}
