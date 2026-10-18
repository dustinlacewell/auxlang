/**
 * A module that reads a clock's position (in bars) and also counts beats —
 * the beats↔secs converters — declares `beatsPerBar` config. Compile copies
 * the meter of the clock it reads into that config, so its beats match the
 * clock's. Static, like the meter itself. Runs after ambient-clock resolution.
 */

import { nodePorts } from "../dsp/node-ports";
import { isNodeRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";
import { getModule } from "../dsp/define";
import { type SpecTable, resolveSpec } from "../dsp/resolve";
import type { PortAnn } from "../types";

export function copyMeter(nodes: readonly GNode[], specs?: SpecTable): void {
	for (const node of nodes) {
		const spec = resolveSpec(node.module, specs);
		if (!("beatsPerBar" in (spec.config ?? {})) || node.module === "clock") continue;
		const clock = clockRead(node, nodePorts(spec, node.groups).ins);
		if (clock !== null) node.config = { ...node.config, beatsPerBar: meterOf(clock) };
	}
}

/** The clock wired into one of the node's phase-unit inputs, if any. */
function clockRead(node: GNode, ins: Readonly<Record<string, PortAnn>>): GNode | null {
	for (const [port, ann] of Object.entries(ins)) {
		const value = node.inputs[port];
		const fromClock = isNodeRef(value) && value.node.module === "clock";
		if (ann.unit === "phase" && fromClock) return (value as { node: GNode }).node;
	}
	return null;
}

function meterOf(clock: GNode): number {
	const own = clock.config.beatsPerBar;
	return typeof own === "number" ? own : (getModule("clock").config?.beatsPerBar as number);
}
