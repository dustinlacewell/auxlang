/**
 * Fill a fresh instance's memory from the engine's built values: the value
 * buffer (with feedback start values), each node's outputs record and lane
 * states (numbers, typed arrays and records), and empty math caches, the
 * lane's and each lambda's (NaN, as cache-names.ts). The seq tables are the
 * table heap's (table-heap.ts). The sample count starts at 0, as fresh memory.
 */

import type { NodeRun } from "../../runtime/node-run";
import type { WasmLayout } from "../program/memory-layout";
import { writeState } from "./init-state";

export function initMemory(
	f64: Float64Array,
	layout: WasmLayout,
	runs: readonly NodeRun[],
	cur: Float64Array,
): void {
	f64.set(cur, layout.cur / 8);
	runs.forEach((run, i) => {
		const node = layout.nodes[i];
		if (node === undefined) return;
		for (const [port, addr] of Object.entries(node.outs)) f64[addr / 8] = run.outs[port] as number;
		node.lanes.forEach((lane, l) => {
			const state = run.states[l] as Record<string, unknown>;
			for (const [field, addr] of Object.entries(lane.state)) f64[addr / 8] = Number(state[field]);
			for (const [name, field] of Object.entries(lane.aggregates))
				writeState(f64.buffer as ArrayBuffer, field.offset, field.shape, state[name]);
			f64.fill(Number.NaN, lane.cache / 8, lane.cache / 8 + lane.cacheSlots);
			for (const lambda of Object.values(lane.lambdas))
				f64.fill(Number.NaN, lambda.cache / 8, lambda.cache / 8 + lambda.cacheSlots);
		});
	});
}
