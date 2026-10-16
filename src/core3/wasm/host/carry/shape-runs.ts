/**
 * The runs that copy one fitting state value (lane-fits.ts) from its old
 * address to its new one: a number or a Float64Array in f64s, any other
 * typed array in words over its whole 8-byte-rounded region, a record field
 * by field (by name: the two may order their fields differently), an array
 * of records element by element. RunList joins what is contiguous.
 *
 * An old rebound field's value is wherever its slot points at the swap: its
 * runs read from that base (`CARRY_DEREF` … `CARRY_POP`, in words). The new
 * value always goes to the fresh field's own storage, which its fresh slot
 * points at, so each name gets its own copy, as the JS hand-over gives.
 */

import type { Field, Shape } from "../../layout/state-shape";
import { sizeOf } from "../../program/state-layout";
import { CARRY_F64, CARRY_REL, CARRY_WORD } from "./carry-run";
import type { RunList } from "./run-list";

/** Field `old` of the old record at `oldBase` into field `fresh` of the new record at `freshBase`. */
export function fieldRuns(
	runs: RunList,
	old: Field,
	oldBase: number,
	fresh: Field,
	freshBase: number,
	relative: boolean,
): void {
	const freshAt = freshBase + fresh.offset;
	if (old.pointer === undefined) {
		shapeRuns(runs, old.shape, oldBase + old.offset, fresh.shape, freshAt, relative);
		return;
	}
	runs.deref(oldBase + old.pointer);
	shapeRuns(runs, old.shape, 0, fresh.shape, freshAt, true);
	runs.pop();
}

/** `relative`: `oldAt` counts from the current base. */
function shapeRuns(
	runs: RunList,
	old: Shape,
	oldAt: number,
	fresh: Shape,
	freshAt: number,
	relative: boolean,
): void {
	switch (fresh.k) {
		case "number":
			runs.add(oldAt, freshAt, 8, relative ? CARRY_REL : CARRY_F64);
			return;
		case "array":
			runs.add(oldAt, freshAt, sizeOf(fresh), relative ? CARRY_REL : fresh.type === "f64" ? CARRY_F64 : CARRY_WORD);
			return;
		case "record":
			if (old.k !== "record") throw new Error("carry: a record against a non-record");
			for (const [name, field] of Object.entries(fresh.fields)) {
				const from = old.fields[name];
				if (from === undefined) throw new Error(`carry: no old field '${name}'`);
				fieldRuns(runs, from, oldAt, field, freshAt, relative);
			}
			return;
		case "records": {
			if (old.k !== "records") throw new Error("carry: records against a non-records");
			const { element } = fresh;
			for (let k = 0; k < fresh.length; k++)
				shapeRuns(
					runs,
					old.element,
					oldAt + k * old.element.size,
					element,
					freshAt + k * element.size,
					relative,
				);
		}
	}
}
