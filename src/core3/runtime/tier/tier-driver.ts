/**
 * The tier-up driver: a Driver over three drivers of one program. Phase 1
 * renders first; beside each block the shadow (phase 2's twin over a copy of
 * the state, tier/shadow-clone.ts) runs a slice into scratch and is thrown
 * away, warming the functions phase 2 shares with it. The selector
 * (tier-select.ts) says when phase 2 takes over. Phase 1 and phase 2 keep
 * state, value buffers and outs records the same way at block boundaries,
 * so the switch is exact.
 */

import type { Driver, ValueBuffers } from "../driver";
import { shadowCloner } from "./shadow-clone";
import type { TierConfig } from "./tier-config";
import { TIER_START, tierStep } from "./tier-select";

export interface TierDrivers {
	readonly phase1: Driver;
	readonly phase2: Driver;
	/** Phase 2's twin over shadow state; its output is discarded. */
	readonly shadow: Driver;
}

export function tierDriver(drivers: TierDrivers, config: TierConfig): Driver {
	let state = TIER_START;
	let shadow: ShadowRun | null = null;
	return (bufs, outL, outR, offset, n, count, sr) => {
		if (state.render === "phase2") return drivers.phase2(bufs, outL, outR, offset, n, count, sr);
		const step = tierStep(state, n, config);
		state = step.next;
		// First block: copy the buffers before rendering, where the shadow state was copied.
		shadow ??= shadowRun(bufs, count);
		const render = step.render === "phase1" ? drivers.phase1 : drivers.phase2;
		render(bufs, outL, outR, offset, n, count, sr);
		if (step.shadow === 0) return;
		shadow.ensure(step.shadow);
		drivers.shadow(shadow.bufs, shadow.l, shadow.r, 0, step.shadow, shadow.count, sr);
		shadow.count += step.shadow;
	};
}

/** The shadow's own value buffers, sample count and scratch output. */
interface ShadowRun {
	readonly bufs: ValueBuffers;
	count: number;
	l: Float32Array;
	r: Float32Array;
	ensure(n: number): void;
}

function shadowRun(bufs: ValueBuffers, count: number): ShadowRun {
	const run: ShadowRun = {
		bufs: shadowCloner()(bufs) as ValueBuffers,
		count,
		l: new Float32Array(0),
		r: new Float32Array(0),
		ensure(n) {
			if (run.l.length >= n) return;
			run.l = new Float32Array(n);
			run.r = new Float32Array(n);
		},
	};
	return run;
}
