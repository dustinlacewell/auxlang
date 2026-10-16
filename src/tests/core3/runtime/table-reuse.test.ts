/**
 * A seq whose table key (bridge/table-key.ts) a re-eval leaves unchanged
 * keeps its tables: the WASM prefill copies the old lane's tables and fill
 * state instead of filling (wasm/host/carry/table-carry.ts). Tables are
 * derived data, so a live swap still plays what the offline interpreter
 * swap plays, bit for bit, whether the key is kept (another node edited,
 * with packed or stable voices; the patch seed rerolled under a local seed)
 * or not (the pattern, the local seed, the patch seed or the voices policy
 * edited). A kept key copies tables and no fill looks back, the first fills
 * after the swap included; a changed key copies nothing.
 */

import { CycleQueries } from "@/core3/pattern/table/cycle-queries";
import { LaneFill } from "@/core3/pattern/table/lane-fill";
import type { Program } from "@/core3/types";
import { TableHeap } from "@/core3/wasm/host/table-heap";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SR, firstBitDiff } from "../wasm/differential-harness";
import { BLOCK, FADE, Session, offline, slice } from "./live-session";

interface Seq {
	readonly pattern: string;
	readonly patchSeed: number;
	readonly local?: number;
	readonly voices?: "stable";
	readonly cutoff: number;
	/** A record field `vel`, played as the seq's level. */
	readonly vel?: string;
}

const BASE: Seq = { pattern: "<[c3, e3] _> [e3, g3] b2_d3? [e3 g3]?", patchSeed: 5, cutoff: 70 };

function patch({ pattern, patchSeed, local, voices, cutoff, vel }: Seq): Program {
	const voiced = voices === undefined ? "" : `.voices("${voices}")`;
	const own = local === undefined ? "" : `.seed(${local})`;
	const record = vel === undefined ? "" : `.with({ vel: p\`${vel}\` })`;
	const level = vel === undefined ? "" : "\n  .mul(s.vel)";
	return evalPatch(`tempo(150)
seed(${patchSeed})
const s = seq(p\`${pattern}\`${voiced}${record})${own}
s.tri()
  .lpf(${cutoff}, 0.2)
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))${level}
  .gain(0.3)
  .out()`);
}

const EDITS: readonly { label: string; before: Seq; after: Seq; kept: boolean }[] = [
	{ label: "another node edited", before: BASE, after: { ...BASE, cutoff: 76 }, kept: true },
	{
		label: "another node edited, stable voices",
		before: { ...BASE, voices: "stable" },
		after: { ...BASE, voices: "stable", cutoff: 76 },
		kept: true,
	},
	{
		label: "patch seed rerolled under a local seed",
		before: { ...BASE, local: 3 },
		after: { ...BASE, local: 3, patchSeed: 6 },
		kept: true,
	},
	{
		label: "pattern edited",
		before: BASE,
		after: { ...BASE, pattern: "<[c3, e3] _> [e3, g3] a2_d3? [e3 g3]?" },
		kept: false,
	},
	{
		label: "local seed changed",
		before: { ...BASE, local: 3 },
		after: { ...BASE, local: 4 },
		kept: false,
	},
	{ label: "patch seed rerolled", before: BASE, after: { ...BASE, patchSeed: 6 }, kept: false },
	{
		label: "another node edited, record seq",
		before: { ...BASE, vel: "1 0.4 0.7" },
		after: { ...BASE, vel: "1 0.4 0.7", cutoff: 76 },
		kept: true,
	},
	{
		label: "record field edited",
		before: { ...BASE, vel: "1 0.4 0.7" },
		after: { ...BASE, vel: "1 0.4 0.9" },
		kept: false,
	},
	{
		label: "voices policy changed",
		before: BASE,
		after: { ...BASE, voices: "stable" },
		kept: false,
	},
];

/** Fills that look back for their carry (not the cycle after the last fill), counted from `arm`. */
function countLookBacks() {
	const carryInto = LaneFill.prototype.carryInto;
	const counts = { lookBacks: 0, armed: false };
	vi.spyOn(LaneFill.prototype, "carryInto").mockImplementation(function (this: LaneFill, c) {
		const sequential = (this as unknown as { carryCycle: number }).carryCycle === c;
		if (counts.armed && !sequential) counts.lookBacks++;
		return carryInto.call(this, c);
	});
	return counts;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("table reuse across a swap", () => {
	for (const { label, before, after, kept } of EDITS) {
		it(`${label}: plays what the offline swap plays`, async () => {
			const copies = vi.spyOn(TableHeap.prototype, "copy");
			const fills = countLookBacks();
			const session = new Session();
			await session.play(patch(before));
			const start = session.untilSwap();
			session.blocks(Math.ceil((4 * SR) / BLOCK)); // mid cycle 2 (a cycle is 1.6 s)
			const next = await session.prepare(patch(after));
			fills.armed = true;
			session.post(next);
			const swap = session.untilSwap();
			session.blocks(Math.ceil((3.4 * SR) / BLOCK)); // two crossings after the swap
			fills.armed = false;
			const end = session.l.length;

			const ref = offline(patch(before), patch(after), swap - start, end - swap);
			const settled = swap + FADE + BLOCK;
			const settledDiff = (xs: readonly number[], want: Float32Array) =>
				firstBitDiff(slice(xs, settled, end), want.slice(settled - swap));
			expect(firstBitDiff(slice(session.l, start, swap), ref.headL), "before").toBe(-1);
			expect(settledDiff(session.l, ref.tailL), "after: left").toBe(-1);
			expect(settledDiff(session.r, ref.tailR), "after: right").toBe(-1);
			expect(session.l.slice(settled).some((x) => Math.abs(x) > 0.01)).toBe(true);
			expect(copies.mock.calls.length > 0, "copied").toBe(kept);
			// A stable-voices carry always reads its voice history, never steps on.
			if (kept && after.voices === undefined)
				expect(fills.lookBacks, "fills that look back").toBe(0);
		}, 30_000);
	}

	it("a lane's fill continues another's: the next cycle's fill queries one cycle", () => {
		const pat = patch(BASE).nodes.find((n) => n.module === "seq")?.config.pattern;
		expect(pat).toBeDefined();
		const old = new LaneFill(new CycleQueries());
		old.bind(pat as never, 5, 0);
		old.carryInto(7);
		old.filled(7, old.laneCycle(7));
		old.laneCycle(8); // the dip peek, as fillTable reads it
		const queries = new CycleQueries();
		const events = vi.spyOn(queries, "events");
		const fill = new LaneFill(queries);
		fill.continueFrom(old);
		fill.carryInto(8);
		fill.laneCycle(8);
		fill.laneCycle(9);
		expect(events.mock.calls.map((call) => call[2])).toEqual([9]);
	});
});
