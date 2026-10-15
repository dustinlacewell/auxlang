/**
 * State-shape fit (runtime/state-fits.ts) read from two lanes' memory
 * layouts: the same numeric fields, the same aggregate fields, and each
 * aggregate the same shape — element type and length for a typed array,
 * the same field names (each fitting) for a record, the same length and
 * element for an array of records. Offsets are not shape: a record whose
 * keys came in another order still fits. The engine-injected `__lane`,
 * `__scratch` and `__seed` are not part of the shape.
 */

import type { Field, Shape } from "../../layout/state-shape";
import type { LaneMemory } from "../../program/memory-layout";

export const ENGINE_FIELDS: ReadonlySet<string> = new Set(["__lane", "__scratch", "__seed"]);

export function laneFits(old: LaneMemory, fresh: LaneMemory): boolean {
	return (
		sameNames(shapeKeys(old.state), shapeKeys(fresh.state)) &&
		fieldsFit(pick(old.aggregates), pick(fresh.aggregates))
	);
}

export function shapeFits(old: Shape, fresh: Shape): boolean {
	switch (fresh.k) {
		case "number":
			return old.k === "number";
		case "array":
			return old.k === "array" && old.type === fresh.type && old.length === fresh.length;
		case "record":
			return old.k === "record" && fieldsFit(old.fields, fresh.fields);
		case "records":
			return (
				old.k === "records" && old.length === fresh.length && shapeFits(old.element, fresh.element)
			);
	}
}

/** A lane's field names minus the engine's. */
export function shapeKeys(fields: Readonly<Record<string, unknown>>): string[] {
	return Object.keys(fields).filter((name) => !ENGINE_FIELDS.has(name));
}

type Fields = Readonly<Record<string, Field>>;

function fieldsFit(old: Fields, fresh: Fields): boolean {
	const names = Object.keys(fresh);
	return (
		sameNames(Object.keys(old), names) &&
		names.every((name) => shapeFits((old[name] as Field).shape, (fresh[name] as Field).shape))
	);
}

/** The aggregate fields that are part of the shape. */
function pick(fields: Fields): Fields {
	return Object.fromEntries(shapeKeys(fields).map((name) => [name, fields[name] as Field]));
}

function sameNames(a: readonly string[], b: readonly string[]): boolean {
	const set = new Set(a);
	return a.length === b.length && b.every((name) => set.has(name));
}
