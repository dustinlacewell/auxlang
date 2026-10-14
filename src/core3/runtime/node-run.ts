/**
 * One built node, ready to tick: everything the engine allocates at build for
 * a node (states, reused ins/outs records, compiled bindings or gathers, out
 * slot bases). Both drivers — the interpreter and the generated one — read
 * these same records, so they share one source of semantics.
 */

import type { ReduceTickFn, TickFn } from "../types";
import type { LaneBindings } from "./bindings";
import type { ReduceGathers } from "./gathers";

export interface NodeRun {
	readonly tick: TickFn | ReduceTickFn;
	readonly config: Record<string, unknown>;
	readonly laneCount: number;
	readonly states: Record<string, unknown>[];
	/** Reused across lanes and samples. */
	readonly ins: Record<string, number> & Record<string, Float32Array | number>;
	readonly outs: Record<string, number>;
	readonly outPorts: readonly string[];
	/** outBases[j] + lane = slot of outPorts[j]. */
	readonly outBases: Int32Array;
	/** Per-lane bindings for map nodes; null for reduce. */
	readonly bindings: readonly LaneBindings[] | null;
	/** Gathers for reduce nodes; null for map. */
	readonly gathers: ReduceGathers | null;
}
