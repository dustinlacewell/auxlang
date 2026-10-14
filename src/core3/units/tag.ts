/**
 * Unit tags — `hz(x)`, `semis(x)`, `secs(x)`, `beats(x)`. One meaning in both
 * places they appear: "this value is in this unit".
 *
 *   in a defmod `ins`/`outs` record   a port annotation: the port's unit and default
 *   as a value bound to an input      the port converts it to its own unit
 *                                     (patch/convert-tag)
 *
 * A tag IS a PortAnn (`{ unit, def }`). As a value, `def` holds the tagged
 * number or signal. A non-enumerable brand lets the patch layer tell a tagged
 * value from a named-args bag; spreading a tag (e.g. `optional(...)`) keeps a
 * plain PortAnn.
 */

import type { PortAnn } from "../types";

const UNIT_TAG = Symbol("auxlang.unit-tag");

export type TagUnit = "hz" | "semis" | "secs" | "beats";

export interface UnitTag {
	readonly unit: TagUnit;
	readonly def: unknown;
}

type TagFn = {
	(def: number | null): PortAnn;
	(value: unknown): UnitTag;
};

function tagFn(unit: TagUnit): TagFn {
	return ((value: unknown) => {
		const tag = { unit, def: value };
		Object.defineProperty(tag, UNIT_TAG, { value: true });
		return tag;
	}) as TagFn;
}

export const hz = tagFn("hz");
export const semis = tagFn("semis");
export const secs = tagFn("secs");
export const beats = tagFn("beats");

export function isUnitTag(v: unknown): v is UnitTag {
	return typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[UNIT_TAG] === true;
}
