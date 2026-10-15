/**
 * The node graph of built runs: for each node, the nodes whose slots it
 * reads, through "n" and "z" bindings and reduce gathers. Pure.
 */

import { BIND_CUR, BIND_PREV, type LaneBindings } from "../../bindings";
import { GATHER_CUR, GATHER_PREV } from "../../gathers";
import type { NodeRun } from "../../node-run";
import { outputSlots } from "../value-slots";

export function nodeDeps(runs: readonly NodeRun[]): number[][] {
	const producer = new Map<number, number>();
	runs.forEach((run, i) => {
		for (const slot of outputSlots(run)) producer.set(slot, i);
	});
	return runs.map((run) => {
		const nodes = new Set<number>();
		for (const slot of readSlots(run)) nodes.add(producer.get(slot) as number);
		return [...nodes].sort((a, b) => a - b);
	});
}

/** Every slot a run reads, this sample or the previous one. */
export function readSlots(run: NodeRun): number[] {
	if (run.gathers !== null) {
		return run.gathers.ports
			.filter((p) => p.kind === GATHER_CUR || p.kind === GATHER_PREV)
			.flatMap((p) => Array.from({ length: p.srcLanes }, (_, l) => p.base + l));
	}
	return (run.bindings as readonly LaneBindings[]).flatMap((b) =>
		[...b.kinds].flatMap((kind, j) =>
			kind === BIND_CUR || kind === BIND_PREV ? [b.offsets[j] as number] : [],
		),
	);
}
