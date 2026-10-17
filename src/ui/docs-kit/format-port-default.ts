/**
 * A port's default cell in the module reference table (module-card.tsx), for
 * a port whose default is not null (a required port renders "required"
 * instead, at the call site): the bare default, or — when the port has a
 * range (MANIFESTO §5, "A range gives the knob its travel") — the default
 * followed by its travel compactly, e.g. "0.5 (0–1)".
 */

import type { PortAnn } from "@/core3/types";

export function formatPortDefault(ann: PortAnn): string {
	if (ann.def === null) return "—"; // optional, unconnected
	if (ann.range === undefined) return String(ann.def);
	return `${ann.def} (${ann.range.min}–${ann.range.max})`;
}
