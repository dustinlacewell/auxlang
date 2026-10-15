/**
 * The tier-up selector as a pure state machine: phase 1 alone at first,
 * then shadow slices that ramp from one sample to the fraction, a total that
 * stops at the warm point, and a switch to phase 2 that is permanent.
 */

import type { TierConfig } from "@/core3/runtime/tier/tier-config";
import { TIER_START, type TierState, tierStep } from "@/core3/runtime/tier/tier-select";
import { describe, expect, it } from "vitest";

const CONFIG: TierConfig = { startAfter: 2, fraction: 1 / 2, warmSamples: 100 };

/** Steps through `sizes`; returns each block's render and shadow, and the final state. */
function steps(sizes: readonly number[], config = CONFIG) {
	let state: TierState = TIER_START;
	const blocks = sizes.map((n) => {
		const step = tierStep(state, n, config);
		state = step.next;
		return `${step.render}+${step.shadow}`;
	});
	return { blocks, state };
}

describe("tierStep", () => {
	it("renders phase 1 with no shadow for the first startAfter blocks", () => {
		expect(steps([128, 128]).blocks).toEqual(["phase1+0", "phase1+0"]);
	});

	it("ramps the shadow from one sample, doubling, up to the fraction of the block", () => {
		const { blocks } = steps([128, 128, 128, 128, 128, 128, 128, 128]);
		expect(blocks.slice(2)).toEqual([
			"phase1+1",
			"phase1+2",
			"phase1+4",
			"phase1+8",
			"phase1+16",
			"phase1+32",
		]);
	});

	it("caps a slice at the fraction of a short block, rounded up", () => {
		const { blocks } = steps([128, 128, 128, 128, 128, 128, 3, 1]);
		expect(blocks.slice(6)).toEqual(["phase1+2", "phase1+1"]);
	});

	it("trims the last slice to the warm point, then switches for good", () => {
		// Slices 1, 2, 4, 8, 16, 32 = 63; the next is 37 (not 64) to reach 100.
		const { blocks, state } = steps(Array(12).fill(128));
		expect(blocks.slice(8)).toEqual(["phase1+37", "phase2+0", "phase2+0", "phase2+0"]);
		expect(state).toEqual({ render: "phase2", blocks: 10, shadowed: 100 });
	});

	it("keeps the phase 2 state as is (no new state per block)", () => {
		const phase2: TierState = { render: "phase2", blocks: 5, shadowed: 100 };
		expect(tierStep(phase2, 128, CONFIG).next).toBe(phase2);
	});

	it("a zero warm point renders phase 2 from the first block", () => {
		const config = { ...CONFIG, warmSamples: 0 };
		expect(steps([128, 128], config).blocks).toEqual(["phase2+0", "phase2+0"]);
	});
});
