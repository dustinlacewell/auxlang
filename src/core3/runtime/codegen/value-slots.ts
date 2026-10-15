/**
 * Node outputs live in locals for the whole block: `v<slot>` holds a slot's
 * value for the current sample, and `z<slot>` its value from the previous
 * sample for every slot a "z" source reads. Before the block the locals load
 * from the engine's buffers; at the start of each sample each `z` takes its
 * slot's value from the sample just finished; after the block both store
 * back, so `bufs.cur` holds the last sample and `bufs.prv` the one before it
 * for every z-read slot (no other `prv` slot is ever read).
 */

import { BIND_PREV, type LaneBindings } from "../bindings";
import { GATHER_PREV } from "../gathers";
import type { NodeRun } from "../node-run";
import { prevLocal, slotLocal } from "./name-table";

export interface ValueSlots {
	readonly all: readonly number[];
	readonly prev: readonly number[];
}

/**
 * The slot locals of a function running `runs`: every slot they produce, and
 * a previous-sample local for each of those that one of them reads as "z".
 */
export function valueSlots(runs: readonly NodeRun[]): ValueSlots {
	const all = runs.flatMap(outputSlots);
	const own = new Set(all);
	return { all, prev: [...new Set(runs.flatMap(prevReads))].filter((s) => own.has(s)) };
}

/** Every slot a run produces: each out port's lanes. */
export function outputSlots(run: NodeRun): number[] {
	const slots: number[] = [];
	for (const base of run.outBases)
		for (let lane = 0; lane < run.laneCount; lane++) slots.push(base + lane);
	return slots;
}

export function emitSlotLoads(slots: ValueSlots): string[] {
	return [
		"const cur = bufs.cur;",
		"const prv = bufs.prv;",
		...slots.all.map((s) => `let ${slotLocal(s)} = cur[${s}];`),
		...slots.prev.map((s) => `let ${prevLocal(s)} = prv[${s}];`),
	];
}

export function emitPrevShift(slots: ValueSlots): string[] {
	return slots.prev.map((s) => `${prevLocal(s)} = ${slotLocal(s)};`);
}

export function emitSlotStores(slots: ValueSlots): string[] {
	return [
		...slots.all.map((s) => `cur[${s}] = ${slotLocal(s)};`),
		...slots.prev.map((s) => `prv[${s}] = ${prevLocal(s)};`),
	];
}

function prevReads(run: NodeRun): number[] {
	if (run.gathers !== null) {
		return run.gathers.ports
			.filter((p) => p.kind === GATHER_PREV)
			.flatMap((p) => Array.from({ length: p.srcLanes }, (_, l) => p.base + l));
	}
	return (run.bindings as readonly LaneBindings[]).flatMap((b) =>
		[...b.kinds].flatMap((kind, j) => (kind === BIND_PREV ? [b.offsets[j] as number] : [])),
	);
}
