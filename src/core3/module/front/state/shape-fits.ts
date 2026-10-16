/**
 * State-shape fit (MANIFESTO §6.2), for both carries: carried state migrates
 * only when its shape (state-shape.ts) is the new module's fresh shape — the
 * same keys and the same value kinds, recursively, and the same array and
 * typed-array lengths. State is fixed-shape (§5), so a changed length means
 * the module was resized (a config or sample-rate edit) and must start
 * fresh. Record key order is not shape, so two arrays fit item by item. The
 * engine's fields (engine-fields.ts) are not part of the shape. Pure.
 */

import { shapeKeys } from "./engine-fields";
import type { RecordState, StateShape } from "./state-shape";

export function shapeFits(old: StateShape, fresh: StateShape): boolean {
	switch (fresh.k) {
		case "number":
		case "boolean":
			return old.k === fresh.k;
		case "array":
			return old.k === "array" && old.type === fresh.type && old.length === fresh.length;
		case "record":
			return old.k === "record" && fieldsFit(old, fresh);
		case "records":
		case "list":
			return arrayFits(old, fresh);
		case "other":
			return old.k === "other" && old.what === fresh.what && old.bytes === fresh.bytes;
	}
}

function fieldsFit(old: RecordState, fresh: RecordState): boolean {
	const names = shapeKeys(fresh.fields);
	return (
		names.length === shapeKeys(old.fields).length &&
		names.every(
			(name) =>
				Object.hasOwn(old.fields, name) &&
				shapeFits(old.fields[name] as StateShape, fresh.fields[name] as StateShape),
		)
	);
}

type PlainArray = Extract<StateShape, { k: "records" | "list" }>;

function arrayFits(old: StateShape, fresh: PlainArray): boolean {
	if (old.k !== "records" && old.k !== "list") return false;
	if (old.k === "records" && fresh.k === "records")
		return old.length === fresh.length && shapeFits(old.element, fresh.element);
	const length = lengthOf(fresh);
	if (lengthOf(old) !== length) return false;
	for (let i = 0; i < length; i++) if (!shapeFits(itemAt(old, i), itemAt(fresh, i))) return false;
	return true;
}

function lengthOf(array: PlainArray): number {
	return array.k === "records" ? array.length : array.items.length;
}

function itemAt(array: PlainArray, i: number): StateShape {
	return array.k === "records" ? array.element : (array.items[i] as StateShape);
}
