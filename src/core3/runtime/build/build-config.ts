/**
 * How the worklet builds a new engine while the old one plays
 * (engine-build.ts): the estimated cost (step-costs.ts) it spends per block,
 * and the warm rounds of the primary driver's shadow (driver-steps.ts). The
 * defaults are measured; see BUILD_CONFIG.
 */

export interface BuildConfig {
	/** Estimated microseconds of build steps per block. */
	readonly budget: number;
	/** Samples per warm round, each at most BLOCK_MAX. */
	readonly rounds: readonly number[];
}

export const BUILD_CONFIG: BuildConfig = {
	budget: 400,
	rounds: [1, 2, 4, 8, 16, 32, 64, 128],
};
