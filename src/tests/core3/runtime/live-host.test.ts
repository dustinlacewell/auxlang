/**
 * The worklet host (worklet/live-host.ts) against the offline engine: a
 * program built a budget at a time and swapped in at a block boundary plays
 * exactly what the all-at-once engine plays, before the swap and after the
 * crossfade, with every driver. Programs queue: each swaps in at its own
 * boundary, in order. A stop drops the programs still building.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { DriverBuild } from "@/core3/runtime/build/driver-build";
import { Core3Engine, type EngineOptions } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { prepareProgram } from "@/core3/runtime/prepare/prepare-program";
import { LiveHost } from "@/core3/runtime/worklet/live-host";
import type { KeyedIdentity, Program } from "@/core3/types";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it, vi } from "vitest";
import { GENERATED, INTERPRETER, SR, firstBitDiff } from "./codegen-harness";

const BLOCK = 128;
const FADE = SR / 10;

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
	private running: readonly KeyedIdentity[] | undefined;

	constructor(private readonly options: EngineOptions) {}

	play(program: Program): void {
		const registry = withProgramSpecs(getRegistry(), program);
		const prepared = prepareProgram(program, registry, SR, this.running, this.options);
		this.running = prepared.identities;
		this.host.swap(prepared);
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

describe("LiveHost", () => {
	for (const { label, options } of [{ label: "interpreter", options: INTERPRETER }, ...GENERATED]) {
		it(`${label}: a live swap plays what the offline swap plays`, () => {
			const session = new Session({ ...options, build: { budget: 50, rounds: [1, 4] } });
			session.play(patch(800));
			const start = session.untilSwap();
			session.blocks(40);
			session.play(patch(1400));
			const swap = session.untilSwap();
			session.blocks(150);
			const end = session.l.length;
			expect(swap - start).toBeGreaterThan(40 * BLOCK);

			const ref = offline(patch(800), patch(1400), swap - start, end - swap, options);
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

	it("tier-up builds phase 2 after the swap and switches to it", () => {
		const built = vi.spyOn(DriverBuild.prototype, "driver");
		const tierUp = GENERATED.find((g) => g.label === "tier-up")?.options as EngineOptions;
		const session = new Session(tierUp);
		session.play(patch(800));
		session.untilSwap();
		expect(built).toHaveBeenCalledTimes(1);
		session.blocks(100);
		expect(built).toHaveBeenCalledTimes(2);
		built.mockRestore();
	});

	it("spreads a build over blocks within the budget", () => {
		const steps = (budget: number) => {
			const session = new Session({ codegen: true, build: { budget, rounds: [1, 4] } });
			session.play(patch(800));
			return session.untilSwap() / BLOCK;
		};
		expect(steps(1)).toBeGreaterThan(2 * steps(1000));
	});

	it("swaps queued programs in order, each at its own block", () => {
		const session = new Session({ codegen: true, build: { budget: 50, rounds: [1] } });
		session.play(patch(800));
		session.play(patch(1400));
		const second = session.untilSwap();
		const firstSound = session.l.findIndex((x) => x !== 0);
		expect(firstSound).toBeGreaterThan(0);
		expect(firstSound).toBeLessThan(second);
	});

	it("a stop drops the programs still building", () => {
		const session = new Session({ codegen: true, build: { budget: 50, rounds: [1] } });
		session.play(patch(800));
		session.blocks(2);
		session.host.stop();
		expect(session.host.pending).toBe(false);
		session.blocks(4);
		expect(session.l.every((x) => x === 0)).toBe(true);
	});
});
