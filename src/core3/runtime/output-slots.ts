/**
 * Output slot layout: every (node, out-port, lane) gets a fixed index into the
 * engine's flat value buffers. The engine keeps TWO buffers of `size` and flips
 * them each sample — "n" sources read the current buffer, "z" sources read the
 * previous one. Layout is computed once at build; all reads/writes in tick are
 * plain indexed access.
 */

import type { PNode, Registry } from "../types";

export interface OutputLayout {
	/** Total slot count across the program. */
	readonly size: number;
	/** Per node: out-port name -> base slot. Slot of a lane = base + lane. */
	readonly bases: readonly Record<string, number>[];
	/** Per node: number of output lanes (lanes.length; 1 for reduce). */
	readonly laneCounts: readonly number[];
}

export function buildOutputLayout(nodes: readonly PNode[], registry: Registry): OutputLayout {
	const bases: Record<string, number>[] = [];
	const laneCounts: number[] = [];
	let size = 0;
	for (const node of nodes) {
		const spec = registry.get(node.module);
		if (!spec) {
			throw new Error(
				`unknown module '${node.module}'. Known: [${[...registry.keys()].join(", ")}]`,
			);
		}
		const laneCount = node.lanes.length;
		const nodeBases: Record<string, number> = {};
		for (const port of Object.keys(spec.outs)) {
			nodeBases[port] = size;
			size += laneCount;
		}
		bases.push(nodeBases);
		laneCounts.push(laneCount);
	}
	return { size, bases, laneCounts };
}

/** Resolve a (node, port, lane) triple to its slot. Loud on unknown port / lane. */
export function slotOf(layout: OutputLayout, node: number, port: string, lane: number): number {
	const nodeBases = layout.bases[node];
	if (nodeBases === undefined) {
		throw new Error(`slotOf: node index ${node} out of range (${layout.bases.length} nodes)`);
	}
	const base = nodeBases[port];
	if (base === undefined) {
		throw new Error(
			`slotOf: node #${node} has no output port '${port}'. Available: [${Object.keys(nodeBases).join(", ")}]`,
		);
	}
	const laneCount = layout.laneCounts[node] as number;
	if (lane < 0 || lane >= laneCount) {
		throw new Error(
			`slotOf: node #${node} port '${port}' lane ${lane} out of range (width ${laneCount})`,
		);
	}
	return base + lane;
}
