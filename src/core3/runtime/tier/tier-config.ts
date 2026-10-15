/**
 * How the tier-up driver builds phase 2 after the swap (tier-driver.ts). The
 * defaults are measured; see TIER_CONFIG.
 */

export interface TierConfig {
	/** Blocks phase 1 renders alone before phase 2's build starts. */
	readonly startAfter: number;
	/** Estimated microseconds of phase-2 build steps per block (build/step-costs.ts). */
	readonly budget: number;
	/** Samples per warm round of phase 2's shadow (build/driver-steps.ts). */
	readonly rounds: readonly number[];
}

export const TIER_CONFIG: TierConfig = {
	startAfter: 1,
	budget: 400,
	rounds: [1, 2, 4, 8, 16, 32, 64, 128, 128, 128, 128, 128, 128, 128, 128, 128],
};
