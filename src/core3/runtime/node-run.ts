/**
 * One built node, ready to tick: everything the engine allocates at build for
 * a node (states, reused ins/outs records, compiled bindings or gathers, out
 * slot bases). The interpreter ticks these records; the WASM compiler reads
 * them (wasm/host/prepare-wasm.ts) and writes their states into memory as
 * its start values, so both share one source of semantics.
 */

import type { ReduceTickFn, TickFn } from "../types";
import type { LaneBindings } from "./bindings";
import type { ReduceGathers } from "./gathers";
import type { NodeGroupViews } from "./group-view";

export interface NodeRun {
	readonly tick: TickFn | ReduceTickFn;
	readonly config: Record<string, unknown>;
	/** The module's monitor contract (ModuleSpec.monitor), for a live monitor's event reads; absent on most modules. */
	readonly monitor?: Readonly<{ row: string; held: string; gate: string }>;
	readonly laneCount: number;
	readonly states: Record<string, unknown>[];
	/** Reused across lanes and samples. */
	readonly ins: Record<string, number> & Record<string, Float64Array | number>;
	readonly outs: Record<string, number> & Record<string, Float64Array | number>;
	readonly outPorts: readonly string[];
	/** outBases[j] + lane = slot of outPorts[j]. */
	readonly outBases: Int32Array;
	/** Per-lane bindings for map nodes; null for reduce. */
	readonly bindings: readonly LaneBindings[] | null;
	/** Gathers for reduce nodes; null for map. */
	readonly gathers: ReduceGathers | null;
	/** Port group views (empty on a group-less module). */
	readonly groups: NodeGroupViews;
}
