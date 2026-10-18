/**
 * A worklet host (worklet/live-host.ts) fed prepared programs the way
 * audio.ts feeds the worklet, recording what it plays, and the offline
 * interpreter engines over the same samples to hold it against. Prepared
 * programs cross to the host through structuredClone, as postMessage
 * carries them.
 */

import "@/library/all";

import { getRegistry } from "@/dsp/define";
import { BUILD_BUDGET } from "@/runtime/build/build-budget";
import { InterpreterEngine } from "@/runtime/interpreter-engine";
import { withProgramSpecs } from "@/runtime/hydrate-specs";
import type { HostPrepared } from "@/runtime/prepare/host-prepared";
import { prepareWasmProgram } from "@/runtime/prepare/prepare-wasm-program";
import { LiveHost } from "@/runtime/worklet/live-host";
import type { Program } from "@/types";
import { SR } from "../../testing/differential-harness";

export const BLOCK = 128;
export const FADE = SR / 10;

export class Session {
	readonly host = new LiveHost(SR, getRegistry(), (err) => {
		throw err;
	});
	readonly l: number[] = [];
	readonly r: number[] = [];
	running: HostPrepared | undefined;

	/** `budget`: the build budget per block the programs carry. */
	constructor(private readonly budget = BUILD_BUDGET) {}

	/** Prepare against the last program prepared, as audio.ts does. */
	async prepare(program: Program): Promise<HostPrepared> {
		const registry = withProgramSpecs(getRegistry(), program);
		const prepared = await prepareWasmProgram(program, registry, SR, this.running, this.budget);
		this.running = prepared;
		return prepared;
	}

	async play(program: Program): Promise<void> {
		this.post(await this.prepare(program));
	}

	post(prepared: HostPrepared): void {
		this.host.swap(structuredClone(prepared));
	}

	/** Render blocks until the pending program swaps in; returns the swap's host sample. */
	untilSwap(): number {
		for (;;) {
			const at = this.l.length;
			this.block();
			if (!this.host.pending) return at;
		}
	}

	blocks(count: number): void {
		for (let b = 0; b < count; b++) this.block();
	}

	private block(): void {
		const outL = new Float32Array(BLOCK);
		const outR = new Float32Array(BLOCK);
		this.host.render(outL, outR, BLOCK);
		this.l.push(...outL);
		this.r.push(...outR);
	}
}

/** The offline interpreter over the same samples: `before` for `head`, then `after` continuing it. */
export function offline(before: Program, after: Program, head: number, tail: number) {
	const first = new InterpreterEngine(before, SR, withProgramSpecs(getRegistry(), before));
	const headL = new Float32Array(head);
	const headR = new Float32Array(head);
	first.renderBlock(headL, headR, 0, head);
	const second = new InterpreterEngine(
		after,
		SR,
		withProgramSpecs(getRegistry(), after),
		first.collectState(),
	);
	const tailL = new Float32Array(tail);
	const tailR = new Float32Array(tail);
	second.renderBlock(tailL, tailR, 0, tail);
	return { headL, headR, tailL, tailR };
}

export const slice = (xs: readonly number[], from: number, to: number) =>
	Float32Array.from(xs.slice(from, to));
