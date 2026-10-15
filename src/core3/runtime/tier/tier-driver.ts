/**
 * The tier-up driver: phase 1 renders from the swap. After `startAfter`
 * blocks, each block also spends the budget on phase 2's build (compile its
 * units, warm them on the shadow twin; build/driver-build.ts). Once the
 * build is done, phase 2 renders from the next block on. Phase 1 and phase 2
 * keep state and value buffers the same way at block boundaries, so the
 * switch is exact.
 */

import type { Driver } from "../driver";
import type { TierConfig } from "./tier-config";

/** Phase 2's build, advanced a budget at a time. */
export interface TierBuild {
	/** Run build steps within `budget`; true when the build is done. */
	advance(budget: number): boolean;
	driver(): Driver;
}

export function tierDriver(phase1: Driver, build: TierBuild, config: TierConfig): Driver {
	let blocks = 0;
	let built = false;
	let phase2: Driver | null = null;
	return (bufs, outL, outR, offset, n, count, sr) => {
		if (phase2 !== null) return phase2(bufs, outL, outR, offset, n, count, sr);
		if (built) {
			phase2 = build.driver();
			return phase2(bufs, outL, outR, offset, n, count, sr);
		}
		phase1(bufs, outL, outR, offset, n, count, sr);
		blocks++;
		if (blocks > config.startAfter) built = build.advance(config.budget);
	};
}
