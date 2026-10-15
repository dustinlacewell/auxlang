/**
 * The worklet host (worklet/live-host.ts) against the offline interpreter:
 * a program built a budget at a time and swapped in at a block boundary
 * plays on WASM exactly what the all-at-once interpreter plays, before the
 * swap and after the crossfade. Programs queue: each swaps in at its own
 * boundary, in order. A stop drops the programs still building. Prepared
 * programs cross to the host through structuredClone, as postMessage
 * carries them.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { Program } from "@/core3/types";
import { SeqTables } from "@/core3/wasm/host/seq-tables";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it, vi } from "vitest";
import { SR, firstBitDiff } from "../wasm/differential-harness";
import { BLOCK, FADE, Session, offline, slice } from "./live-session";

const patch = (cutoff: number): Program =>
	evalPatch(`tempo(120)
const s = seq("c3 e3 g3 b3")
s.saw()
  .lpf(${cutoff})
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .delay({ time: 0.15, feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`);

describe("LiveHost", () => {
	it("a live swap plays what the offline swap plays", async () => {
		const session = new Session(50);
		await session.play(patch(800));
		const start = session.untilSwap();
		session.blocks(40);
		await session.play(patch(1400));
		const swap = session.untilSwap();
		session.blocks(150);
		const end = session.l.length;
		expect(swap - start).toBeGreaterThan(40 * BLOCK);

		const ref = offline(patch(800), patch(1400), swap - start, end - swap);
		const settled = swap + FADE + BLOCK;
		expect(firstBitDiff(slice(session.l, start, swap), ref.headL), "before: left").toBe(-1);
		expect(firstBitDiff(slice(session.r, start, swap), ref.headR), "before: right").toBe(-1);
		const tail = (xs: Float32Array) => xs.slice(settled - swap);
		expect(firstBitDiff(slice(session.l, settled, end), tail(ref.tailL)), "after: left").toBe(-1);
		expect(firstBitDiff(slice(session.r, settled, end), tail(ref.tailR)), "after: right").toBe(-1);
		expect(Math.max(...session.l.slice(settled).map(Math.abs))).toBeGreaterThan(0.01);
	}, 20_000);

	it("spreads a build over blocks within the budget", async () => {
		const steps = async (budget: number) => {
			const session = new Session(budget);
			await session.play(patch(800));
			return session.untilSwap() / BLOCK;
		};
		expect(await steps(1)).toBeGreaterThan(2 * (await steps(1000)));
	});

	it("swaps queued programs in order, each at its own block", async () => {
		const session = new Session(50);
		await session.play(patch(800));
		await session.play(patch(1400));
		const second = session.untilSwap();
		const firstSound = session.l.findIndex((x) => x !== 0);
		expect(firstSound).toBeGreaterThan(0);
		expect(firstSound).toBeLessThan(second);
	});

	it("a stop drops the programs still building", async () => {
		const session = new Session(50);
		await session.play(patch(800));
		session.blocks(2);
		session.host.stop();
		expect(session.host.pending).toBe(false);
		session.blocks(4);
		expect(session.l.every((x) => x === 0)).toBe(true);
	});

	it("a swap in cycle 2 finds its tables prefilled (no fill inside render)", async () => {
		const session = new Session();
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

	it("a carry planned from a program that never ran starts fresh", async () => {
		const session = new Session();
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
