/**
 * A built engine (engine-parts.ts) that renders blocks. `renderBlock` runs
 * the driver over n samples; `tick` is a block of one. Neither allocates.
 * State and buffers are exact at block boundaries, which is where state is
 * read and where a swap hands over.
 *
 * `handOver` makes this engine continue another (MANIFESTO §6.2): it copies
 * the carried lane values into the lane states built ahead, along the carry
 * planned during the build (hand-over/carry-states.ts), writes the feedback
 * values back, and takes the sample count. It only moves values, so it fits
 * the swap's block.
 */

import type { Engine, EngineState, KeyedIdentity } from "../types";
import { deepClone } from "./deep-clone";
import type { EngineParts } from "./engine-parts";
import { captureFeedback, restoreFeedback } from "./feedback";
import { applyCarry } from "./hand-over/carry-states";
import { type OutputLayout, slotOf } from "./output-slots";

export class LiveEngine implements Engine {
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
		const { carry, paired, feedback, layout, sampleRate, bufs } = this.parts;
		applyCarry(carry);
		restoreFeedback(feedback, paired, layout, sampleRate, source, bufs.cur);
		this.count = source.sampleCount;
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
		const { runs, identities, feedback, layout, bufs, sampleRate } = this.parts;
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
		};
	}
}
