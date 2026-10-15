/**
 * Fill a fresh instance's memory from the engine's built values: the value
 * buffer (with feedback start values), each node's outputs record and lane
 * states (numbers, typed arrays and records), an empty math cache (NaN, as
 * cache-names.ts) and empty seq tables (cycle NaN, as a fresh EventTable).
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
			if (lane.table === null) return;
			f64[lane.table / 8] = Number.NaN;
			f64[lane.table / 8 + 1] = 0;
		});
	});
}
