/**
 * The runs that copy one fitting state value (lane-fits.ts) from its old
 * address to its new one: a number or a Float64Array in f64s, any other
 * typed array in words over its whole 8-byte-rounded region, a record field
 * by field (by name: the two may order their fields differently), an array
 * of records element by element. RunList joins what is contiguous.
 */

import type { Shape } from "../../layout/state-shape";
import { sizeOf } from "../../program/state-layout";
import { CARRY_F64, CARRY_WORD } from "./carry-run";
import type { RunList } from "./run-list";

export function shapeRuns(
	runs: RunList,
	old: Shape,
	oldAt: number,
	fresh: Shape,
	freshAt: number,
): void {
	switch (fresh.k) {
		case "number":
			runs.add(oldAt, freshAt, 8, CARRY_F64);
			return;
		case "array":
			runs.add(oldAt, freshAt, sizeOf(fresh), fresh.type === "f64" ? CARRY_F64 : CARRY_WORD);
			return;
		case "record":
			if (old.k !== "record") throw new Error("carry: a record against a non-record");
			for (const [name, field] of Object.entries(fresh.fields)) {
				const from = old.fields[name];
				if (from === undefined) throw new Error(`carry: no old field '${name}'`);
				shapeRuns(runs, from.shape, oldAt + from.offset, field.shape, freshAt + field.offset);
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
				);
		}
	}
}
