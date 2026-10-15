/**
 * The host side of the event tables (MANIFESTO §8): pattern queries stay in
 * JS. A fill stages the rows in the lane's scratch table as the JS binding
 * does (bridge/lane-table.ts), then copies them into the table heap
 * (table-heap.ts). Three kinds of fill:
 *
 * - `fill`: the module's `env.fill`, the miss path inside `render`, into
 *   `cur`. Counted in `misses`.
 * - `fillAhead`: after a render, each lane that wants a cycle gets it in
 *   `next`, at most `budget` fills per call; the rest wait for the next
 *   block, taken in turn so no lane starves.
 * - `prefill`, `prefillLane`: a build step, `cur` and `next` for a start
 *   cycle (all lanes, or one).
 *
 * A table is a pure function of (pattern, seed, lane, cycle), so which kind
 * filled it changes timing only, never output.
 */

import { fillLaneTable, laneTable } from "../../bridge/lane-table";
import type { NodeRun } from "../../runtime/node-run";
import { SLOT_CUR, SLOT_NEXT } from "../layout/table-format";
import { tableLanes } from "../layout/table-lanes";
import type { WasmLayout } from "../program/memory-layout";
import type { TableHeap } from "./table-heap";

interface TableLane {
	readonly state: Record<string, unknown>;
	readonly config: Record<string, unknown>;
	readonly slot: number;
}

export class SeqTables {
	/** `env.fill` calls: fills inside `render`. */
	misses = 0;
	private readonly lanes: readonly TableLane[];
	/** Node → lane → index into `lanes`. */
	private readonly index: readonly (readonly number[])[];
	private turn = 0;

	constructor(
		runs: readonly NodeRun[],
		layout: WasmLayout,
		private readonly heap: TableHeap,
	) {
		const refs = tableLanes(layout);
		this.lanes = refs.map(({ node, lane, slot }) => {
			const run = runs[node] as NodeRun;
			heap.init(slot);
			return { state: run.states[lane] as Record<string, unknown>, config: run.config, slot };
		});
		const index = layout.nodes.map((node) => node.lanes.map(() => -1));
		refs.forEach(({ node, lane }, k) => {
			(index[node] as number[])[lane] = k;
		});
		this.index = index;
	}

	/** Table lanes, numbered in layout order (layout/table-lanes.ts). */
	get count(): number {
		return this.lanes.length;
	}

	/** The miss path: `cur` of (node, lane) gets `cycle`. */
	fill(node: number, lane: number, cycle: number): void {
		this.misses++;
		this.stage(this.lanes[this.index[node]?.[lane] as number] as TableLane, SLOT_CUR, cycle);
	}

	/** The cycle `cur` of (node, lane) holds; NaN when it holds none or the lane has no tables. */
	cycleOf(node: number, lane: number): number {
		const k = this.index[node]?.[lane] ?? -1;
		if (k < 0) return Number.NaN;
		return this.heap.cycleAt((this.lanes[k] as TableLane).slot, SLOT_CUR);
	}

	/** Fill wanted cycles into `next`, at most `budget`; returns how many were filled. */
	fillAhead(budget: number): number {
		const lanes = this.lanes;
		let filled = 0;
		for (let k = 0; k < lanes.length && filled < budget; k++) {
			const at = (this.turn + k) % lanes.length;
			const lane = lanes[at] as TableLane;
			const want = this.heap.want(lane.slot);
			if (Number.isNaN(want)) continue;
			this.heap.clearWant(lane.slot);
			if (this.heap.cycleAt(lane.slot, SLOT_NEXT) === want) continue;
			this.stage(lane, SLOT_NEXT, want);
			filled++;
			this.turn = at + 1;
		}
		this.heap.keepReserve();
		return filled;
	}

	/** Every lane's `cur` gets `cycle`, `next` the one after. */
	prefill(cycle: number): void {
		for (let k = 0; k < this.lanes.length; k++) this.prefillLane(k, cycle);
	}

	/** Table lane `k`'s `cur` gets `cycle`, `next` the one after. */
	prefillLane(k: number, cycle: number): void {
		const lane = this.lanes[k] as TableLane;
		this.stage(lane, SLOT_CUR, cycle);
		this.stage(lane, SLOT_NEXT, cycle + 1);
		this.heap.keepReserve();
	}

	private stage(lane: TableLane, which: number, cycle: number): void {
		fillLaneTable(lane.state, lane.config, cycle);
		this.heap.write(lane.slot, which, laneTable(lane.state));
	}
}
