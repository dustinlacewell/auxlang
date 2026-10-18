/**
 * The front end's type (module/front/types/ty.ts) of state laid out in
 * memory: a number field is a number, an array, record or list a ref.
 */

import { NUM, type RecordRef, type RefShape, type Ty, ref } from "../../dsp/front/types/ty";
import type { Aggregate, RecordShape, Shape } from "../layout/state-shape";

export function shapeTy(shape: Shape): Ty {
	return shape.k === "number" ? NUM : ref(refShape(shape));
}

export function refShape(shape: Aggregate): RefShape {
	switch (shape.k) {
		case "array":
			return { k: "array", type: shape.type, length: shape.length };
		case "record":
			return recordRefOf(shape);
		case "records":
			return { k: "records", length: shape.length, element: recordRefOf(shape.element) };
	}
}

export function recordRefOf(shape: RecordShape): RecordRef {
	const fields: Record<string, Ty> = {};
	for (const [name, f] of Object.entries(shape.fields)) fields[name] = shapeTy(f.shape);
	return { k: "record", fields };
}
