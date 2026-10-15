/**
 * The worklet host (worklet/live-host.ts) against the offline engine: a
 * program built a budget at a time and swapped in at a block boundary plays
 * exactly what the all-at-once engine plays, before the swap and after the
 * crossfade, with every JS driver and on WASM (whose reference is the
 * interpreter: it matches it bit for bit). Programs queue: each swaps in at
 * its own boundary, in order. A stop drops the programs still building.
 * Prepared programs cross to the host through structuredClone, as
 * postMessage carries them.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { DriverBuild } from "@/core3/runtime/build/driver-build";
import { Core3Engine, type EngineOptions } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { HostOptions } from "@/core3/runtime/prepare/host-options";
import { prepareForHost } from "@/core3/runtime/prepare/prepare-for-host";
import type { PreparedProgram } from "@/core3/runtime/prepare/prepare-program";
import { LiveHost } from "@/core3/runtime/worklet/live-host";
import type { Program } from "@/core3/types";
import { SeqTables } from "@/core3/wasm/host/seq-tables";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it, vi } from "vitest";
import { GENERATED, INTERPRETER, SR, firstBitDiff } from "./codegen-harness";

const BLOCK = 128;
const FADE = SR / 10;
const WASM: HostOptions = { backend: "wasm" };

const patch = (cutoff: number): Program =>
	evalPatch(`tempo(120)
const s = seq("c3 e3 g3 b3")
s.saw()
  .lpf(${cutoff})
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .delay({ time: 0.15, feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`);

/** A host fed prepared programs the way audio.ts feeds the worklet. */
class Session {
	readonly host = new LiveHost(SR, getRegistry(), (err) => {
		throw err;
	});
	readonly l: number[] = [];
	readonly r: number[] = [];
	running: PreparedProgram | undefined;

	constructor(private readonly options: HostOptions) {}

	/** Prepare against the last program prepared, as audio.ts does. */
	async prepare(program: Program): Promise<PreparedProgram> {
		const registry = withProgramSpecs(getRegistry(), program);
		const prepared = await prepareForHost(program, registry, SR, this.running, this.options);
		this.running = prepared;
		return prepared;
	}

	async play(program: Program): Promise<void> {
		this.post(await this.prepare(program));
	}

	post(prepared: PreparedProgram): void {
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

/** The offline engines over the same samples: `before` for `head`, then `after` continuing it. */
function offline(
	before: Program,
	after: Program,
	head: number,
	tail: number,
	options: EngineOptions,
) {
	const first = new Core3Engine(
		before,
		SR,
		withProgramSpecs(getRegistry(), before),
		undefined,
		options,
	);
	const headL = new Float32Array(head);
	const headR = new Float32Array(head);
	first.renderBlock(headL, headR, 0, head);
	const second = new Core3Engine(
		after,
		SR,
		withProgramSpecs(getRegistry(), after),
		first.collectState(),
		options,
	);
	const tailL = new Float32Array(tail);
	const tailR = new Float32Array(tail);
	second.renderBlock(tailL, tailR, 0, tail);
	return { headL, headR, tailL, tailR };
}

const slice = (xs: readonly number[], from: number, to: number) =>
	Float32Array.from(xs.slice(from, to));

const SWAPS: readonly { label: string; options: HostOptions; reference: EngineOptions }[] = [
	{ label: "interpreter", options: INTERPRETER, reference: INTERPRETER },
	...GENERATED.map(({ label, options }) => ({ label, options, reference: options })),
	{ label: "wasm", options: WASM, reference: INTERPRETER },
];

const BACKENDS: readonly { label: string; options: HostOptions }[] = [
	{ label: "js", options: { codegen: true } },
	{ label: "wasm", options: WASM },
];

describe("LiveHost", () => {
	for (const { label, options, reference } of SWAPS) {
		it(`${label}: a live swap plays what the offline swap plays`, async () => {
			const session = new Session({ ...options, build: { budget: 50, rounds: [1, 4] } });
			await session.play(patch(800));
			const start = session.untilSwap();
			session.blocks(40);
			await session.play(patch(1400));
			const swap = session.untilSwap();
			session.blocks(150);
			const end = session.l.length;
			expect(swap - start).toBeGreaterThan(40 * BLOCK);

			const ref = offline(patch(800), patch(1400), swap - start, end - swap, reference);
			const settled = swap + FADE + BLOCK;
			expect(firstBitDiff(slice(session.l, start, swap), ref.headL), "before: left").toBe(-1);
			expect(firstBitDiff(slice(session.r, start, swap), ref.headR), "before: right").toBe(-1);
			const tail = (xs: Float32Array) => xs.slice(settled - swap);
			expect(firstBitDiff(slice(session.l, settled, end), tail(ref.tailL)), "after: left").toBe(-1);
			expect(firstBitDiff(slice(session.r, settled, end), tail(ref.tailR)), "after: right").toBe(
				-1,
			);
			expect(Math.max(...session.l.slice(settled).map(Math.abs))).toBeGreaterThan(0.01);
		}, 20_000);
	}

	it("tier-up builds phase 2 after the swap and switches to it", async () => {
		const built = vi.spyOn(DriverBuild.prototype, "driver");
		const tierUp = GENERATED.find((g) => g.label === "tier-up")?.options as EngineOptions;
		const session = new Session(tierUp);
		await session.play(patch(800));
		session.untilSwap();
		expect(built).toHaveBeenCalledTimes(1);
		session.blocks(100);
		expect(built).toHaveBeenCalledTimes(2);
		built.mockRestore();
	});

	for (const { label, options } of BACKENDS) {
		it(`${label}: spreads a build over blocks within the budget`, async () => {
			const steps = async (budget: number) => {
				const session = new Session({ ...options, build: { budget, rounds: [1, 4] } });
				await session.play(patch(800));
				return session.untilSwap() / BLOCK;
			};
			expect(await steps(1)).toBeGreaterThan(2 * (await steps(1000)));
		});

		it(`${label}: swaps queued programs in order, each at its own block`, async () => {
			const session = new Session({ ...options, build: { budget: 50, rounds: [1] } });
			await session.play(patch(800));
			await session.play(patch(1400));
			const second = session.untilSwap();
			const firstSound = session.l.findIndex((x) => x !== 0);
			expect(firstSound).toBeGreaterThan(0);
			expect(firstSound).toBeLessThan(second);
		});

		it(`${label}: a stop drops the programs still building`, async () => {
			const session = new Session({ ...options, build: { budget: 50, rounds: [1] } });
			await session.play(patch(800));
			session.blocks(2);
			session.host.stop();
			expect(session.host.pending).toBe(false);
			session.blocks(4);
			expect(session.l.every((x) => x === 0)).toBe(true);
		});
	}

	it("wasm: a swap in cycle 2 finds its tables prefilled (no fill inside render)", async () => {
		const session = new Session(WASM);
		await session.play(patch(800));
		session.untilSwap();
		session.blocks(Math.ceil((4.5 * SR) / BLOCK)); // one cycle is 2 s at 120 bpm
		const next = await session.prepare(patch(1400));
		const fills = vi.spyOn(SeqTables.prototype, "fill"); // the miss path only
		session.post(next);
		session.untilSwap();
		session.blocks(Math.ceil((2 * SR) / BLOCK));
		expect(fills).not.toHaveBeenCalled();
		fills.mockRestore();
	});

	it("wasm: a carry planned from a program that never ran starts fresh", async () => {
		const session = new Session(WASM);
		await session.play(patch(800));
		await session.prepare(patch(1000)); // prepared, never posted (as if its build failed)
		const third = await session.prepare(patch(1400));
		session.untilSwap();
		session.blocks(40);
		session.post(third);
		const swap = session.untilSwap();
		session.blocks(150);
		const end = session.l.length;

		const fresh = new Core3Engine(patch(1400), SR, withProgramSpecs(getRegistry(), patch(1400)));
		const l = new Float32Array(end - swap);
		const r = new Float32Array(end - swap);
		fresh.renderBlock(l, r, 0, end - swap);
		const settled = swap + FADE + BLOCK;
		expect(firstBitDiff(slice(session.l, settled, end), l.slice(settled - swap))).toBe(-1);
	});
});
