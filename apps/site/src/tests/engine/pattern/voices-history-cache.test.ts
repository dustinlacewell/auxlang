/**
 * The voices history cache (voices/history.ts) on a synthetic fold whose
 * answer is known in closed form: the checkpoint count stays bounded, thinning
 * keeps every answer exact, and a read replays at most one stride.
 */

import { describe, expect, it } from "vitest";

import type { Ev } from "@/engine/pattern/event";
import { r } from "@/engine/pattern/rational";
import {
	CHECKPOINT_CYCLES,
	type FoldCycle,
	MAX_CHECKPOINTS,
	RECENT_CYCLES,
	createHistory,
	historyCycle,
} from "@/engine/pattern/voices/history";

/** The state counts the cycle numbers folded so far: before cycle c it is c(c-1)/2. */
function countingFold(): { fold: FoldCycle; calls: () => number } {
	let calls = 0;
	const fold: FoldCycle = (state, cycle) => {
		calls++;
		const ev: Ev = { whole: null, part: { begin: r(cycle), end: r(cycle + 1) }, value: state.onsets, kind: "note" };
		return { state: { lanes: [], cut: [], onsets: state.onsets + cycle }, events: [ev] };
	};
	return { fold, calls: () => calls };
}

const before = (c: number): number => (c * (c - 1)) / 2;
const valueAt = (evs: readonly Ev[]): number => (evs[0] as Ev).value;

describe("voices history cache", () => {
	it("stays bounded past MAX_CHECKPOINTS and stays exact after thinning", () => {
		const h = createHistory({ lanes: [], cut: [], onsets: 0 });
		const { fold, calls } = countingFold();
		const far = 2 * MAX_CHECKPOINTS * CHECKPOINT_CYCLES + 5;
		expect(valueAt(historyCycle(h, far, fold))).toBe(before(far));
		expect(h.checkpoints.size).toBeLessThanOrEqual(MAX_CHECKPOINTS);
		expect(h.recent.size).toBeLessThanOrEqual(RECENT_CYCLES);
		expect(h.stride).toBeGreaterThan(CHECKPOINT_CYCLES);

		const start = calls();
		expect(valueAt(historyCycle(h, 12_345, fold))).toBe(before(12_345));
		expect(calls() - start).toBeLessThanOrEqual(h.stride);
	});

	it("playing forward folds one new cycle per read", () => {
		const h = createHistory({ lanes: [], cut: [], onsets: 0 });
		const { fold, calls } = countingFold();
		historyCycle(h, 500, fold);
		const start = calls();
		for (let c = 501; c <= 600; c++) expect(valueAt(historyCycle(h, c, fold))).toBe(before(c));
		expect(calls() - start).toBe(100);
	});
});
