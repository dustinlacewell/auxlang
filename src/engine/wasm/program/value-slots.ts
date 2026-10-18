/**
 * The engine's value slots (runtime/output-slots.ts) as render locals. A
 * slot's current value is the mirror of its `cur` entry. A slot read one
 * sample late (a feedback edge) also has a previous-value local, copied from
 * the current one at the top of each sample: that is the engine's buffer
 * flip, for the slots that need it.
 */

import { BIND_PREV } from "../../runtime/bindings";
import { GATHER_PREV } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import type { FnEmitter } from "../compile/fn-emitter";
import type { RenderLocals } from "./render-locals";

export class ValueSlots {
	private readonly prv = new Map<number, number>();

	constructor(
		private readonly e: FnEmitter,
		private readonly locals: RenderLocals,
		private readonly cur: number,
		runs: readonly NodeRun[],
		private readonly liveBase: number,
	) {
		for (const slot of lateSlots(runs)) this.prv.set(slot, e.local("f64"));
	}

	current(slot: number): number {
		return this.locals.at(this.cur + 8 * slot);
	}

	/** Live slot `index`: a mirror, loaded once per render (the host writes it between renders). */
	live(index: number): number {
		return this.locals.at(this.liveBase + 8 * index);
	}

	previous(slot: number): number {
		const local = this.prv.get(slot);
		if (local === undefined) throw new Error(`wasm: slot ${slot} is not read late`);
		return local;
	}

	/** At the top of a sample: each late slot's previous value is its value so far. */
	emitFlip(): void {
		for (const [slot, local] of this.prv) this.e.code.get(this.current(slot)).set(local);
	}
}

function lateSlots(runs: readonly NodeRun[]): Set<number> {
	const slots = new Set<number>();
	for (const run of runs) {
		for (const b of run.bindings ?? []) {
			b.kinds.forEach((kind, j) => {
				if (kind === BIND_PREV) slots.add(b.offsets[j] as number);
			});
		}
		for (const port of run.gathers?.ports ?? []) {
			if (port.kind !== GATHER_PREV) continue;
			for (let l = 0; l < port.srcLanes; l++) slots.add(port.base + l);
		}
	}
	return slots;
}
