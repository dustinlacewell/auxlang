/**
 * A drag's next value for a live slot (number-drag-extension.ts): shape by the
 * slot's unit (shape-by-unit.ts), falling back to the plain additive "sig"
 * case for a slot with no unit (not yet bound to a known port); then clamp to
 * the slot's range when it has one (MANIFESTO §5, "A range gives the knob its
 * travel" — a dragged number stops at the ends; a control widget's own
 * render-control.ts clamps its range the same way).
 */

import type { SlotDecl } from "auxlang/runtime/live/live-contract";
import { shapeByUnit } from "./shape-by-unit";

export function draggedSlotValue(startValue: number, delta: number, decl: SlotDecl | undefined): number {
	const value = shapeByUnit(startValue, delta, decl?.unit ?? "sig");
	if (decl?.min === undefined || decl.max === undefined) return value;
	return Math.max(decl.min, Math.min(decl.max, value));
}
