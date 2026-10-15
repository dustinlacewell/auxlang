/**
 * How the tier-up driver warms phase 2 (tier-select.ts). The defaults are
 * measured; see TIER_CONFIG.
 */

export interface TierConfig {
	/** Blocks phase 1 renders alone before the shadow starts. */
	readonly startAfter: number;
	/** Shadow samples per real sample, rounded up per block. */
	readonly fraction: number;
	/** Shadow samples after which phase 2 counts as warm and takes over. */
	readonly warmSamples: number;
}

export const TIER_CONFIG: TierConfig = {
	startAfter: 1,
	fraction: 1 / 2,
	warmSamples: 32768,
};
