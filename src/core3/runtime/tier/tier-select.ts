/**
 * The tier-up selector, a pure state machine stepped once per block: which
 * driver renders this block, and how many samples the shadow runs beside it.
 * Phase 1 renders alone for the first `startAfter` blocks (its own first
 * call is its slowest block). Then the shadow warms phase 2 in slices that
 * ramp up from one sample to `fraction` × the block. Once it has run
 * `warmSamples`, phase 2 renders this block and every block after it.
 */

import type { TierConfig } from "./tier-config";

export interface TierState {
	readonly render: "phase1" | "phase2";
	/** Blocks rendered so far. */
	readonly blocks: number;
	/** Shadow samples run so far. */
	readonly shadowed: number;
}

export interface TierStep {
	readonly render: "phase1" | "phase2";
	/** Shadow samples to run beside this block. */
	readonly shadow: number;
	readonly next: TierState;
}

export const TIER_START: TierState = { render: "phase1", blocks: 0, shadowed: 0 };

export function tierStep(state: TierState, n: number, config: TierConfig): TierStep {
	if (state.render === "phase2") return { render: "phase2", shadow: 0, next: state };
	const blocks = state.blocks + 1;
	if (state.shadowed >= config.warmSamples) {
		return { render: "phase2", shadow: 0, next: { ...state, render: "phase2", blocks } };
	}
	const shadow = shadowSlice(state, n, config);
	return {
		render: "phase1",
		shadow,
		next: { render: "phase1", blocks, shadowed: state.shadowed + shadow },
	};
}

/**
 * None while phase 1 starts. Then a ramp: one sample, doubling each block up
 * to the fraction. The shadow's first calls cost the most per sample (V8's
 * first-run work, then the interpreter), so they get the fewest samples.
 */
function shadowSlice(state: TierState, n: number, config: TierConfig): number {
	const k = state.blocks - config.startAfter;
	if (k < 0) return 0;
	const ramp = 2 ** Math.min(k, 30);
	return Math.min(ramp, Math.ceil(n * config.fraction), config.warmSamples - state.shadowed);
}
