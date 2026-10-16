/**
 * A built engine (engine-parts.ts) that renders blocks. `renderBlock` runs
 * the driver over n samples; `tick` is a block of one. Neither allocates.
 * State and buffers are exact at block boundaries, which is where state is
 * read and where a swap hands over.
 *
 * `handOver` makes this engine continue another (MANIFESTO §6.2): it copies
 * the carried lane values into the lane states built ahead, along the carry
 * planned during the build (hand-over/carry-states.ts), writes the feedback
 * values back, carries the live slots by site (live/slot-carry.ts), and
 * takes the sample count. It only moves values, so it fits the swap's block.
 *
 * `writeSlot` sets a live slot between blocks: no rebuild, no other state
 * touched. A slot lives outside lane state.
 */

import type { Engine, EngineState, KeyedIdentity } from "../types";
import { deepClone } from "./deep-clone";
import type { EngineParts } from "./engine-parts";
import { captureFeedback, restoreFeedback } from "./feedback";
import { applyCarry } from "./hand-over/carry-states";
import { carriedSlots, slotEntries } from "./live/slot-carry";
import { type SlotTarget, applySlotWrites, isSlotIndex } from "./live/slot-target";
import { type OutputLayout, slotOf } from "./output-slots";

export class LiveEngine implements Engine, SlotTarget {
	private readonly oneL = new Float32Array(1);
	private readonly oneR = new Float32Array(1);
	private count = 0;
	readonly layout: OutputLayout;

	constructor(private readonly parts: EngineParts) {
		this.layout = parts.layout;
	}

	get sampleCount(): number {
		return this.count;
	}

	/** Advance `n` samples; write l/r into `outL`/`outR` from `offset`. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		const { driver, bufs, sampleRate } = this.parts;
		driver(bufs, outL, outR, offset, n, this.count, sampleRate);
		this.count += n;
	}

	tick(out: Float32Array): void {
		this.renderBlock(this.oneL, this.oneR, 0, 1);
		out[0] = this.oneL[0] as number;
		out[1] = this.oneR[0] as number;
	}

	/**
	 * Continue `source`, the engine the build planned its carry against (or
	 * its snapshot): its carried state, feedback values and sample count.
	 */
	handOver(source: EngineState): void {
		const { carry, paired, feedback, layout, sampleRate, bufs, liveSlots } = this.parts;
		applyCarry(carry);
		restoreFeedback(feedback, paired, layout, sampleRate, source, bufs.cur);
		carriedSlots(
			liveSlots.map((slot) => slot.site),
			source.liveSlots,
			bufs.slots,
		);
		this.count = source.sampleCount;
	}

	/** Set live slot `index` (Program.liveSlots); the next sample reads it. Allocates nothing. */
	writeSlot(index: number, value: number): void {
		const slots = this.parts.bufs.slots;
		if (isSlotIndex(index, slots.length)) slots[index] = value;
	}

	/** Apply a SlotWrites message's [index, value] pairs. */
	writeSlots(pairs: Float64Array): void {
		applySlotWrites(pairs, this);
	}

	/** Live slot `index` as written (before the module clamps it). */
	slotValue(index: number): number {
		return this.parts.bufs.slots[index] as number;
	}

	/** Lane states to carry, minus each lane's scratch (derived data, never carried). */
	collectState(): EngineState {
		return this.state((states) =>
			states.map(({ __scratch: _scratch, ...carried }) => deepClone(carried)),
		);
	}

	/**
	 * The state as it stands, not copied: for a hand-over on this block only
	 * (handOver copies the values it carries). Allocates only the records.
	 */
	liveState(): EngineState {
		return this.state((states) => states);
	}

	/** Read a node's output for the sample just ticked. Test/tap hook, not part of the Engine contract. */
	peek(node: number, port: string, lane: number): number {
		return this.parts.bufs.cur[slotOf(this.layout, node, port, lane)] as number;
	}

	private state(
		lanes: (states: Record<string, unknown>[]) => Record<string, unknown>[],
	): EngineState {
		const { runs, identities, feedback, layout, bufs, sampleRate, liveSlots } = this.parts;
		const nodes: Record<string, Record<string, unknown>[]> = {};
		runs.forEach((r, i) => {
			nodes[(identities[i] as KeyedIdentity).key] = lanes(r.states);
		});
		return {
			nodes,
			identities,
			feedback: captureFeedback(feedback, identities, layout, bufs.cur),
			sampleRate,
			sampleCount: this.count,
			...(liveSlots.length > 0
				? { liveSlots: slotEntries(liveSlots, (i) => bufs.slots[i] as number) }
				: {}),
		};
	}
}
