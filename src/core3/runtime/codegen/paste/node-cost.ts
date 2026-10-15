/**
 * The estimated bytecode size of one node in the generated driver, pasted
 * and at a call site. A pasted lane costs its tick's syntax-tree size plus
 * its ports; a call-site lane costs a call plus its ports. Units are bytes
 * of V8 bytecode, from the per-unit weights below (fitted against measured
 * drivers: src/tests/scratch/codegen-size.ts). Pure: reads only the run's
 * source text, lane count and ports.
 */

import { walk } from "../../../module/tick-subset/walk";
import type { NodeRun } from "../../node-run";
import type { ParseCache } from "./parse-cache";

// Fitted on Node 24 against `Bytecode length` of fully pasted and fully
// call-site drivers (voice chains ×8–×96, wide pads, five site examples).
// Pasted estimates land within −5 %…+10 % of measured; call-site estimates
// within −10 %…+60 %.

/** Bytes per tick syntax-tree node, pasted once per lane. */
const BYTES_PER_TICK_NODE = 4;
/** Bytes per input gather or output scatter of a pasted lane. */
const BYTES_PER_PORT = 8;
/** Bytes per call-site lane: the call, its context-slot loads, its slot locals. */
const BYTES_PER_CALL = 150;
/** Bytes per input gather or output scatter of a call-site lane (a keyed record access). */
const BYTES_PER_CALL_PORT = 4;
/** Bytes per pasted lane beyond its body: the block, the plain parameters, state loads and stores. */
const BYTES_PER_PASTED_LANE = 24;

export interface NodeCost {
	/** Null when the node cannot paste (no checked source). */
	readonly pasted: number | null;
	readonly call: number;
}

export function nodeCost(run: NodeRun, trees: ParseCache): NodeCost {
	const ports = portCount(run);
	const call = run.laneCount * (BYTES_PER_CALL + BYTES_PER_CALL_PORT * ports);
	if (run.source === undefined) return { pasted: null, call };
	const body = treeSize(trees, run.source.tick);
	if (body === null) return { pasted: null, call };
	const lane = BYTES_PER_PASTED_LANE + BYTES_PER_TICK_NODE * body + BYTES_PER_PORT * ports;
	return { pasted: run.laneCount * lane, call };
}

function portCount(run: NodeRun): number {
	const ins =
		run.gathers === null ? (run.bindings?.[0]?.names.length ?? 0) : run.gathers.ports.length;
	return ins + run.outPorts.length;
}

function treeSize(trees: ParseCache, src: string): number | null {
	let fn: ReturnType<ParseCache["parse"]>;
	try {
		fn = trees.parse(src);
	} catch {
		return null;
	}
	let count = 0;
	walk(fn.body, () => {
		count++;
	});
	return count;
}
